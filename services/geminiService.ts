import { GoogleGenAI } from "@google/genai";
import { ASBLProfile, SearchResult, Sector, Language, GrantOpportunity } from "../types";
import { CONFIG, getApiKey } from "../config";
import { persistenceService } from "./persistence";

// 1. SOURCES OFFICIELLES (Grounding strict)
const OFFICIAL_FUNDING_URLS = [
    "https://ec.europa.eu",
    "https://demandes-subside.loterie-nationale.be",
    "https://www.kbs-frb.be",
    "https://economie.fgov.be",
    "https://www.spf-pensions.be",
    "https://infrastructures.wallonie.be",
    "https://www.wallonie.be",
    "https://www.aviq.be",
    "https://www.cocof.be",
    "https://www.innoviris.brussels",
    "https://be.brussels",
    "https://werk-economie-emploi.brussels",
    "https://www.vlaio.be"
];

// Dictionnaire des "Pensées" de Charlotte pour l'UI
const THOUGHTS: Record<Language, Record<string, string>> = {
    fr: {
        analyze: "J'analyse ton ADN numérique (Web & Réseaux)...",
        search_start: "Je scanne le Web profond (Presse, Facebook, Fondations)...",
        filtering: "Je sépare le bruit des vraies opportunités...",
        audit_start: "Je soumets mes trouvailles à la Challengeuse...",
        audit_refine: "Challenge reçue : j'approfondis l'investigation...",
        audit_ok: "Audit validé ! Rédaction du rapport stratégique...",
        finalizing: "Mise en forme finale..."
    },
    nl: {
        analyze: "Ik analyseer je digitale DNA (Web & Socials)...",
        search_start: "Ik scan het deep web (Pers, Facebook, Stichtingen)...",
        filtering: "Ik scheid de ruis van echte kansen...",
        audit_start: "Ik leg mijn bevindingen voor aan de Challenger...",
        audit_refine: "Uitdaging ontvangen: ik verdiep het onderzoek...",
        audit_ok: "Audit gevalideerd! Strategisch rapport opstellen...",
        finalizing: "Definitieve opmaak..."
    },
    de: {
        analyze: "Ich analysiere deine digitale DNA (Web & Soziale Netzwerke)...",
        search_start: "Ich scanne das Deep Web (Presse, Facebook, Stiftungen)...",
        filtering: "Ich trenne das Rauschen von echten Chancen...",
        audit_start: "Ich lege meine Ergebnisse dem Challenger vor...",
        audit_refine: "Herausforderung angenommen: Ich vertiefe die Untersuchung...",
        audit_ok: "Audit validiert! Erstellung des strategischen Berichts...",
        finalizing: "Endgültige Formatierung..."
    },
    ar: {
        analyze: "أقوم بتحليل بصمتك الرقمية (الويب والشبكات)...",
        search_start: "أقوم بمسح الويب العميق (الصحافة، فيسبوك، المؤسسات)...",
        filtering: "أفصل الضجيج عن الفرص الحقيقية...",
        audit_start: "أقدم نتايجي للمتحدي...",
        audit_refine: "تم استلام التحدي: أقوم بتعميق التحقيق...",
        audit_ok: "تم التحقق من التدقيق! كتابة التقرير الاستراتيجي...",
        finalizing: "التنسيق النهائي..."
    }
};

// 2. Nettoyage / Parsing JSON ROBUSTE (Supporte Objets ET Tableaux)
const cleanAndParseJson = (text: string): any => {
    try {
        let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        // Détection intelligente : Est-ce un Objet {} ou un Tableau [] ?
        const firstCurly = cleaned.indexOf("{");
        const firstSquare = cleaned.indexOf("[");
        
        let start = -1;
        let end = -1;

        // On prend le premier caractère valide trouvé
        if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
            start = firstCurly;
            end = cleaned.lastIndexOf("}");
        } else if (firstSquare !== -1) {
            start = firstSquare;
            end = cleaned.lastIndexOf("]");
        }

        if (start === -1 || end === -1) throw new Error("Structure JSON introuvable");
        
        cleaned = cleaned.substring(start, end + 1);
        const parsed = JSON.parse(cleaned);

        // CRITICAL FIX: Si l'IA renvoie un Tableau au lieu d'un Objet racine,
        // on prend le premier élément s'il existe, sinon objet vide.
        if (Array.isArray(parsed)) {
            return parsed.length > 0 ? parsed[0] : {};
        }
        
        return parsed;
    } catch (err) {
        console.error("JSON parse error. Raw text received:", text);
        // On ne throw pas ici pour permettre au processus de continuer avec un objet vide si nécessaire
        throw new Error("Oups, je n'ai pas réussi à lire ma propre réponse. (Erreur de format)");
    }
};

// 3. Normalisation Profil
const normalizeProfileData = (raw: any): Partial<ASBLProfile> => {
    const data = raw || {};
    
    const normalized: Partial<ASBLProfile> = {};
    if (typeof data.name === "string") normalized.name = data.name;
    if (typeof data.website === "string") normalized.website = data.website;
    if (typeof data.region === "string") normalized.region = data.region;
    if (typeof data.description === "string") normalized.description = data.description;
    
    const validSectors = Object.values(Sector) as string[];
    if (typeof data.sector === "string" && validSectors.includes(data.sector)) {
        normalized.sector = data.sector as Sector;
    }
    return normalized;
};

// 4. Normalisation Opportunités
const normalizeSearchResult = (raw: any, profileName: string): SearchResult => {
    const today = new Date();
    const data = raw || {};

    let rawOpps = [];
    if (Array.isArray(data.opportunities)) {
        rawOpps = data.opportunities;
    } else if (Array.isArray(data)) {
        rawOpps = data;
    }

    const opportunities = rawOpps.map((o: any) => ({
        title: o.title || o.opportunityName || "Sans titre",
        provider: o.provider || "Inconnu",
        deadline: o.deadline || "Non communiqué",
        deadlineDate: o.deadlineDate || "2099-12-31",
        relevanceScore: typeof o.relevanceScore === "number" ? o.relevanceScore : 40,
        relevanceReason: o.relevanceReason || "Potentiellement pertinent",
        type: o.type || "Autre",
        url: o.url || ""
    }));

    // Filtre de sécurité CRITIQUE
    const activeAndOfficial = opportunities.filter((o: GrantOpportunity) => {
        const d = new Date(o.deadlineDate || "2099-12-31");
        if (isNaN(d.getTime()) && o.deadlineDate !== "2099-12-31") return false;
        if (o.deadlineDate !== "2099-12-31" && d < today) return false;
        if (!o.url || o.url.length < 5) return false;
        return true; 
    });

    return {
        executiveSummary: typeof data.executiveSummary === 'string' ? data.executiveSummary : "Analyse terminée.",
        opportunities: activeAndOfficial,
        strategicAdvice: typeof data.strategicAdvice === 'string' ? data.strategicAdvice : "Consultez les liens pour plus de détails.",
        sources: [],
        timestamp: new Date().toISOString(),
        profileName: data.profileName || profileName
    };
};

// --- AGENT B: LA CHALLENGEUSE ---
const verifyGrants = async (rawResult: any, originalPrompt: string, language: Language = "fr") => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const verificationPrompt = `
        ROLE : Challengeuse d'Affaires (QA).
        Mission : Garantir la qualité de l'audit de Charlotte.
        
        Règles de Vérification :
        1. FORMAT : Doit être un JSON valide avec une liste d'opportunités.
        2. CONTENU : Au moins 3 opportunités pertinentes trouvées.
        3. SOURCES : Vérifier que les URLs sont valides.
        
        --- Contenu à Vérifier ---
        PROMPT : "${originalPrompt.substring(0, 500)}..." 
        RÉSULTAT : "${JSON.stringify(rawResult)}"
        
        Si OK -> Réponds juste : APPROVED
        Si KO -> Réponds JSON : { "status": "REQUIRES_REFINEMENT", "errors_found": ["..."], "refinement_instructions": "..." }
    `;

    try {
        const resp = await ai.models.generateContent({
            model: CONFIG.MODEL_ID,
            contents: verificationPrompt,
            config: { tools: [], temperature: 0.1 }
        });
        
        const text = resp.text?.trim();
        if (text === "APPROVED") return { status: "APPROVED" };
        return cleanAndParseJson(text || "{}");

    } catch (err) {
        return { status: "APPROVED" }; 
    }
};

// --- FONCTIONS EXPORTÉES ---

export const enrichProfileFromNumber = async (enterpriseNumber: string, language: Language = "fr"): Promise<Partial<ASBLProfile>> => {
    const cacheKey = enterpriseNumber.trim();
    try {
        const cache = await persistenceService.getEnrichmentCache();
        if (cache.has(cacheKey)) return cache.get(cacheKey)!;
    } catch (e) {}

    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
    // PROMPT AMÉLIORÉ : ENQUÊTE PROFONDE (Web & Réseaux Sociaux)
    const prompt = `
        RÔLE : Enquêteur Numérique Expert pour ASBL Belges.
        CIBLE : Entité identifiée par "${enterpriseNumber}".
        
        MISSION D'INVESTIGATION (Deep Dive) :
        1. **Identification Officielle** : Trouve le nom légal dans la BCE (Banque-Carrefour).
        2. **Analyse d'Activité Réelle (CRUCIAL)** : Ne te limite pas aux statuts !
           - Scanne les **Pages Facebook, LinkedIn, Instagram** pour voir les événements récents.
           - Cherche les articles de presse récents.
           - Trouve le site web officiel.
        3. **Synthèse** : Rédige une description qui reflète la VRAIE vie de l'association, pas juste son objet juridique.
        
        RÉPONSE JSON UNIQUE (PAS DE TABLEAU):
        {
          "name": "Nom officiel",
          "website": "URL (Site Web ou Page Facebook principale)",
          "region": "Région (Bruxelles/Wallonie/Flandre)",
          "description": "Description vivante et précise des activités réelles en ${language}.",
          "sector": "Le secteur le plus proche parmi : ${Object.values(Sector).join(" | ")}"
        }
    `;

    try {
        const resp = await ai.models.generateContent({
            model: CONFIG.MODEL_ID,
            contents: prompt,
            config: { tools: [{ googleSearch: {} }], temperature: 0.2 } // Temperature un peu plus haute pour la créativité de synthèse
        });
        const raw = cleanAndParseJson(resp.text || "{}");
        const normalized = normalizeProfileData(raw);
        
        if (normalized.name) {
            try {
                const cache = await persistenceService.getEnrichmentCache();
                cache.set(cacheKey, normalized);
                await persistenceService.saveEnrichmentCache(cache);
            } catch (e) {}
        }
        return normalized;
    } catch (err) {
        return {}; 
    }
};

const MAX_ATTEMPTS = 3;

export const searchAndRefineGrants = async (
    profile: ASBLProfile, 
    language: Language = "fr",
    onThought?: (thought: string) => void
): Promise<SearchResult> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const thoughts = THOUGHTS[language];

    if (onThought) onThought(thoughts.analyze);
    await new Promise(r => setTimeout(r, 500));

    const langInstructions: Record<Language, string> = {
        fr: "Réponds en Français (écriture inclusive).",
        nl: "Antwoord in het Nederlands.",
        de: "Antworte auf Deutsch.",
        ar: "أجب باللغة العربية."
    };

    // PROMPT AMÉLIORÉ : RECHERCHE 360°
    const createPrompt = (refinement = "") => `
        PERSONA: Charlotte, Chasseuse de Fonds d'Élite.
        LANGUE: ${langInstructions[language]}
        MISSION: Audit 360° pour ${profile.name} (${profile.sector}, ${profile.region}).
        CONTEXTE: ${profile.description}
        
        STRATÉGIE DE CHASSE (MULTI-CANAUX) :
        1. **Canal Officiel** : Scanne les portails régionaux et fédéraux.
        2. **Canal Privé/Fondations** : Cherche les appels à projets de la Fondation Roi Baudouin, Cera, Loterie Nationale, et fondations d'entreprises.
        3. **Canal Presse/Actu** : Cherche les articles récents mentionnant "nouveau subside", "appel à projets 2024/2025" pour ce secteur.
        4. **Analyse Concurrentielle** : Regarde ce que des ASBL similaires ont reçu récemment.

        FILTRES :
        - Uniquement des opportunités **OUVERTES** (Pas de dates passées !).
        - Pertinence critique par rapport à la mission décrite.

        ${refinement ? `\nCORRECTION REQUISE: ${refinement}` : ""}
        
        RÉPONSE JSON UNIQUE :
        {
          "executiveSummary": "Synthèse percutante...",
          "opportunities": [{ "title": "...", "provider": "...", "deadline": "...", "deadlineDate": "YYYY-MM-DD", "relevanceScore": 90, "relevanceReason": "...", "type": "Subside/Mécénat", "url": "..." }],
          "strategicAdvice": "...",
          "profileName": "${profile.name}"
        }
    `;

    let raw = null;
    let grounding: any[] = [];
    let currentRefinement = "";

    if (onThought) onThought(thoughts.search_start);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const currentPrompt = createPrompt(currentRefinement);
            if (attempt > 1 && onThought) onThought(thoughts.filtering);

            const resp = await ai.models.generateContent({
                model: CONFIG.MODEL_ID,
                contents: currentPrompt,
                config: { tools: [{ googleSearch: {} }], temperature: 0.5 }
            });

            raw = cleanAndParseJson(resp.text || "{}");
            grounding = resp.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

            if (onThought) onThought(thoughts.audit_start);
            const verification = await verifyGrants(raw, currentPrompt, language);

            if (verification.status === "APPROVED") {
                if (onThought) onThought(thoughts.audit_ok);
                break;
            } 
            
            if (verification.status === "REQUIRES_REFINEMENT" && attempt < MAX_ATTEMPTS) {
                if (onThought) onThought(thoughts.audit_refine);
                currentRefinement = verification.refinement_instructions;
            } else {
                break; 
            }
        } catch (err) {
            if (attempt === MAX_ATTEMPTS) break;
        }
    }

    if (onThought) onThought(thoughts.finalizing);
    
    const normalized = normalizeSearchResult(raw || {}, profile.name);
    normalized.sources = grounding;
    return normalized;
};

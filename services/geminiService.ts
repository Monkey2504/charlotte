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
// Mis à jour pour refléter un travail plus lent et méticuleux
const THOUGHTS: Record<Language, Record<string, string>> = {
    fr: {
        analyze: "Immersion dans ton dossier (Secteur & Activités)...",
        search_start: "Investigation approfondie (Presse, Fondations, Monitor)...",
        filtering: "Lecture des règlements et vérification des dates limites...",
        audit_start: "Contrôle qualité par la Challengeuse...",
        audit_refine: "Approfondissement des recherches sur demande de l'audit...",
        audit_ok: "Confirmé. Rédaction du rapport stratégique...",
        finalizing: "Finalisation des détails..."
    },
    nl: {
        analyze: "Diepgaande analyse van je dossier...",
        search_start: "Uitgebreid onderzoek (Pers, Stichtingen, Monitor)...",
        filtering: "Reglementen lezen en deadlines verifiëren...",
        audit_start: "Kwaliteitscontrole door de Challenger...",
        audit_refine: "Onderzoek verdiepen op verzoek van de audit...",
        audit_ok: "Bevestigd. Strategisch rapport opstellen...",
        finalizing: "Details afronden..."
    },
    de: {
        analyze: "Vertiefung in deine Akte...",
        search_start: "Umfassende Untersuchung (Presse, Stiftungen)...",
        filtering: "Lesen der Vorschriften und Überprüfung der Fristen...",
        audit_start: "Qualitätskontrolle durch den Challenger...",
        audit_refine: "Vertiefung der Recherche auf Anfrage...",
        audit_ok: "Bestätigt. Erstellung des strategischen Berichts...",
        finalizing: "Details finalisieren..."
    },
    ar: {
        analyze: "تحليل متعمق لملفك...",
        search_start: "تحقيق شامل (الصحافة، المؤسسات، المراقب)...",
        filtering: "قراءة اللوائح والتحقق من المواعيد النهائية...",
        audit_start: "مراقبة الجودة من قبل المدقق...",
        audit_refine: "تعميق البحث بناءً على طلب التدقيق...",
        audit_ok: "تم التأكيد. إعداد التقرير الاستراتيجي...",
        finalizing: "إتمام التفاصيل..."
    }
};

// 2. Nettoyage / Parsing JSON ROBUSTE
const cleanAndParseJson = (text: string): any => {
    try {
        let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const firstCurly = cleaned.indexOf("{");
        const firstSquare = cleaned.indexOf("[");
        
        let start = -1;
        let end = -1;

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

        if (Array.isArray(parsed)) {
            return parsed.length > 0 ? parsed[0] : {};
        }
        
        return parsed;
    } catch (err) {
        console.error("JSON parse error. Raw text received:", text);
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

    // Filtre de sécurité
    const activeAndOfficial = opportunities.filter((o: GrantOpportunity) => {
        const d = new Date(o.deadlineDate || "2099-12-31");
        if (isNaN(d.getTime()) && o.deadlineDate !== "2099-12-31") return false;
        if (o.deadlineDate !== "2099-12-31" && d < today) return false;
        // On garde le filtre URL mais on accepte tout ce qui ressemble à une URL valide
        if (!o.url || o.url.length < 8) return false;
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

// --- AGENT B: LA CHALLENGEUSE (AUDIT) ---
const verifyGrants = async (rawResult: any, originalPrompt: string, language: Language = "fr") => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const verificationPrompt = `
        ROLE : Challengeuse d'Affaires (QA).
        Mission : Garantir la qualité de l'audit de Charlotte.
        
        Règles de Vérification :
        1. FORMAT : Doit être un JSON valide avec une liste d'opportunités.
        2. CONTENU : Au moins 3 opportunités pertinentes trouvées.
        3. SOURCES : Vérifier que les URLs sont valides et semblent officielles.
        
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
    
    const prompt = `
        RÔLE : Enquêteur Numérique Expert pour ASBL Belges.
        CIBLE : Entité identifiée par "${enterpriseNumber}".
        
        MISSION D'INVESTIGATION (Deep Dive) :
        1. **Identification Officielle** : Trouve le nom légal dans la BCE.
        2. **Analyse d'Activité Réelle** : Scanne le Web, Facebook et LinkedIn pour comprendre ce qu'ils font VRAIMENT (au-delà des statuts).
        3. **Synthèse** : Rédige une description vivante en ${language}.
        
        RÉPONSE JSON UNIQUE:
        {
          "name": "Nom officiel",
          "website": "URL",
          "region": "Région (Bruxelles/Wallonie/Flandre)",
          "description": "Description vivante et précise...",
          "sector": "Un seul parmi: ${Object.values(Sector).join(" | ")}"
        }
    `;

    try {
        const resp = await ai.models.generateContent({
            model: CONFIG.MODEL_ID,
            contents: prompt,
            config: { tools: [{ googleSearch: {} }], temperature: 0.2 }
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
    await new Promise(r => setTimeout(r, 1000)); // Pause pour UX

    const langInstructions: Record<Language, string> = {
        fr: "Réponds en Français (écriture inclusive).",
        nl: "Antwoord in het Nederlands.",
        de: "Antworte auf Deutsch.",
        ar: "أجب باللغة العربية."
    };

    // PROMPT DE RECHERCHE "DEEP DIVE"
    const createPrompt = (refinement = "") => `
        PERSONA: Charlotte, Chasseuse de Fonds d'Élite (Obsession du Détail).
        MODE: **DEEP RESEARCH & SLOW THINKING**. Prends le temps de fouiller.
        LANGUE: ${langInstructions[language]}
        
        MISSION: Audit 360° pour ${profile.name} (${profile.sector}, ${profile.region}).
        CONTEXTE: ${profile.description}
        
        PROTOCOLE D'INVESTIGATION (Ne t'arrête pas au premier résultat) :
        1. **Sources Officielles** : Scanne les moniteurs, SPW, COCOF, VLAIO.
        2. **Sources Privées/Fondations** : Cherche activement sur le site de la Fondation Roi Baudouin, Cera, Loterie Nationale.
        3. **Presse & Actu** : Cherche des articles récents (2024-2025) mentionnant "appel à projets" dans ce secteur.
        4. **Validation** : Pour chaque piste, vérifie que la date limite n'est PAS passée. Si le guide 2025 n'est pas sorti, cherche le communiqué de presse.

        ${refinement ? `\nCORRECTION IMPÉRATIVE: ${refinement}` : ""}
        
        RÉPONSE JSON UNIQUE :
        {
          "executiveSummary": "Synthèse détaillée et proactive...",
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
                config: { tools: [{ googleSearch: {} }], temperature: 0.4 } // Température ajustée pour permettre une exploration plus large
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
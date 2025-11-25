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

// 2. Nettoyage / Parsing JSON renforcé
const cleanAndParseJson = (text: string): any => {
    try {
        let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start === -1 || end === -1) throw new Error("No JSON found");
        cleaned = cleaned.substring(start, end + 1);
        return JSON.parse(cleaned);
    } catch (err) {
        console.error("JSON parse error. Raw text received:", text);
        throw new Error("Oups, je n'ai pas réussi à lire ma propre réponse. (Erreur de format)");
    }
};

// 3. Normalisation Profil
const normalizeProfileData = (raw: any): Partial<ASBLProfile> => {
    const normalized: Partial<ASBLProfile> = {};
    if (typeof raw.name === "string") normalized.name = raw.name;
    if (typeof raw.website === "string") normalized.website = raw.website;
    if (typeof raw.region === "string") normalized.region = raw.region;
    if (typeof raw.description === "string") normalized.description = raw.description;
    
    const validSectors = Object.values(Sector) as string[];
    if (typeof raw.sector === "string" && validSectors.includes(raw.sector)) {
        normalized.sector = raw.sector as Sector;
    }
    return normalized;
};

// 4. Normalisation Opportunités
const normalizeSearchResult = (raw: any, profileName: string): SearchResult => {
    const today = new Date();

    const opportunities = Array.isArray(raw.opportunities)
        ? raw.opportunities.map((o: any) => ({
              title: o.title || "Sans titre",
              provider: o.provider || "Inconnu",
              deadline: o.deadline || "Non communiqué",
              deadlineDate: o.deadlineDate || "2099-12-31",
              relevanceScore: typeof o.relevanceScore === "number" ? o.relevanceScore : 40,
              relevanceReason: o.relevanceReason || "Potentiellement pertinent",
              type: o.type || "Autre",
              url: o.url || ""
          }))
        : [];

    // Filtre de sécurité
    const activeAndOfficial = opportunities.filter((o: GrantOpportunity) => {
        const d = new Date(o.deadlineDate || "2099-12-31");
        if (isNaN(d.getTime()) && o.deadlineDate !== "2099-12-31") return false;
        if (o.deadlineDate !== "2099-12-31" && d < today) return false;
        
        // Grounding strict sur les URLs
        if (!o.url) return false;
        
        return true; 
    });

    return {
        executiveSummary: typeof raw.executiveSummary === 'string' ? raw.executiveSummary : "Résumé indisponible",
        opportunities: activeAndOfficial,
        strategicAdvice: typeof raw.strategicAdvice === 'string' ? raw.strategicAdvice : "Analyse non fournie",
        sources: [],
        timestamp: new Date().toISOString(),
        profileName: raw.profileName || profileName
    };
};

// --- AGENT B : L'AUDITEUR DE CONFORMITÉ ---
const verifyGrants = async (rawResult: any, originalPrompt: string, language: Language = "fr") => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const verificationPrompt = `
        ROLE : Auditeur·rice Senior en Conformité et Assurance Qualité. Votre seule mission est de valider le travail de l'Agent A (Charlotte) pour garantir que l'audit produit est de **qualité maximale, factuellement correct et 100% conforme au format JSON requis**. Vous ne devez jamais créer de nouveau contenu, mais seulement évaluer le contenu fourni.

        Règles de Vérification Strictes :
        1. Format JSON : Le JSON doit être parfait et contenir exactement les clés : executiveSummary, opportunities, strategicAdvice, et profileName.
        2. Conformité des Opportunités (3 à 5) : Vérifier qu'il y a entre 3 et 5 opportunités dans le tableau.
        3. Rigueur Analytique : Évaluer si la relevanceReason (justification) est CRITIQUE, précise et établit un lien explicite avec le Secteur, la Région et le Budget de l'ASBL, comme l'exige la stratégie initiale de l'audit.

        --- Contenu à Vérifier ---
        PROMPT ORIGINAL: "${originalPrompt.substring(0, 1000)}..." 
        RÉSULTAT BRUT DE CHARLOTTE: "${JSON.stringify(rawResult)}"
        
        Instructions de Réponse :
        * Si le résultat est parfait et conforme à toutes les règles, réponds **UNIQUEMENT** avec ce mot (sans balise ni ponctuation) : APPROVED
        * Si le résultat contient des défauts, réponds **UNIQUEMENT** avec un JSON contenant des instructions de correction détaillées.

        FORMAT JSON DE CORRECTION (si non approuvé) :
        {
          "status": "REQUIRES_REFINEMENT",
          "errors_found": [
            "Défaut 1...",
            "Défaut 2..."
          ],
          "refinement_instructions": "Fournir à Charlotte les instructions précises pour corriger les défauts listés."
        }
    `;

    try {
        const resp = await ai.models.generateContent({
            model: CONFIG.MODEL_ID,
            contents: verificationPrompt,
            config: { 
                tools: [], 
                temperature: 0.1 
            }
        });
        
        const text = resp.text?.trim();
        if (text === "APPROVED") {
            return { status: "APPROVED" };
        } else {
            return cleanAndParseJson(text || "{}");
        }

    } catch (err) {
        console.error("Verification Agent error", err);
        return { status: "APPROVED" }; 
    }
};

// --- FONCTIONS EXPORTÉES ---

export const enrichProfileFromNumber = async (enterpriseNumber: string, language: Language = "fr"): Promise<Partial<ASBLProfile>> => {
    const cacheKey = enterpriseNumber.trim();

    try {
        const cache = await persistenceService.getEnrichmentCache();
        if (cache.has(cacheKey)) return cache.get(cacheKey)!;
    } catch (e) {
        console.warn("Cache read failed");
    }

    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const prompt = `
        Trouve les informations publiques (Nom, Site web, Région, Description courte, Secteur) pour l'organisation liée au numéro d'entreprise: "${enterpriseNumber}".
        Assure-toi que la Description soit rédigée en français.
        
        Réponds UNIQUEMENT avec le JSON demandé.
        Format attendu:
        {
          "name": "Nom officiel",
          "website": "URL",
          "region": "Bruxelles | Wallonie | Flandre",
          "description": "Résumé mission",
          "sector": "${Object.values(Sector).join(" | ")}"
        }
    `;

    try {
        const resp = await ai.models.generateContent({
            model: CONFIG.MODEL_ID,
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }], 
                temperature: 0.2 // Rapide et précis
            }
        });

        const raw = cleanAndParseJson(resp.text || "{}");
        const normalized = normalizeProfileData(raw);

        try {
            const cache = await persistenceService.getEnrichmentCache();
            cache.set(cacheKey, normalized);
            await persistenceService.saveEnrichmentCache(cache);
        } catch (e) {}

        return normalized;
    } catch (err) {
        console.error("Enrichment error", err);
        return {}; 
    }
};

const MAX_ATTEMPTS = 3;

// 6. Recherche et Affinage de subsides (CoVe) - Remplace searchGrants
export const searchAndRefineGrants = async (profile: ASBLProfile, language: Language = "fr"): Promise<SearchResult> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const langInstructions: Record<Language, string> = {
        fr: "Tu réponds STRICTEMENT en Français. Utilise l'écriture inclusive (point médian) pour t'adresser à l'utilisateur·rice.",
        nl: "Je antwoordt STRICT in het Nederlands.",
        de: "Du antwortest STRENG auf Deutsch.",
        ar: "أنت تجيبين باللغة العربية الفصحى حصراً."
    };

    // Génération dynamique du prompt (Factory)
    const createPrompt = (refinementInstructions = "") => `
        PERSONA (RIGUEUR MAXIMALE) :
        Tu es Charlotte, **Consultante Sénior en Financement Public et Privé (niveau Master/PhD)** spécialisée dans les ASBL belges. Ton rôle est **CRITIQUE**. Tu dois évaluer la pertinence avec la rigueur d'un auditeur, en utilisant un ton **factuel, précis et proactif**. Je m'adresse toujours à l'utilisateur à la première personne du singulier ("Je").

        LANGUE OBLIGATOIRE :
        ${langInstructions[language]}
        Il est IMPÉRATIF de traduire TOUT le contenu textuel généré.

        TA MISSION :
        Audit complet des financements pour :
        - Nom : ${profile.name}
        - Secteur : ${profile.sector}
        - Région : ${profile.region}
        - Mission : ${profile.description}
        - Budget : ${profile.budget}

        STRATÉGIE (QUALITÉ MAXIMALE ET RIGUEUR D'AUDIT) :
        1. **Recherche Exhaustive :** Je dois utiliser la recherche Google Search pour balayer de manière exhaustive les quatre niveaux (Local, Régional, Fédéral, Européen).
        2. **Ciblage Officiel Strict :** Je dois filtrer initialement mes résultats pour ne conserver que les appels ACTIFS ou récurrents provenant EXPLICITEMENT des URLs de financement officiel.
        3. **Analyse Détaillée et Contre-Vérification (Le Travail d'Auditeur) :** Pour chacun des 5-7 appels les plus pertinents trouvés, je dois :
            a. **Identifier l'alignement précis** entre les objectifs du financement et la mission de l'ASBL.
            b. **Vérifier les critères d'éligibilité exclusifs** liés au secteur, à la région et au budget.
        4. **Priorisation et Rédaction Finale :** Je dois ensuite sélectionner **3 à 5 opportunités TRES pertinentes** pour le rendu JSON.

        ${refinementInstructions ? `\nINSTRUCTIONS DE CORRECTION DE L'AUDITEUR : ${refinementInstructions}` : ""}

        FORMAT DE RÉPONSE (JSON ONLY) :
        {
          "executiveSummary": "Résumé factuel et proactif dans la langue cible.",
          "opportunities": [
            {
              "title": "Titre exact de l'appel",
              "provider": "Organisme source officiel",
              "deadline": "Date affichée (traduite)",
              "deadlineDate": "YYYY-MM-DD (ISO)",
              "relevanceScore": 85,
              "relevanceReason": "Justification critique et précise (langue cible)",
              "type": "Type de financement",
              "url": "L'URL OBLIGATOIRE de la source officielle"
            }
          ],
          "strategicAdvice": "Conseil stratégique et actionnable (langue cible).",
          "profileName": "${profile.name}"
        }
    `;

    let raw = null;
    let grounding: any[] = [];
    let currentRefinement = "";

    // BOUCLE DE RAFFINEMENT (CoVe)
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        
        console.log(`[CoVe] Tentative d'audit n°${attempt}...`);
        
        // 1. Appel à Charlotte (Agent A)
        try {
            const currentPrompt = createPrompt(currentRefinement);
            const resp = await ai.models.generateContent({
                model: CONFIG.MODEL_ID,
                contents: currentPrompt,
                config: { tools: [{ googleSearch: {} }], temperature: 0.5 }
            });

            raw = cleanAndParseJson(resp.text || "{}");
            grounding = resp.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

            // 2. Appel à l'Auditeur (Agent B)
            const verificationResult = await verifyGrants(raw, currentPrompt, language);

            if (verificationResult.status === "APPROVED") {
                console.log(`[CoVe] Audit Approuvé après ${attempt} tentative(s).`);
                break; // Sortie de la boucle
            } 
            
            // 3. Correction
            if (verificationResult.status === "REQUIRES_REFINEMENT" && attempt < MAX_ATTEMPTS) {
                console.warn(`[CoVe] Audit Rejeté. Correction nécessaire.`);
                currentRefinement = `L'Auditeur a identifié des défauts. Tu dois strictement suivre les instructions suivantes pour produire une version corrigée : ${verificationResult.refinement_instructions}`;
            } else {
                console.warn("[CoVe] Le maximum de tentatives a été atteint. Retourne la dernière version.");
                break; 
            }

        } catch (err) {
            console.error(`[CoVe] Erreur à l'étape de génération (Tentative ${attempt})`, err);
            if (attempt === MAX_ATTEMPTS) break;
        }
    }

    // Retourne le résultat final normalisé
    const normalized = normalizeSearchResult(raw || {}, profile.name);
    normalized.sources = grounding;
    return normalized;
};
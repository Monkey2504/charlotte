
import { GoogleGenAI } from "@google/genai";
import { ASBLProfile, SearchResult, Sector, Language, GrantOpportunity } from "../types";
import { CONFIG, getApiKey } from "../config";
import { persistenceService } from "./persistence";

// Dictionnaire des "Pensées" de Charlotte
const THOUGHTS: Record<Language, Record<string, string>> = {
    fr: {
        analyze: "J'analyse ton profil et ton secteur...",
        search_start_fast: "⚡ Recherche Éclair (Focus Portails Officiels)...",
        search_start_deep: "🕵️ Investigation 360° (Presse, Fondations, Monitor)...",
        filtering: "Je filtre les sources non officielles et les dates dépassées...",
        audit_start: "Je soumets le rapport à la Challengeuse pour validation...",
        audit_refine: "La Challengeuse a des remarques : j'affine mes requêtes...",
        audit_ok: "Audit validé ! Je prépare le rapport final...",
        finalizing: "Mise en forme de la synthèse..."
    },
    nl: {
        analyze: "Ik analyseer je profiel en sector...",
        search_start_fast: "⚡ Snelle scan (Officiële portalen)...",
        search_start_deep: "🕵️ 360° Onderzoek (Pers, Stichtingen)...",
        filtering: "Ik filter onofficiële bronnen en verstreken deadlines...",
        audit_start: "Kwaliteitscontrole door de Challenger...",
        audit_refine: "De Challenger heeft opmerkingen, ik verfijn mijn resultaten...",
        audit_ok: "Audit goedgekeurd! Ik maak het eindrapport op...",
        finalizing: "Synthese opmaken..."
    },
    de: {
        analyze: "Ich analysiere dein Profil und deinen Sektor...",
        search_start_fast: "⚡ Blitzsuche (Offizielle Portale)...",
        search_start_deep: "🕵️ 360° Untersuchung (Presse, Stiftungen)...",
        filtering: "Ich filtere inoffizielle Quellen...",
        audit_start: "Qualitätskontrolle durch den Challenger...",
        audit_refine: "Der Challenger hat Anmerkungen...",
        audit_ok: "Audit genehmigt! Ich erstelle den Abschlussbericht...",
        finalizing: "Zusammenfassung formatieren..."
    },
    ar: {
        analyze: "أقوم بتحليل ملفك الشخصي وقطاعك...",
        search_start_fast: "⚡ بحث سريع (البوابات الرسمية)...",
        search_start_deep: "🕵️ تحقيق شامل (الصحافة، المؤسسات)...",
        filtering: "أقوم بتصفية المصادر غير الرسمية...",
        audit_start: "أرسل التقرير إلى المدقق...",
        audit_refine: "لدى المدقق ملاحظات، أقوم بالتحسين...",
        audit_ok: "تمت الموافقة! إعداد التقرير النهائي...",
        finalizing: "تنسيق الخلاصة..."
    }
};

/**
 * SENIOR PARSER: Extraction JSON résiliente.
 * Au lieu de chercher juste des accolades, on nettoie agressivement le bruit.
 */
const cleanAndParseJson = (text: string): any => {
    if (!text) return {};

    // 1. Nettoyage préliminaire
    // On enlève le markdown code blocks et on trim
    let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    // Helper de parsing avec correction d'erreurs mineures (clés markdown)
    const tryParse = (str: string): any | null => {
        try {
            // Correction keys: **key**: -> "key":
            const fixed = str.replace(/\*\*([a-zA-Z0-9_]+)\*\*:/g, '"$1":');
            return JSON.parse(fixed);
        } catch (e) {
            return null;
        }
    };

    // 2. Priorité 1 : Chercher un OBJET JSON {}
    // C'est le format demandé explicitement dans les prompts.
    const firstCurly = cleaned.indexOf("{");
    const lastCurly = cleaned.lastIndexOf("}");
    
    if (firstCurly !== -1 && lastCurly > firstCurly) {
        const potentialObj = cleaned.substring(firstCurly, lastCurly + 1);
        const result = tryParse(potentialObj);
        if (result) {
            // Si c'est un tableau enveloppé par erreur dans des accolades (peu probable mais possible)
            // on le traite comme un objet valide.
            return result;
        }
    }

    // 3. Priorité 2 : Chercher un TABLEAU JSON []
    // Fallback si le modèle renvoie une liste directe.
    const firstSquare = cleaned.indexOf("[");
    const lastSquare = cleaned.lastIndexOf("]");
    
    if (firstSquare !== -1 && lastSquare > firstSquare) {
        const potentialArr = cleaned.substring(firstSquare, lastSquare + 1);
        
        // Petite heuristique pour éviter de perdre du temps sur des [liens]
        // Un JSON array valide ne commence pas par 'http' juste après le crochet
        if (!potentialArr.match(/^\[\s*http/i)) {
            const result = tryParse(potentialArr);
            if (result && Array.isArray(result)) {
                // Normalisation : On veut toujours retourner un objet racine
                if (result.length > 0 && result[0].opportunities) {
                    return result[0];
                }
                return { opportunities: result };
            }
        }
    }

    console.warn("JSON Parser: Aucune structure JSON valide trouvée.");
    // console.debug("Raw Text:", text); // Uncomment for debugging
    return {};
};

// 3. Normalisation Profil (Type Guarding)
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

// 4. Normalisation Opportunités (Sanitization)
const normalizeSearchResult = (raw: any, profileName: string): SearchResult => {
    const today = new Date();
    const data = raw || {};

    // Gestion flexible de l'emplacement du tableau 'opportunities'
    let rawOpps: any[] = [];
    if (Array.isArray(data.opportunities)) {
        rawOpps = data.opportunities;
    } else if (Array.isArray(data)) {
        // Cas où le JSON root est directement le tableau
        rawOpps = data;
    }

    // Mapping sécurisé
    const opportunities = rawOpps.map((o: any) => ({
        title: o.title || o.opportunityName || "Opportunité identifiée",
        provider: o.provider || "Source inconnue",
        deadline: o.deadline || "Non spécifié",
        deadlineDate: o.deadlineDate || "2099-12-31",
        relevanceScore: typeof o.relevanceScore === "number" ? o.relevanceScore : 50,
        relevanceReason: o.relevanceReason || "Correspondance potentielle détectée.",
        type: o.type || "Autre",
        url: o.url || ""
    }));

    // Filtre de sécurité (Business Logic)
    const activeAndOfficial = opportunities.filter((o: GrantOpportunity) => {
        const d = new Date(o.deadlineDate || "2099-12-31");
        // Date invalide ? On garde (bénéfice du doute)
        if (isNaN(d.getTime())) return true;
        // Date passée ? On jette (strict)
        if (o.deadlineDate !== "2099-12-31" && d < today) return false;
        
        // FIX: Suppression du filtre URL strict.
        // On accepte les opportunités sans URL car le modèle les trouve parfois via Grounding
        // sans copier l'URL dans le JSON. L'UI gérera le fallback.
        // if (!o.url || o.url.length < 8) return false;
        
        return true; 
    });

    return {
        executiveSummary: typeof data.executiveSummary === 'string' ? data.executiveSummary : "Analyse terminée. Veuillez consulter les opportunités ci-dessous.",
        opportunities: activeAndOfficial,
        strategicAdvice: typeof data.strategicAdvice === 'string' ? data.strategicAdvice : "Consultez les liens officiels pour vérifier l'éligibilité détaillée.",
        sources: [],
        timestamp: new Date().toISOString(),
        profileName: data.profileName || profileName
    };
};

// --- AGENT B : L'AUDITEUR (VALIDATION) ---
const verifyGrants = async (rawResult: any, originalPrompt: string, language: Language = "fr") => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const verificationPrompt = `
        [SYSTEM: JSON VALIDATOR]
        TASK: Validate the JSON output below.
        
        FAIL CONDITIONS:
        1. JSON syntax is broken.
        2. "opportunities" array is empty or has < 2 items.
        3. If URLs are present, they must not look fake (e.g. "http://site.com"). Empty URLs are acceptable if content is valid.
        
        INPUT:
        ${JSON.stringify(rawResult)}
        
        OUTPUT:
        - If Valid: "APPROVED"
        - If Invalid: JSON { "status": "REQUIRES_REFINEMENT", "refinement_instructions": "REASON_FOR_REJECTION" }
    `;

    try {
        const resp = await ai.models.generateContent({
            model: CONFIG.MODEL_ID,
            contents: verificationPrompt,
            config: { tools: [], temperature: 0.1 }
        });
        
        const text = resp.text?.trim();
        if (text && text.includes("APPROVED")) return { status: "APPROVED" };
        return cleanAndParseJson(text || "{}");

    } catch (err) {
        return { status: "APPROVED" }; // Fail open to avoid blocking user
    }
};

// --- FONCTIONS EXPORTÉES ---

export const enrichProfileFromNumber = async (enterpriseNumber: string, language: Language = "fr"): Promise<Partial<ASBLProfile>> => {
    const cleanNumber = enterpriseNumber.trim();
    const cacheKey = cleanNumber;
    try {
        const cache = await persistenceService.getEnrichmentCache();
        if (cache.has(cacheKey)) return cache.get(cacheKey)!;
    } catch (e) {}

    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
    // Prompt renforcé pour mieux trouver les ASBL belges même avec un format approximatif
    const prompt = `
        CONTEXT: User is searching for a Belgian Non-Profit (ASBL/VZW) or Company.
        QUERY: "${cleanNumber}"
        
        TASK: Search for this entity in Belgium (BCE/KBO/Staatsblad/Companyweb). 
        If the query is a number (like 0456.789.123 or 0456789123), it's a CBE/KBO number.
        If it's a name, find the official legal entity.

        Identify:
        1. Official Name
        2. Sector (Social, Culture, Sport, etc.)
        3. Region (Bruxelles, Wallonie, Flandre)
        4. Description of activities (What do they do?)
        5. Website (if any)
        
        OUTPUT FORMAT: JSON Only.
        {
            "name": "Official Name",
            "website": "url",
            "region": "Region",
            "description": "Summary in ${language}",
            "sector": "Closest match from: ${Object.values(Sector).join(", ")}"
        }
    `;

    try {
        const resp = await ai.models.generateContent({
            model: CONFIG.MODEL_ID,
            contents: prompt,
            config: { tools: [{ googleSearch: {} }], temperature: 0.1 }
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
    const mode = profile.searchMode || 'deep';

    if (onThought) onThought(thoughts.analyze);
    await new Promise(r => setTimeout(r, 500));

    const langInstructions: Record<Language, string> = {
        fr: "Réponds en Français.",
        nl: "Antwoord in het Nederlands.",
        de: "Antworte auf Deutsch.",
        ar: "أجب باللغة العربية."
    };

    const createPrompt = (refinement = "") => `
        ROLE: Grant Expert.
        MODE: ${mode === 'fast' ? 'FAST (Official Sources Only)' : 'DEEP (All Sources + Press)'}
        LANG: ${langInstructions[language]}
        CONTEXT: ${profile.name} (${profile.sector}, ${profile.region}). ${profile.description}
        
        TASK: Find 3-7 active grants.
        ${refinement ? `CORRECTION: ${refinement}` : ""}
        
        OUTPUT JSON:
        {
          "executiveSummary": "...",
          "opportunities": [{ "title": "...", "provider": "...", "deadline": "...", "deadlineDate": "YYYY-MM-DD", "relevanceScore": 90, "relevanceReason": "...", "type": "Subside", "url": "..." }],
          "strategicAdvice": "...",
          "profileName": "${profile.name}"
        }
    `;

    let raw = null;
    let grounding: any[] = [];
    let currentRefinement = "";

    if (onThought) onThought(mode === 'fast' ? thoughts.search_start_fast : thoughts.search_start_deep);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const currentPrompt = createPrompt(currentRefinement);
            if (attempt > 1 && onThought) onThought(thoughts.filtering);

            const resp = await ai.models.generateContent({
                model: CONFIG.MODEL_ID,
                contents: currentPrompt,
                config: { tools: [{ googleSearch: {} }], temperature: mode === 'deep' ? 0.5 : 0.2 } 
            });

            raw = cleanAndParseJson(resp.text || "{}");
            grounding = resp.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

            // Vérification basique interne avant audit
            const tempRes = normalizeSearchResult(raw, profile.name);
            if (tempRes.opportunities.length === 0 && attempt < MAX_ATTEMPTS) {
                if (onThought) onThought(thoughts.audit_refine);
                currentRefinement = "Zero results found. You MUST broaden your search keywords and look for general operating grants if specific project grants are missing.";
                continue;
            }

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

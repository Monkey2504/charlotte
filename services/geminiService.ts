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

    try {
        // 1. Enlever les blocs de code Markdown
        let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        
        // 2. Correction des erreurs communes de LLM (clés en Markdown)
        cleaned = cleaned.replace(/\*\*([a-zA-Z0-9_]+)\*\*:/g, '"$1":');
        
        // 3. Extraction chirurgicale du bloc JSON
        // On cherche le premier '[' ou '{'
        const firstSquare = cleaned.indexOf("[");
        const firstCurly = cleaned.indexOf("{");
        
        let startIdx = -1;
        let endIdx = -1;

        // Logique de priorité : on prend le premier qui apparaît
        if (firstSquare !== -1 && (firstCurly === -1 || firstSquare < firstCurly)) {
            startIdx = firstSquare;
            endIdx = cleaned.lastIndexOf("]");
        } else if (firstCurly !== -1) {
            startIdx = firstCurly;
            endIdx = cleaned.lastIndexOf("}");
        }

        if (startIdx === -1 || endIdx === -1) {
            console.warn("JSON Parser: Aucun délimiteur trouvé, retour objet vide.");
            return {};
        }

        const jsonString = cleaned.substring(startIdx, endIdx + 1);
        const parsed = JSON.parse(jsonString);

        // 4. Normalisation de la racine (On veut un Objet, pas un Tableau)
        if (Array.isArray(parsed)) {
            // Si c'est un tableau, on suppose que c'est la liste des opportunités
            // ou une liste d'objets résultats. On prend le premier ou on enveloppe.
            if (parsed.length > 0 && parsed[0].opportunities) {
                return parsed[0];
            }
            // Fallback: on enveloppe dans un objet
            return { opportunities: parsed };
        }
        
        return parsed;
    } catch (err) {
        console.error("CRITICAL JSON PARSE ERROR", err);
        console.debug("Faulty JSON Text:", text);
        // Fail-safe: retour objet vide pour ne pas crasher l'UI
        return {}; 
    }
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
        
        // URL trop courte ou manquante ? On jette (hallucination probable)
        if (!o.url || o.url.length < 8) return false;
        
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
        3. URLs look fake (e.g., "http://site.com").
        
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
    const cacheKey = enterpriseNumber.trim();
    try {
        const cache = await persistenceService.getEnrichmentCache();
        if (cache.has(cacheKey)) return cache.get(cacheKey)!;
    } catch (e) {}

    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
    const prompt = `
        TASK: Extract official data for Belgian Entity "${enterpriseNumber}".
        FORMAT: JSON Only.
        FIELDS: name, website, region (Bruxelles/Wallonie/Flandre), description (in ${language}), sector (choose closest from: ${Object.values(Sector).join(", ")}).
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

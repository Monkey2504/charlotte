import { GoogleGenAI } from "@google/genai";
import { ASBLProfile, SearchResult, Sector, Language } from "../types";
import { CONFIG, getApiKey } from "../config";
import { persistenceService } from "./persistence";

/**
 * Liste des organismes officiels à cibler pour le Grounding (Sources Primaires).
 * Cette liste est injectée dans le prompt pour forcer Gemini à prioriser ces sources.
 */
const OFFICIAL_FUNDING_SOURCES = [
  "Portail 'Funding & Tenders' Commission européenne", 
  "Fonds social européen Wallonie/Bruxelles",
  "Loterie Nationale / Fondation Roi Baudouin", 
  "SPF Intégration Sociale",
  "SPW Wallonie aides",
  "COCOF Bruxelles financement",
  "Innoviris",
  "Aides Wallonie Subventions",
  "Brussels Economy and Employment aides ASBL",
  "VLAIO subisidies non-profit",
].join(', ');

/**
 * Robust JSON extraction.
 * Handles cases where the LLM wraps JSON in Markdown or adds conversational filler.
 */
const cleanAndParseJson = (text: string) => {
  try {
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Locate the outer JSON object boundaries
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    } else {
      throw new Error("No JSON structure found in response");
    }
    
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error. Raw text received:", text);
    throw new Error("Oups, je n'ai pas réussi à lire ma propre réponse. (Erreur de format)");
  }
};

/**
 * DATA SANITIZATION LAYER (SEARCH)
 * Never trust the LLM output blindly. Ensures the structure is safe for the frontend.
 */
const normalizeSearchResult = (raw: any, profileName: string): SearchResult => {
  return {
    executiveSummary: typeof raw.executiveSummary === 'string' ? raw.executiveSummary : "Analyse terminée (Résumé non disponible).",
    opportunities: Array.isArray(raw.opportunities) ? raw.opportunities.map((opp: any) => ({
      title: opp.title || "Opportunité sans titre",
      provider: opp.provider || "Inconnu",
      deadline: opp.deadline || "Voir détails",
      deadlineDate: opp.deadlineDate || "2099-12-31",
      relevanceScore: typeof opp.relevanceScore === 'number' ? opp.relevanceScore : 50,
      relevanceReason: opp.relevanceReason || "Potentiellement intéressant.",
      type: opp.type || "Autre",
      url: opp.url || "" // Assure la présence de l'URL
    })) : [],
    strategicAdvice: typeof raw.strategicAdvice === 'string' ? raw.strategicAdvice : "Consultez les sources pour plus de détails.",
    sources: [], // Sources are injected from Grounding Metadata after this function
    timestamp: new Date().toISOString(),
    profileName: raw.profileName || profileName,
  };
};

/**
 * DATA SANITIZATION LAYER (PROFILE)
 * Ensures profile enrichment doesn't crash the form with partial or wrong types.
 */
const normalizeProfileData = (raw: any): Partial<ASBLProfile> => {
  const normalized: Partial<ASBLProfile> = {};
  
  if (typeof raw.name === 'string') normalized.name = raw.name;
  if (typeof raw.website === 'string') normalized.website = raw.website;
  if (typeof raw.region === 'string') normalized.region = raw.region;
  if (typeof raw.description === 'string') normalized.description = raw.description;
  
  // Validate Sector enum
  const validSectors = Object.values(Sector);
  if (typeof raw.sector === 'string' && validSectors.includes(raw.sector as Sector)) {
    normalized.sector = raw.sector as Sector;
  }

  return normalized;
};

export const searchGrants = async (profile: ASBLProfile, language: Language = 'fr'): Promise<SearchResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  // Translation instructions
  const langInstructions = {
    fr: "Tu réponds STRICTEMENT en Français.",
    nl: "Je antwoordt STRICT in het Nederlands.",
    de: "Du antwortest STRENG auf Deutsch.",
    ar: "أنت تجيبين باللغة العربية الفصحى حصراً."
  };

  const prompt = `
    PERSONA :
    Tu es Charlotte, une experte en financement pour ASBL, amicale, enthousiaste et très compétente.
    Tu t'adresses toujours à l'utilisateur à la première personne du singulier ("Je").
    
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

    STRATÉGIE (RENFORCÉE - PRISE EN COMPTE DES SOURCES OFFICIELLES) :
    1. Scan large (Local -> Européen).
    2. **Sources officielles prioritaires (Impératif) :** Je dois utiliser Google Search pour trouver des appels ACTIFS ou récurrents, en ciblant explicitement les sites web et les documents provenant des organismes suivants : 
       **${OFFICIAL_FUNDING_SOURCES}**
    3. Filtrage strict sur la mission, le budget et la pertinence. **Je ne dois PAS citer de résultats provenant de blogs, de forums, ou de sites d'actualité généralistes.**
    4. Je dois lister 3 à 5 opportunités TRES pertinentes.

    FORMAT DE RÉPONSE (JSON ONLY) :
    {
      "executiveSummary": "Résumé dans la langue cible.",
      "opportunities": [
        {
          "title": "Titre",
          "provider": "Organisme",
          "deadline": "Date affichée (traduite)",
          "deadlineDate": "YYYY-MM-DD (ISO)",
          "relevanceScore": 85,
          "relevanceReason": "Justification (langue cible)",
          "type": "Type",
          "url": "L'URL de la source officielle du financement (si trouvée via Google Search)"
        }
      ],
      "strategicAdvice": "Conseil (langue cible).",
      "profileName": "${profile.name}"
    }
    
    Contraintes :
    - relevanceScore est un entier de 0 à 100.
    - Chaque opportunité DOIT inclure une URL de la source officielle.
  `;

  try {
    const response = await ai.models.generateContent({
      model: CONFIG.MODEL_ID,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.4, 
        // responseMimeType omitted for compatibility (managed by cleanAndParseJson)
      },
    });

    const text = response.text;
    if (!text) throw new Error("Réponse vide de l'IA");

    const parsedRawData = cleanAndParseJson(text);
    const sanitizedResult = normalizeSearchResult(parsedRawData, profile.name);
    
    // Injecting grounding metadata sources
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    sanitizedResult.sources = groundingChunks;

    return sanitizedResult;

  } catch (error) {
    console.error("Gemini Service Critical Failure:", error);
    throw new Error("Erreur technique lors de l'analyse. Veuillez réessayer.");
  }
};

export const enrichProfileFromNumber = async (enterpriseNumber: string, language: Language = 'fr'): Promise<Partial<ASBLProfile>> => {
  const cacheKey = enterpriseNumber.trim().toLowerCase();
  
  try {
    // Attempt to read from persistent cache (Firestore/IndexedDB via persistenceService)
    const cacheMap = await persistenceService.getEnrichmentCache();
    if (cacheMap.has(cacheKey)) {
      return cacheMap.get(cacheKey)!;
    }
  } catch (e) {
    console.warn("Cache read failed, proceeding without cache.");
  }

  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const validSectors = Object.values(Sector).join(', ');

  const prompt = `
    Trouve les infos pour : "${enterpriseNumber}".
    Cherche site web et réseaux sociaux.
    
    Réponds UNIQUEMENT JSON :
    {
      "name": "Nom officiel",
      "website": "URL",
      "region": "Région",
      "description": "Description de la mission en ${language}.",
      "sector": "Choisis EXACTEMENT une valeur de cette liste : ${validSectors}"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: CONFIG.MODEL_ID,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Réponse vide");
    
    const rawResult = cleanAndParseJson(text);
    const sanitizedResult = normalizeProfileData(rawResult);
    
    try {
      // Save to persistent cache
      const cacheMap = await persistenceService.getEnrichmentCache();
      cacheMap.set(cacheKey, sanitizedResult);
      await persistenceService.saveEnrichmentCache(cacheMap);
    } catch (e) {
      console.warn("Cache write failed");
    }

    return sanitizedResult;

  } catch (error) {
    console.error("Enrichment Error:", error);
    throw new Error("Impossible de trouver ces informations.");
  }
};
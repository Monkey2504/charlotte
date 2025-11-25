import { GoogleGenAI } from "@google/genai";
import { ASBLProfile, SearchResult, Sector, Language } from "../types";
import { CONFIG, getApiKey } from "../config";
import { persistenceService } from "./persistence";

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
 * DATA SANITIZATION LAYER
 * Never trust the LLM output blindly. This function ensures the object shape 
 * matches the TypeScript interface exactly, preventing UI crashes.
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
      url: opp.url
    })) : [],
    strategicAdvice: typeof raw.strategicAdvice === 'string' ? raw.strategicAdvice : "Consultez les sources pour plus de détails.",
    sources: [], // Sources are injected from Grounding Metadata, not the JSON body
    timestamp: new Date().toISOString(),
    profileName: raw.profileName || profileName,
  };
};

export const searchGrants = async (profile: ASBLProfile, language: Language = 'fr'): Promise<SearchResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  // Translation instructions for the persona
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

    STRATÉGIE :
    1. Scan large (Local -> Européen).
    2. Sources officielles prioritaires.
    3. Filtrage strict sur la mission.

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
          "type": "Type"
        }
      ],
      "strategicAdvice": "Conseil (langue cible).",
      "profileName": "${profile.name}"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: CONFIG.MODEL_ID,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.4, 
        // Note: responseMimeType omitted intentionally for Google Search compatibility
      },
    });

    const text = response.text;
    if (!text) throw new Error("Réponse vide de l'IA");

    const parsedRawData = cleanAndParseJson(text);
    
    // Sanitize data before returning
    const sanitizedResult = normalizeSearchResult(parsedRawData, profile.name);

    // Inject Grounding Metadata safely
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    sanitizedResult.sources = groundingChunks;

    return sanitizedResult;

  } catch (error) {
    console.error("Gemini Service Critical Failure:", error);
    // Rethrow with a user-friendly message, but keep the log for admins
    throw new Error("Erreur technique lors de l'analyse. Veuillez réessayer.");
  }
};

export const enrichProfileFromNumber = async (enterpriseNumber: string, language: Language = 'fr'): Promise<Partial<ASBLProfile>> => {
  const cacheKey = enterpriseNumber.trim().toLowerCase();
  
  try {
    const cacheMap = await persistenceService.getEnrichmentCache();
    if (cacheMap.has(cacheKey)) {
      return cacheMap.get(cacheKey)!;
    }
  } catch (e) {
    console.warn("Cache read failed, proceeding without cache.");
  }

  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Trouve les infos pour : "${enterpriseNumber}".
    Cherche site web et réseaux sociaux.
    
    Réponds UNIQUEMENT JSON :
    {
      "name": "Nom officiel",
      "website": "URL",
      "region": "Région",
      "description": "Description de la mission en ${language}.",
      "sector": "Un des secteurs de la liste fournie."
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
    
    const result = cleanAndParseJson(text);
    
    // Attempt to save to cache, but don't block if it fails
    try {
      const cacheMap = await persistenceService.getEnrichmentCache();
      cacheMap.set(cacheKey, result);
      await persistenceService.saveEnrichmentCache(cacheMap);
    } catch (e) {
      console.warn("Cache write failed");
    }

    return result;

  } catch (error) {
    console.error("Enrichment Error:", error);
    throw new Error("Impossible de trouver ces informations.");
  }
};
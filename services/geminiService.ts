import { GoogleGenAI } from "@google/genai";
import { ASBLProfile, SearchResult, Sector, Language } from "../types";
import { CONFIG, getApiKey } from "../config";
import { persistenceService } from "./persistence";

const cleanAndParseJson = (text: string) => {
  try {
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    } else {
      throw new Error("Aucune structure JSON trouvée");
    }
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error on text:", text);
    throw new Error("Oups, je n'ai pas réussi à lire ma propre réponse. Peux-tu réessayer ?");
  }
};

export const searchGrants = async (profile: ASBLProfile, language: Language = 'fr'): Promise<SearchResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  // Translation instructions for the persona
  const langInstructions = {
    fr: "Tu réponds en Français.",
    nl: "Je antwoordt in het Nederlands. (Tu réponds en Néerlandais).",
    de: "Du antwortest auf Deutsch. (Tu réponds en Allemand).",
    ar: "أنت تجيب باللغة العربية. (Tu réponds en Arabe)."
  };

  const prompt = `
    PERSONA :
    Tu es Charlotte, une experte en financement pour ASBL, amicale, enthousiaste et très compétente.
    Tu t'adresses toujours à l'utilisateur à la première personne du singulier ("Je" / "Ik" / "Ich" / "أنا").
    Tu tutoies l'utilisateur avec bienveillance.
    
    LANGUE OBLIGATOIRE :
    ${langInstructions[language]}
    Il est impératif de traduire TOUT le contenu généré (champs JSON) dans cette langue, tout en gardant le ton amical.

    TA MISSION POUR CE DOSSIER :
    Je dois réaliser un audit complet des opportunités de financement pour l'association suivante :
    - Nom : ${profile.name}
    - Secteur : ${profile.sector}
    - Région : ${profile.region}
    - Mission : ${profile.description}
    - Budget : ${profile.budget}

    MA STRATÉGIE DE RECHERCHE :
    1. **Je cherche partout :** Local, Régional, Fédéral, Européen.
    2. **Je vérifie la fiabilité :** Sources officielles prioritaires.
    3. **Je filtre intelligemment.**
    4. **Je vérifie les dates.**

    FORMAT DE MA RÉPONSE (JSON uniquement) :
    Réponds UNIQUEMENT avec un objet JSON valide :
    {
      "executiveSummary": "Résumé sympa des trouvailles dans la langue cible.",
      "opportunities": [
        {
          "title": "Titre du financement",
          "provider": "Organisme",
          "deadline": "Date affichée (traduite)",
          "deadlineDate": "YYYY-MM-DD (ISO Fixe, ne pas traduire)",
          "relevanceScore": 85,
          "relevanceReason": "Pourquoi c'est pertinent (Expliqué dans la langue cible)",
          "type": "Subvention/Appel à projets/..."
        }
      ],
      "strategicAdvice": "Conseil stratégique dans la langue cible.",
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
      },
    });

    const text = response.text;
    if (!text) throw new Error("Je suis restée sans voix...");

    const parsedData = cleanAndParseJson(text);
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return {
      executiveSummary: parsedData.executiveSummary || "Analyse terminée.",
      opportunities: parsedData.opportunities || [],
      strategicAdvice: parsedData.strategicAdvice || "Voir liens.",
      sources: groundingChunks,
      timestamp: new Date().toISOString(),
      profileName: parsedData.profileName || profile.name,
    };

  } catch (error) {
    console.error("Gemini Service Error:", error);
    throw new Error("Erreur technique / Technische fout / Technical error / خطأ فني");
  }
};

export const enrichProfileFromNumber = async (enterpriseNumber: string, language: Language = 'fr'): Promise<Partial<ASBLProfile>> => {
  const cacheKey = enterpriseNumber.trim().toLowerCase();
  const cacheMap = await persistenceService.getEnrichmentCache();
  
  if (cacheMap.has(cacheKey)) {
    return cacheMap.get(cacheKey)!;
  }

  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Trouve les infos pour le numéro/nom : "${enterpriseNumber}".
    Cherche site web et réseaux sociaux.
    
    Réponds UNIQUEMENT JSON :
    {
      "name": "Nom officiel",
      "website": "URL",
      "region": "Région",
      "description": "Description de la mission en ${language} (Français/Néerlandais/Allemand/Arabe selon code).",
      "sector": "Le secteur le plus proche parmi la liste fournie (Traduire si nécessaire)."
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
    cacheMap.set(cacheKey, result);
    await persistenceService.saveEnrichmentCache(cacheMap);

    return result;

  } catch (error) {
    console.error("Enrichment Error:", error);
    throw new Error("Introuvable / Niet gevonden");
  }
};
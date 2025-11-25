
import { GoogleGenAI } from "@google/genai";
import { ASBLProfile, SearchResult, Sector } from "../types";
import { CONFIG, getApiKey } from "../config";

// --- CACHE SYSTEM ---
// Stockage en mémoire des résultats d'enrichissement pour éviter les surcoûts
const enrichmentCache = new Map<string, Partial<ASBLProfile>>();

/**
 * Helper to clean and parse JSON from Markdown-wrapped text
 */
const cleanAndParseJson = (text: string) => {
  try {
    // 1. Nettoyage des balises Markdown (```json ... ```)
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // 2. Extraction chirurgicale du JSON (du premier '{' au dernier '}')
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    } else {
      // Si pas d'accolades, c'est probablement pas du JSON
      throw new Error("Aucune structure JSON trouvée");
    }
    
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error on text:", text);
    throw new Error("Oups, je n'ai pas réussi à lire ma propre réponse. Peux-tu réessayer ?");
  }
};

/**
 * Orchestrates the grant search using Gemini.
 */
export const searchGrants = async (profile: ASBLProfile): Promise<SearchResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    PERSONA :
    Tu es Charlotte, une experte en financement pour ASBL, amicale, enthousiaste et très compétente.
    Tu t'adresses toujours à l'utilisateur à la première personne du singulier ("Je").
    Tu tutoies l'utilisateur avec bienveillance, comme une collègue proche qui veut vraiment aider.

    TA MISSION POUR CE DOSSIER :
    Je dois réaliser un audit complet des opportunités de financement pour l'association suivante :
    - Nom : ${profile.name}
    - Secteur : ${profile.sector}
    - Région : ${profile.region}
    - Mission : ${profile.description}
    - Budget : ${profile.budget}

    MA STRATÉGIE DE RECHERCHE (Instructions cachées) :
    1. **Je cherche partout :** Je ne m'arrête pas au premier résultat. Je scanne les niveaux **Local (Commune/Province), Régional, Fédéral et Européen**.
    2. **Je vérifie la fiabilité :** Je privilégie les sources officielles (Fondations, Ministères, SPW, COCOF, etc.).
    3. **Je filtre intelligemment :** Je ne retiens que ce qui correspond vraiment à la mission et au budget décrits.
    4. **Je vérifie les dates :** J'utilise Google Search pour m'assurer que les appels sont ACTIFS ou récurrents.

    FORMAT DE MA RÉPONSE (JSON uniquement) :
    Réponds UNIQUEMENT avec un objet JSON valide selon cette structure :
    {
      "executiveSummary": "Un petit paragraphe sympa où JE (Charlotte) résume mes trouvailles. Ex: 'J'ai fouillé partout et j'ai trouvé des pépites pour ton projet de...'",
      "opportunities": [
        {
          "title": "Titre du financement",
          "provider": "Qui donne l'argent ?",
          "deadline": "Texte affiché (ex: '30 Octobre' ou 'En continu')",
          "deadlineDate": "Format ISO AAAA-MM-JJ pour le tri (ex: '2024-10-30'). Si c'est 'En continu' ou inconnu, mets '2099-12-31'.",
          "relevanceScore": 85,
          "relevanceReason": "Pourquoi JE pense que c'est fait pour toi (Je t'explique mon choix personnellement).",
          "type": "Subvention" | "Appel à projets" | "Mécénat" | "Autre"
        }
      ],
      "strategicAdvice": "Mon meilleur conseil d'amie pour que tu décroches ces fonds (Ex: 'N'oublie pas de mettre en avant...')",
      "profileName": "${profile.name}"
    }
    
    Contraintes :
    - relevanceScore est un entier de 0 à 100.
    - Liste au moins 3 à 5 opportunités pertinentes.
  `;

  try {
    const response = await ai.models.generateContent({
      model: CONFIG.MODEL_ID,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.4,
        // CRITICAL FIX: Force text/plain to avoid "Invalid Argument" error with Google Search tool
        responseMimeType: 'text/plain', 
      },
    });

    const text = response.text;
    if (!text) throw new Error("Je suis restée sans voix...");

    const parsedData = cleanAndParseJson(text);
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return {
      executiveSummary: parsedData.executiveSummary || "J'ai terminé mon analyse !",
      opportunities: parsedData.opportunities || [],
      strategicAdvice: parsedData.strategicAdvice || "Regarde les liens pour plus de détails.",
      sources: groundingChunks,
      timestamp: new Date().toISOString(),
      profileName: parsedData.profileName || profile.name,
    };

  } catch (error) {
    console.error("Gemini Service Error:", error);
    throw new Error("J'ai eu un petit souci technique pendant mes recherches. On réessaie ensemble ?");
  }
};

/**
 * Enriches profile data from enterprise number.
 */
export const enrichProfileFromNumber = async (enterpriseNumber: string): Promise<Partial<ASBLProfile>> => {
  // 1. Check Cache first to save costs
  const cacheKey = enterpriseNumber.trim().toLowerCase();
  if (enrichmentCache.has(cacheKey)) {
    console.log("Enrichment data retrieved from cache for:", cacheKey);
    return enrichmentCache.get(cacheKey)!;
  }

  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Tu es Charlotte. Une utilisatrice te donne un numéro d'entreprise ou un nom : "${enterpriseNumber}".
    Ton but : Trouver les infos pour pré-remplir son dossier et lui faire gagner du temps.
    Cherche le site web officiel et les réseaux sociaux.

    FORMAT DE RÉPONSE :
    Réponds UNIQUEMENT avec un objet JSON valide.
    Structure :
    {
      "name": "Nom officiel",
      "website": "URL du site web",
      "region": "Région du siège",
      "description": "Une description fluide de leur mission telle que JE la comprends (à la 3ème personne ici pour le formulaire).",
      "sector": "Le secteur le plus proche parmi : ${Object.values(Sector).join(', ')}"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: CONFIG.MODEL_ID,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
        // CRITICAL FIX: Force text/plain here too
        responseMimeType: 'text/plain',
      },
    });

    const text = response.text;
    if (!text) throw new Error("Réponse vide");
    
    const result = cleanAndParseJson(text);

    // 2. Save to Cache
    enrichmentCache.set(cacheKey, result);

    return result;

  } catch (error) {
    console.error("Enrichment Error:", error);
    throw new Error("Je n'ai rien trouvé avec ce numéro, désolée !");
  }
};

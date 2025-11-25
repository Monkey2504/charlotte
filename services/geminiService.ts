import { GoogleGenAI } from "@google/genai";
import { ASBLProfile, SearchResult, Sector, Language } from "../types";
import { CONFIG, getApiKey } from "../config";
import { persistenceService } from "./persistence";

/**
 * Liste des organismes officiels à cibler pour le Grounding (Sources Primaires).
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
 */
const cleanAndParseJson = (text: string) => {
  try {
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
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
 * Filtre strict des dates dépassées.
 */
const normalizeSearchResult = (raw: any, profileName: string): SearchResult => {
  // Date du jour au format YYYY-MM-DD pour comparaison
  const today = new Date().toISOString().split('T')[0];

  const opportunities = Array.isArray(raw.opportunities) ? raw.opportunities.map((opp: any) => ({
    title: opp.title || "Opportunité sans titre",
    provider: opp.provider || "Inconnu",
    deadline: opp.deadline || "Voir détails",
    deadlineDate: opp.deadlineDate || "2099-12-31",
    relevanceScore: typeof opp.relevanceScore === 'number' ? opp.relevanceScore : 50,
    relevanceReason: opp.relevanceReason || "Potentiellement intéressant.",
    type: opp.type || "Autre",
    url: opp.url || ""
  })) : [];

  // FILTRAGE STRICT : On retire les opportunités dont la date est passée
  // On garde celles qui sont "2099-12-31" (En continu / Inconnu)
  const activeOpportunities = opportunities.filter((opp: any) => {
    if (opp.deadlineDate === "2099-12-31") return true;
    return opp.deadlineDate >= today;
  });

  return {
    executiveSummary: typeof raw.executiveSummary === 'string' ? raw.executiveSummary : "Analyse terminée (Résumé non disponible).",
    opportunities: activeOpportunities,
    strategicAdvice: typeof raw.strategicAdvice === 'string' ? raw.strategicAdvice : "Consultez les sources pour plus de détails.",
    sources: [],
    timestamp: new Date().toISOString(),
    profileName: raw.profileName || profileName,
  };
};

/**
 * DATA SANITIZATION LAYER (PROFILE)
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
    fr: "Tu réponds STRICTEMENT en Français. Utilise l'écriture inclusive (point médian) pour t'adresser à l'utilisateur·rice (ex: prêt·e, sûr·e).",
    nl: "Je antwoordt STRICT in het Nederlands.",
    de: "Du antwortest STRENG auf Deutsch.",
    ar: "أنت تجيبين باللغة العربية الفصحى حصراً."
  };

  // Date actuelle en clair pour le prompt
  const todayFull = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const prompt = `
    PERSONA (RIGUEUR MAXIMALE) :
    Tu es Charlotte, **Consultante Sénior en Financement Public et Privé (niveau Master/PhD)** spécialisée dans les ASBL belges. Ton rôle est **CRITIQUE**. Tu dois évaluer la pertinence avec la rigueur d'un auditeur, en utilisant un ton **factuel, précis et proactif**. Je m'adresse toujours à l'utilisateur à la première personne du singulier ("Je").

    CONTEXTE TEMPOREL CRITIQUE :
    NOUS SOMMES LE : **${todayFull}**.
    Toute opportunité dont la date limite est antérieure à cette date est PÉRIMÉE et doit être rejetée.

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

    STRATÉGIE (MÉTHODOLOGIE ET FOCALISATION MAXIMALE) :
    1. **Phase de Pré-Analyse (Pensée Chaînée) :** Je dois, en interne, identifier les 5 mots-clés les plus précis (excluant le nom de l'ASBL) basés sur la Mission, le Secteur, la Région et le Budget. Cette étape est cruciale pour une recherche efficace.
    2. **Recherche Séquentielle (Diligence Maximale) :** Je dois exécuter ma recherche Google Search en respectant la séquence d'analyse des niveaux : **1er Local/Communal** > **2ème Régional** (${profile.region}) > **3ème Fédéral (Belgique)** > **4ème Européen**. Je dois m'assurer d'avoir au moins une opportunité par niveau avant de passer au suivant si possible.
    3. **Technique de Recherche Ciblée :** Pour maximiser le "Grounding" et la qualité, je dois générer des requêtes de recherche qui utilisent la syntaxe \`site:\` pour cibler directement les organismes officiels et les domaines pertinents. Exemple : \`site:ORGANISME.be "appel à projet" ${profile.sector}\`.
    4. **Grounding Fort & Sources Obligatoires :** Je dois uniquement me baser sur les appels ACTIFS ou récurrents trouvés en ciblant EXPLICITEMENT les sources suivantes : 
       **${OFFICIAL_FUNDING_SOURCES}**
    5. **Exclusion Stricte des Dates :** Je rejette FORMELLEMENT toute opportunité dont la date limite est passée par rapport au ${todayFull}. Si une opportunité est "En continu", elle est acceptée.
    6. **Filtrage et Résultat Final :** Le montant de la subvention doit être proportionnel au budget. Je dois lister **3 à 5 opportunités TRES pertinentes** qui sont clairement alignées avec tous les critères du profil.

    FORMAT DE RÉPONSE (JSON ONLY) :
    {
      "executiveSummary": "Résumé factuel et proactif dans la langue cible.",
      "opportunities": [
        {
          "title": "Titre exact de l'appel",
          "provider": "Organisme source officiel",
          "deadline": "Date affichée (traduite)",
          "deadlineDate": "YYYY-MM-DD (ISO). SI EN CONTINU/INCONNU : METTRE '2099-12-31'.",
          "relevanceScore": 85,
          "relevanceReason": "Justification. Je dois relier EXPLICITEMENT le secteur, la région, la mission et le niveau budgétaire de l'ASBL aux critères d'éligibilité. (langue cible)",
          "type": "Type de financement (Ex: Subvention, Appel à projet, Prix)",
          "url": "L'URL OBLIGATOIRE de la source officielle (Doit pointer vers le site de l'organisme financeur)"
        }
      ],
      "strategicAdvice": "Conseil stratégique et actionnable (langue cible).",
      "profileName": "${profile.name}"
    }
    
    Contraintes :
    - relevanceScore est un entier de 0 à 100.
    - Chaque opportunité DOIT inclure une URL de la source officielle. Si l'URL n'est pas trouvée sur un site officiel, l'opportunité est écartée.
    - La réponse finale doit être UNIQUEMENT le bloc JSON.
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
    if (!text) throw new Error("Réponse vide de l'IA");

    const parsedRawData = cleanAndParseJson(text);
    const sanitizedResult = normalizeSearchResult(parsedRawData, profile.name);
    
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

  // OPTIMISATION VITESSE : Prompt simplifié axé sur la recherche Web standard (Site Officiel / RS)
  // Plutôt que de forcer la BCE (complexe à scraper), on cherche la présence numérique de l'ASBL.
  const prompt = `
    ACTION RAPIDE : Trouve les informations publiques pour l'organisation : "${enterpriseNumber}".
    
    Stratégie :
    1. Si c'est un numéro d'entreprise (BE 0...), cherche le nom associé.
    2. Cherche en priorité le Site Web Officiel ou la page Facebook/LinkedIn de l'organisation.
    3. Extrais la mission depuis la section "À propos".
    
    Format de réponse JSON STRICT (Sans texte superflu) :
    {
      "name": "Nom de l'organisation",
      "website": "URL trouvée (ou vide)",
      "region": "Région (Bruxelles, Wallonie, Flandre)",
      "description": "Résumé de 2 phrases sur leurs activités (en ${language})",
      "sector": "La valeur la plus proche de cette liste : ${validSectors}"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: CONFIG.MODEL_ID,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1, // Très bas pour la rapidité et la cohérence
      },
    });

    const text = response.text;
    if (!text) throw new Error("Réponse vide");
    
    const rawResult = cleanAndParseJson(text);
    const sanitizedResult = normalizeProfileData(rawResult);
    
    try {
      const cacheMap = await persistenceService.getEnrichmentCache();
      cacheMap.set(cacheKey, sanitizedResult);
      await persistenceService.saveEnrichmentCache(cacheMap);
    } catch (e) {
      console.warn("Cache write failed");
    }

    return sanitizedResult;

  } catch (error) {
    console.error("Enrichment Error:", error);
    throw new Error("Impossible de trouver ces informations. Vérifiez le numéro ou remplissez manuellement.");
  }
};
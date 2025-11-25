import { GoogleGenAI } from "@google/genai";
import { ASBLProfile, SearchResult, Sector, Language } from "../types";
import { CONFIG, getApiKey } from "../config";
import { persistenceService } from "./persistence";

/**
 * URLs officielles de financement public (Grounding strict)
 * Niveau européen, fédéral et régional (Wallonie, Bruxelles, Flandre)
 */
const OFFICIAL_FUNDING_URLS = [
  // Européen
  "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home",
  "https://ec.europa.eu/info/funding-tenders/find-funding/eu-funding-programmes_fr",
  "https://culture.ec.europa.eu/creative-europe",
  "https://european-social-fund-plus.ec.europa.eu/fr",
  "https://research-and-innovation.ec.europa.eu/funding/funding-opportunities/funding-programmes-and-open-calls_fr",
  // Fédéral Belgique
  "https://demandes-subside.loterie-nationale.be/fr",
  "https://www.kbs-frb.be/fr",
  "https://www.spf-socialsecurity.be",
  "https://economie.fgov.be/fr/themes/entreprises/subventions",
  // Wallonie
  "https://infrastructures.wallonie.be/demandes/3100_demander-la-subvention-pour-un-projet-pilote-en-economie-sociale.html",
  "https://www.wallonie.be/fr/demarches/demander-la-subvention-pour-une-entreprise-deconomie-sociale-dans-le-secteur-immobilier",
  // Bruxelles
  "https://www.cocof.be/fr",
  "https://www.innoviris.brussels",
  // Flandre
  "https://www.vlaio.be/nl/subsidies-financiering"
];

/**
 * Nettoyage et parsing JSON robuste
 */
const cleanAndParseJson = (text: string) => {
  try {
    let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) throw new Error("No JSON found");
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("JSON parse error:", text);
    throw new Error("Impossible de parser la réponse de l'IA");
  }
};

/**
 * Normalisation du profil ASBL
 */
const normalizeProfileData = (raw: any): Partial<ASBLProfile> => {
  const normalized: Partial<ASBLProfile> = {};
  if (typeof raw.name === "string") normalized.name = raw.name;
  if (typeof raw.website === "string") normalized.website = raw.website;
  if (typeof raw.region === "string") normalized.region = raw.region;
  if (typeof raw.description === "string") normalized.description = raw.description;
  if (typeof raw.sector === "string" && Object.values(Sector).includes(raw.sector as Sector)) {
    normalized.sector = raw.sector as Sector;
  }
  return normalized;
};

/**
 * Normalisation des opportunités
 * Filtrage strict des dates et validation URLs officielles
 */
const normalizeSearchResult = (raw: any, profileName: string): SearchResult => {
  const today = new Date();
  const opportunities = Array.isArray(raw.opportunities)
    ? raw.opportunities.map((opp: any) => ({
        title: opp.title || "Opportunité sans titre",
        provider: opp.provider || "Inconnu",
        deadline: opp.deadline || "Voir détails",
        deadlineDate: opp.deadlineDate || "2099-12-31",
        relevanceScore: typeof opp.relevanceScore === "number" ? opp.relevanceScore : 50,
        relevanceReason: opp.relevanceReason || "Potentiellement intéressant.",
        type: opp.type || "Autre",
        url: opp.url || "",
      }))
    : [];

  const activeOpportunities = opportunities.filter((opp) => {
    // Valide la date
    const deadline = new Date(opp.deadlineDate);
    if (isNaN(deadline.getTime())) return false;
    if (opp.deadlineDate === "2099-12-31") return true;
    if (deadline < today) return false;
    // Valide l'URL
    return OFFICIAL_FUNDING_URLS.some((url) => opp.url.includes(url));
  });

  return {
    executiveSummary: typeof raw.executiveSummary === "string" ? raw.executiveSummary : "Résumé non disponible",
    opportunities: activeOpportunities,
    strategicAdvice: typeof raw.strategicAdvice === "string" ? raw.strategicAdvice : "Consultez les sources pour plus de détails",
    sources: [],
    timestamp: new Date().toISOString(),
    profileName: raw.profileName || profileName,
  };
};

/**
 * Enrichissement du profil à partir du numéro BCE
 */
export const enrichProfileFromNumber = async (enterpriseNumber: string, language: Language = "fr"): Promise<Partial<ASBLProfile>> => {
  const cacheKey = enterpriseNumber.trim().toLowerCase();
  try {
    const cacheMap = await persistenceService.getEnrichmentCache();
    if (cacheMap.has(cacheKey)) return cacheMap.get(cacheKey)!;
  } catch (e) {
    console.warn("Cache read failed");
  }

  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    ROLE: Analyste des entreprises belges.
    TACHE: Identifier l'ASBL ou entreprise correspondant au numéro "${enterpriseNumber}".
    FORMAT JSON STRICT: {
      "name": "Nom officiel",
      "website": "URL officielle",
      "region": "Bruxelles, Wallonie ou Flandre",
      "description": "Description",
      "sector": "Une valeur parmi ${Object.values(Sector).join(", ")}"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: CONFIG.MODEL_ID,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0.1 },
    });
    const raw = cleanAndParseJson(response.text);
    const normalized = normalizeProfileData(raw);
    try {
      const cacheMap = await persistenceService.getEnrichmentCache();
      cacheMap.set(cacheKey, normalized);
      await persistenceService.saveEnrichmentCache(cacheMap);
    } catch {}
    return normalized;
  } catch (err) {
    console.error("Enrichment error:", err);
    return {};
  }
};

/**
 * Recherche des financements
 */
export const searchGrants = async (profile: ASBLProfile, language: Language = "fr"): Promise<SearchResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Tu es Charlotte, consultante sénior en financement public belge.
    Langue: ${language}
    Mission: Identifier 3-5 opportunités de financement actives pour l'ASBL:
    - Nom: ${profile.name}
    - Région: ${profile.region}
    - Secteur: ${profile.sector}
    - Description: ${profile.description}
    Seules les sources officielles suivantes sont autorisées : ${OFFICIAL_FUNDING_URLS.join(", ")}
    Retourne uniquement un JSON avec les clés: executiveSummary, opportunities, strategicAdvice, profileName
  `;

  try {
    const response = await ai.models.generateContent({
      model: CONFIG.MODEL_ID,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0.4 },
    });

    const raw = cleanAndParseJson(response.text);
    const sanitized = normalizeSearchResult(raw, profile.name);

    // Stocker les groundingChunks si disponibles
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    sanitized.sources = groundingChunks;

    return sanitized;
  } catch (err) {
    console.error("SearchGrants error:", err);
    return normalizeSearchResult({}, profile.name);
  }
};

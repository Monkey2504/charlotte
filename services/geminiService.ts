// Réécriture complète et renforcée du module Gemini pour recherches de subsides
// Version améliorée : grounding strict, structure renforcée, sécurité JSON, robustesse AI.

import { GoogleGenAI } from "@google/genai";
import { ASBLProfile, SearchResult, Sector, Language } from "../types";
import { CONFIG, getApiKey } from "../config";
import { persistenceService } from "./persistence";

// 1. SOURCES OFFICIELLES (Grounding strict)
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
  "https://economie.fgov.be/fr/themes/entreprises/subventions",
  // Wallonie
  "https://infrastructures.wallonie.be",
  "https://www.wallonie.be/fr/demarches",
  "https://www.aviq.be",
  // Bruxelles
  "https://www.cocof.be/fr",
  "https://www.innoviris.brussels",
  "https://be.brussels",
  // Flandre
  "https://www.vlaio.be/nl/subsidies-financiering"
];

// 2. Nettoyage / Parsing JSON renforcé
const cleanAndParseJson = (text) => {
  try {
    let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON found");
    cleaned = cleaned.substring(start, end + 1);
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("JSON parse error:", text);
    throw new Error("Impossible de parser la réponse de l'IA");
  }
};

// 3. Normalisation Profil
const normalizeProfileData = (raw) => {
  const normalized = {};
  if (typeof raw.name === "string") normalized.name = raw.name;
  if (typeof raw.website === "string") normalized.website = raw.website;
  if (typeof raw.region === "string") normalized.region = raw.region;
  if (typeof raw.description === "string") normalized.description = raw.description;
  if (typeof raw.sector === "string" && Object.values(Sector).includes(raw.sector)) {
    normalized.sector = raw.sector;
  }
  return normalized;
};

// 4. Normalisation Opportunités + Filtrage strict
const normalizeSearchResult = (raw, profileName) => {
  const today = new Date();

  const opportunities = Array.isArray(raw.opportunities)
    ? raw.opportunities.map((o) => ({
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

  const active = opportunities.filter((o) => {
    const d = new Date(o.deadlineDate);
    if (isNaN(d.getTime())) return false;
    if (o.deadlineDate !== "2099-12-31" && d < today) return false;
    return OFFICIAL_FUNDING_URLS.some((base) => o.url.startsWith(base));
  });

  return {
    executiveSummary: raw.executiveSummary || "Résumé indisponible",
    opportunities: active,
    strategicAdvice: raw.strategicAdvice || "Analyse non fournie",
    sources: [],
    timestamp: new Date().toISOString(),
    profileName: raw.profileName || profileName
  };
};

// 5. Enrichissement par numéro BCE
export const enrichProfileFromNumber = async (enterpriseNumber, language = "fr") => {
  const cacheKey = enterpriseNumber.trim();

  try {
    const cache = await persistenceService.getEnrichmentCache();
    if (cache.has(cacheKey)) return cache.get(cacheKey);
  } catch {}

  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const prompt = `ROLE: Analyste officiel des entreprises belges.
TÂCHE: Identifier l'organisation liée au numéro: "${enterpriseNumber}".
FORMAT JSON STRICT:
{
  "name": "Nom officiel",
  "website": "URL officielle",
  "region": "Bruxelles | Wallonie | Flandre",
  "description": "Résumé clair",
  "sector": "${Object.values(Sector).join(" | ")}"
}`;

  try {
    const resp = await ai.models.generateContent({
      model: CONFIG.MODEL_ID,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0.05 }
    });

    const raw = cleanAndParseJson(resp.text);
    const normalized = normalizeProfileData(raw);

    try {
      const cache = await persistenceService.getEnrichmentCache();
      cache.set(cacheKey, normalized);
      await persistenceService.saveEnrichmentCache(cache);
    } catch {}

    return normalized;
  } catch (err) {
    console.error("Enrichment error", err);
    return {};
  }
};

// 6. Recherche de subsides
export const searchGrants = async (profile, language = "fr") => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const prompt = `Tu es Charlotte, experte en financement public belge.
Mission: Trouver 3 à 5 opportunités de financement ACTIVES correspondant à:
- Nom: ${profile.name}
- Région: ${profile.region}
- Secteur: ${profile.sector}
- Description: ${profile.description}
OBLIGATION: N'utiliser EXCLUSIVEMENT les sources officielles suivantes:
${OFFICIAL_FUNDING_URLS.join(", ")}
Tu renvoies UNIQUEMENT un JSON STRICT contenant:
{
  "executiveSummary": "...",
  "opportunities": [ ... ],
  "strategicAdvice": "...",
  "profileName": "${profile.name}"
}`;

  try {
    const resp = await ai.models.generateContent({
      model: CONFIG.MODEL_ID,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0.2 }
    });

    const raw = cleanAndParseJson(resp.text);
    const normalized = normalizeSearchResult(raw, profile.name);

    const grounding = resp.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    normalized.sources = grounding;

    return normalized;
  } catch (err) {
    console.error("SearchGrants error", err);
    return normalizeSearchResult({}, profile.name);
  }
};
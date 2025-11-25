// Réécriture complète et renforcée du module Gemini pour recherches de subsides
// Version finale : Grounding strict, stratégie séquentielle, sécurité JSON renforcée, enrichissement rapide.

import { GoogleGenAI } from "@google/genai";
import { ASBLProfile, SearchResult, Sector, Language } from "../types";
import { CONFIG, getApiKey } from "../config";
import { persistenceService } from "./persistence";

// 1. SOURCES OFFICIELLES (Grounding strict)
// Liste des URLs de base pour forcer la vérification et le filtrage.
const OFFICIAL_FUNDING_URLS = [
    // Européen
    "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home",
    "https://ec.europa.eu/info/funding-tenders/find-funding/eu-funding-programmes_fr",
    "https://culture.ec.europa.eu/creative-europe",
    "https://european-social-fund-plus.ec.europa.eu/fr",
    "https://research-and-innovation.ec.europa.eu/funding/funding-opportunities/funding-programmes-and-open-calls_fr",
    // Fédéral Belgique
    "https://demandes-subside.loterie-nationale.be/fr",
    "https://www.kbs-frb.be/fr", // Fondation Roi Baudouin
    "https://economie.fgov.be/fr/themes/entreprises/subventions",
    "https://www.spf-pensions.be/", // SPF Intégration Sociale ou similaire
    // Wallonie
    "https://infrastructures.wallonie.be",
    "https://www.wallonie.be/fr/demarches",
    "https://www.aviq.be",
    // Bruxelles
    "https://www.cocof.be/fr",
    "https://www.innoviris.brussels",
    "https://be.brussels",
    "https://werk-economie-emploi.brussels/fr/aides-pme-asbl",
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
        console.error("JSON parse error. Raw text received:", text);
        throw new Error("Oups, je n'ai pas réussi à lire ma propre réponse. (Erreur de format)");
    }
};

// 3. Normalisation Profil (utilisé par enrichProfileFromNumber)
const normalizeProfileData = (raw) => {
    const normalized = {};
    if (typeof raw.name === "string") normalized.name = raw.name;
    if (typeof raw.website === "string") normalized.website = raw.website;
    if (typeof raw.region === "string") normalized.region = raw.region;
    if (typeof raw.description === "string") normalized.description = raw.description;
    const validSectors = Object.values(Sector);
    if (typeof raw.sector === "string" && validSectors.includes(raw.sector as Sector)) {
        normalized.sector = raw.sector as Sector;
    }
    return normalized;
};

// 4. Normalisation Opportunités + Filtrage strict (utilisé par searchGrants)
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

    // Filtre de sécurité CRITIQUE : Seules les opportunités Actives ET Officielles sont conservées.
    const activeAndOfficial = opportunities.filter((o) => {
        // Filtre 1: Date d'échéance (écarte les dates passées)
        const d = new Date(o.deadlineDate);
        // Si la date est non valide ET n'est pas la date par défaut, on rejette.
        if (isNaN(d.getTime()) && o.deadlineDate !== "2099-12-31") return false;
        // Si la date est passée (et n'est pas la date par défaut 2099), on rejette.
        if (o.deadlineDate !== "2099-12-31" && d < today) return false;
        
        // Filtre 2: Grounding (l'URL doit correspondre à une source officielle)
        return OFFICIAL_FUNDING_URLS.some((base) => o.url.startsWith(base));
    });

    return {
        executiveSummary: raw.executiveSummary || "Résumé indisponible",
        opportunities: activeAndOfficial,
        strategicAdvice: raw.strategicAdvice || "Analyse non fournie",
        sources: [],
        timestamp: new Date().toISOString(),
        profileName: raw.profileName || profileName
    };
};

// --- FONCTIONS EXPORTÉES ---

/**
 * 5. Enrichissement rapide et précis du profil par numéro BCE
 */
export const enrichProfileFromNumber = async (enterpriseNumber, language = "fr") => {
    const cacheKey = enterpriseNumber.trim();

    try {
        const cache = await persistenceService.getEnrichmentCache();
        if (cache.has(cacheKey)) return cache.get(cacheKey);
    } catch (e) {
        console.warn("Cache read failed, proceeding without cache.");
    }

    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    // Prompt simple pour une exécution rapide de l'outil de recherche
    const prompt = `
        Trouve les informations publiques (Nom, Site web, Région, Description courte, Secteur) pour l'organisation liée au numéro d'entreprise: "${enterpriseNumber}".
        Assure-toi que la Description soit rédigée en français.
        
        Réponds UNIQUEMENT avec le JSON demandé.
        
        FORMAT JSON STRICT:
        {
          "name": "Nom officiel",
          "website": "URL officielle ou vide si non trouvée",
          "region": "Bruxelles | Wallonie | Flandre | Autre",
          "description": "Résumé clair de la mission de l'ASBL en français.",
          "sector": "${Object.values(Sector).join(" | ")}"
        }
    `;

    try {
        const resp = await ai.models.generateContent({
            model: CONFIG.MODEL_ID,
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }], 
                temperature: 0.2 // Température ajustée pour rapidité et précision factuelle
            }
        });

        const raw = cleanAndParseJson(resp.text);
        const normalized = normalizeProfileData(raw);

        try {
            const cache = await persistenceService.getEnrichmentCache();
            cache.set(cacheKey, normalized);
            await persistenceService.saveEnrichmentCache(cache);
        } catch (e) {
            console.warn("Cache write failed");
        }

        return normalized;
    } catch (err) {
        console.error("Enrichment error", err);
        // Retourne un objet vide pour éviter un crash du frontend
        return {}; 
    }
};

/**
 * 6. Recherche de subsides (Stratégie maximisée)
 */
export const searchGrants = async (profile, language = "fr") => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const langInstructions = {
        fr: "Tu réponds STRICTEMENT en Français. Utilise l'écriture inclusive (point médian) pour t'adresser à l'utilisateur·rice (ex: prêt·e, sûr·e).",
        nl: "Je antwoordt STRICT in het Nederlands.",
        de: "Du antwortest STRENG auf Deutsch.",
        ar: "أنت تجيبين باللغة العربية الفصحى حصراً."
    };

    const prompt = `
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

        STRATÉGIE (MÉTHODOLOGIE ET FOCALISATION MAXIMALE) :
        1. **Phase de Pré-Analyse (Pensée Chaînée) :** Je dois, en interne, identifier les mots-clés de recherche précis basés sur la Mission, le Secteur, la Région et le Budget.
        2. **Recherche Séquentielle (Diligence Maximale) :** Je dois exécuter ma recherche Google Search en respectant la séquence d'analyse des niveaux : **1er Local/Communal** > **2ème Régional** (${profile.region}) > **3ème Fédéral (Belgique)** > **4ème Européen**. 
        3. **Technique de Recherche Ciblée :** Pour maximiser la qualité, je dois générer des requêtes de recherche qui utilisent la syntaxe \`site:\` pour cibler les domaines officiels.
        4. **Grounding Fort & Sources Obligatoires :** Je dois uniquement me baser sur les appels ACTIFS ou récurrents trouvés en ciblant EXPLICITEMENT les sources liées à ces URLs : 
        ${OFFICIAL_FUNDING_URLS.join(", ")}
        5. **Exclusion Stricte :** Je dois systématiquement rejeter les sources non-officielles (blogs, forums, agrégateurs généralistes) et les opportunités ayant une date limite **dépassée**.
        6. **Filtrage et Résultat Final :** Le montant de la subvention doit être proportionnel au budget. Je dois lister **3 à 5 opportunités TRES pertinentes** qui sont clairement alignées avec tous les critères du profil.

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
        const resp = await ai.models.generateContent({
            model: CONFIG.MODEL_ID,
            contents: prompt,
            config: { tools: [{ googleSearch: {} }], temperature: 0.4 }
        });

        const raw = cleanAndParseJson(resp.text);
        const normalized = normalizeSearchResult(raw, profile.name);

        const grounding = resp.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        normalized.sources = grounding;

        return normalized;
    } catch (err) {
        console.error("SearchGrants error", err);
        // Retourne un SearchResult vide mais propre pour éviter un crash
        return normalizeSearchResult({}, profile.name); 
    }
};
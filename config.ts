
// Fonction utilitaire pour récupérer les variables d'environnement de manière sécurisée
// Fonctionne à la fois sur Vite (import.meta.env) et Node/Webpack (process.env)
const getEnvVar = (key: string): string => {
  // 1. Essayer Vite (Standard moderne pour Netlify/Vercel)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  
  // 2. Essayer Node.js / Webpack (Standard ancien) - Avec vérification de sécurité
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {
    // Ignorer l'erreur si process n'est pas défini (navigateur strict)
  }
  return "";
};

export const CONFIG = {
  // On cherche d'abord VITE_API_KEY (convention Vite), sinon API_KEY
  API_KEY: getEnvVar("VITE_API_KEY") || getEnvVar("API_KEY") || "",
  
  // Modèles
  MODEL_ID: "gemini-2.5-flash",
  
  // Paramètres
  TIMEOUT_MS: 30000,
  MAX_HISTORY_ITEMS: 50,
};

export const getApiKey = (): string => {
  if (!CONFIG.API_KEY || CONFIG.API_KEY.trim() === "") {
    // On log l'erreur mais on ne throw pas immédiatement pour ne pas crasher l'init de l'app
    console.warn("Clé API manquante. Veuillez configurer VITE_API_KEY dans Netlify.");
    return "";
  }
  return CONFIG.API_KEY;
};


// Fonction utilitaire pour récupérer les variables d'environnement de manière sécurisée
// Fonctionne à la fois sur Vite (import.meta.env) et Node/Webpack (process.env)
const getEnv = () => {
  const envs: any = {};

  // 1. Essayer Vite (Standard moderne)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      Object.assign(envs, import.meta.env);
    }
  } catch (e) {}

  // 2. Essayer Node.js / Webpack (Standard ancien)
  try {
    if (typeof process !== 'undefined' && process.env) {
      Object.assign(envs, process.env);
    }
  } catch (e) {}
  
  return envs;
};

const ENV = getEnv();

export const CONFIG = {
  // On cherche d'abord VITE_API_KEY, puis API_KEY, puis d'autres formats courants
  API_KEY: ENV.VITE_API_KEY || ENV.API_KEY || ENV.REACT_APP_API_KEY || ENV.NEXT_PUBLIC_API_KEY || "",
  
  // Modèles
  MODEL_ID: "gemini-2.5-flash",
  
  // Paramètres
  // Augmentation à 5 minutes (300s) pour la "Deep Research" sans coupure
  TIMEOUT_MS: 300000, 
  MAX_HISTORY_ITEMS: 50,
};

export const getApiKey = (): string => {
  if (!CONFIG.API_KEY || CONFIG.API_KEY.trim() === "") {
    console.warn("Clé API manquante. Veuillez configurer VITE_API_KEY dans Netlify.");
    return "";
  }
  return CONFIG.API_KEY;
};

export const hasApiKey = (): boolean => {
  return !!CONFIG.API_KEY && CONFIG.API_KEY.trim().length > 0;
};

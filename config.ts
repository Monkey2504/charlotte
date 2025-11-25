
export const CONFIG = {
  // En production, cela viendrait de process.env via Vite/Webpack
  API_KEY: process.env.API_KEY || "",
  
  // Modèles
  MODEL_ID: "gemini-2.5-flash",
  
  // Paramètres
  TIMEOUT_MS: 30000,
  MAX_HISTORY_ITEMS: 50,
};

export const getApiKey = (): string => {
  if (!CONFIG.API_KEY) {
    console.error("API Key is missing in environment variables");
    throw new Error("Configuration critique manquante : API Key introuvable.");
  }
  return CONFIG.API_KEY;
};

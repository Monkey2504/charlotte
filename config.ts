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
  if (!CONFIG.API_KEY || CONFIG.API_KEY.trim() === "") {
    console.error("CRITICAL: API Key is missing in environment variables");
    // Provide a clear error for the developer/user in the console
    throw new Error("Configuration système invalide : Clé API manquante.");
  }
  return CONFIG.API_KEY;
};
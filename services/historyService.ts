
// --- UTILITAIRE ---
// Ce fichier ne sert plus qu'à fournir un générateur d'ID unique.
// L'ancien système de logging admin a été supprimé.

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const historyService = {
  // No-op functions kept temporarily if any dead code still calls them, to prevent crashes.
  // In a clean build, these should be removed entirely.
  logSearch: async () => {},
};

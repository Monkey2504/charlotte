
import { ASBLProfile, HistoryItem, AdminLog } from '../types';

/**
 * Service de Persistance (Repository Pattern)
 * Abstraction de la couche de données pour permettre une migration facile
 * de LocalStorage vers Firestore/Supabase sans toucher au reste de l'app.
 */

const STORAGE_KEYS = {
  HISTORY: 'charlotte_search_history',
  PROFILE_DRAFT: 'charlotte_current_profile_draft',
  ADMIN_LOGS: 'charlotte_admin_logs',
  ENRICHMENT_CACHE: 'charlotte_enrichment_cache'
};

export const persistenceService = {
  // --- HISTORY ---
  async getHistory(): Promise<HistoryItem[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Persistence Read Error (History)", e);
      return [];
    }
  },

  async saveHistory(items: HistoryItem[]): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(items));
    } catch (e) {
      console.error("Persistence Write Error (History)", e);
    }
  },

  // --- PROFILE DRAFT ---
  async getProfileDraft(): Promise<Partial<ASBLProfile> | null> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROFILE_DRAFT);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  },

  async saveProfileDraft(profile: Partial<ASBLProfile>): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE_DRAFT, JSON.stringify(profile));
    } catch (e) {
      console.error("Persistence Write Error (Profile)", e);
    }
  },

  // --- ADMIN LOGS ---
  async getAdminLogs(): Promise<AdminLog[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ADMIN_LOGS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  async saveAdminLogs(logs: AdminLog[]): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.ADMIN_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error("Persistence Write Error (AdminLogs)", e);
    }
  },

  // --- ENRICHMENT CACHE ---
  // Convertit la Map en Objet pour le stockage JSON
  async getEnrichmentCache(): Promise<Map<string, Partial<ASBLProfile>>> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ENRICHMENT_CACHE);
      if (!stored) return new Map();
      const obj = JSON.parse(stored);
      return new Map(Object.entries(obj));
    } catch (e) {
      return new Map();
    }
  },

  async saveEnrichmentCache(cache: Map<string, Partial<ASBLProfile>>): Promise<void> {
    try {
      const obj = Object.fromEntries(cache);
      localStorage.setItem(STORAGE_KEYS.ENRICHMENT_CACHE, JSON.stringify(obj));
    } catch (e) {
      console.error("Persistence Write Error (Cache)", e);
    }
  }
};

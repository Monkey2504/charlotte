
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HistoryItem, SearchResult, ASBLProfile, Sector } from '../types';
import { historyService, generateUUID } from '../services/historyService';

interface AppContextType {
  history: HistoryItem[];
  addToHistory: (result: SearchResult) => void;
  clearHistory: () => void;
  isAdmin: boolean;
  enableAdmin: () => void;
  currentProfile: ASBLProfile;
  updateCurrentProfile: (updates: Partial<ASBLProfile>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const HISTORY_STORAGE_KEY = 'charlotte_search_history';
const PROFILE_STORAGE_KEY = 'charlotte_current_profile_draft';

const DEFAULT_PROFILE: ASBLProfile = {
  enterpriseNumber: '',
  name: '',
  website: '',
  sector: Sector.SOCIAL,
  region: 'Belgique (Fédéral)',
  description: '',
  budget: '< 50k€'
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<ASBLProfile>(DEFAULT_PROFILE);

  // Load history and profile draft from localStorage on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }

      const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (storedProfile) {
        setCurrentProfile({ ...DEFAULT_PROFILE, ...JSON.parse(storedProfile) });
      }
    } catch (e) {
      console.error("Failed to load local storage data", e);
    }
  }, []);

  const addToHistory = (result: SearchResult) => {
    // 1. Add to user visible history
    const newItem: HistoryItem = {
      ...result,
      id: generateUUID(),
    };
    
    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 50); // Limit to 50 items
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // 2. Log to admin storage
    historyService.logSearch(result);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  };

  const updateCurrentProfile = (updates: Partial<ASBLProfile>) => {
    setCurrentProfile(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const enableAdmin = () => setIsAdmin(true);

  return (
    <AppContext.Provider value={{ 
      history, 
      addToHistory, 
      clearHistory, 
      isAdmin, 
      enableAdmin,
      currentProfile,
      updateCurrentProfile
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

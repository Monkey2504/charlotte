import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HistoryItem, SearchResult, ASBLProfile, Sector } from '../types';
import { historyService, generateUUID } from '../services/historyService';
import { persistenceService } from '../services/persistence';

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

  // Load data from persistence service on mount
  useEffect(() => {
    const initData = async () => {
      // 1. Load History
      const storedHistory = await persistenceService.getHistory();
      if (storedHistory.length > 0) {
        setHistory(storedHistory);
      }

      // 2. Load Profile Draft
      const storedProfile = await persistenceService.getProfileDraft();
      if (storedProfile) {
        setCurrentProfile({ ...DEFAULT_PROFILE, ...storedProfile });
      }

      // 3. Load Admin Status (Using simple localStorage for config flags)
      const adminStatus = localStorage.getItem('charlotte_is_admin');
      if (adminStatus === 'true') {
        setIsAdmin(true);
      }
    };

    initData();
  }, []);

  const addToHistory = (result: SearchResult) => {
    // 1. Add to user visible history
    const newItem: HistoryItem = {
      ...result,
      id: generateUUID(),
    };
    
    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 50); // Limit to 50 items
      persistenceService.saveHistory(updated);
      return updated;
    });

    // 2. Log to admin storage via service
    historyService.logSearch(result);
  };

  const clearHistory = () => {
    setHistory([]);
    persistenceService.saveHistory([]);
  };

  const updateCurrentProfile = (updates: Partial<ASBLProfile>) => {
    setCurrentProfile(prev => {
      const updated = { ...prev, ...updates };
      persistenceService.saveProfileDraft(updated);
      return updated;
    });
  };

  const enableAdmin = () => {
    setIsAdmin(true);
    localStorage.setItem('charlotte_is_admin', 'true');
  };

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
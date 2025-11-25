
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HistoryItem, SearchResult, ASBLProfile, Sector } from '../types';
import { generateUUID } from '../services/historyService';
import { persistenceService } from '../services/persistence';

interface AppContextType {
  history: HistoryItem[];
  addToHistory: (result: SearchResult) => void;
  clearHistory: () => void;
  currentProfile: ASBLProfile;
  updateCurrentProfile: (updates: Partial<ASBLProfile>) => void;
  requestCount: number;
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
  const [currentProfile, setCurrentProfile] = useState<ASBLProfile>(DEFAULT_PROFILE);
  const [requestCount, setRequestCount] = useState<number>(0);

  useEffect(() => {
    const initData = async () => {
      const storedHistory = await persistenceService.getHistory();
      if (storedHistory.length > 0) setHistory(storedHistory);

      const storedProfile = await persistenceService.getProfileDraft();
      if (storedProfile) setCurrentProfile({ ...DEFAULT_PROFILE, ...storedProfile });

      const storedCount = await persistenceService.getRequestCount();
      setRequestCount(storedCount);
    };
    initData();
  }, []);

  const addToHistory = (result: SearchResult) => {
    const newItem: HistoryItem = { ...result, id: generateUUID() };
    
    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 50);
      persistenceService.saveHistory(updated);
      return updated;
    });

    setRequestCount(prev => {
      const newCount = prev + 1;
      persistenceService.saveRequestCount(newCount);
      return newCount;
    });
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

  return (
    <AppContext.Provider value={{ 
      history, 
      addToHistory, 
      clearHistory, 
      currentProfile,
      updateCurrentProfile,
      requestCount
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

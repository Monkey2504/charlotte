
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
  
  // Démarrage à 350 pour l'effet "Startup"
  const [requestCount, setRequestCount] = useState<number>(350); 

  useEffect(() => {
    const initData = async () => {
      const storedHistory = await persistenceService.getHistory();
      if (storedHistory.length > 0) setHistory(storedHistory);

      const storedProfile = await persistenceService.getProfileDraft();
      if (storedProfile) setCurrentProfile({ ...DEFAULT_PROFILE, ...storedProfile });

      const storedCount = await persistenceService.getRequestCount();
      // On s'assure que le compteur ne descend jamais en dessous de 350
      setRequestCount(storedCount > 350 ? storedCount : 350); 
    };
    initData();

    // --- EFFET STARTUP ---
    // Simule une activité globale sur la plateforme.
    // Le compteur augmente tout seul de temps en temps pour montrer que "ça bouge".
    const interval = setInterval(() => {
      setRequestCount(prev => {
        // 30% de chance d'augmenter toutes les 3 secondes
        const shouldIncrement = Math.random() > 0.7;
        if (shouldIncrement) {
          // On ne sauvegarde pas forcément ces fausses augmentations pour ne pas polluer le localStorage de l'utilisateur,
          // ou on peut le faire si on veut que ça persiste. Ici, c'est purement visuel pour la session.
          return prev + 1;
        }
        return prev;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const addToHistory = (result: SearchResult) => {
    const newItem: HistoryItem = { ...result, id: generateUUID() };
    
    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 50);
      persistenceService.saveHistory(updated);
      return updated;
    });

    // Incrémentation réelle lors d'une recherche utilisateur
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

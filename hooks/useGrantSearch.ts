
import { useState, useCallback } from 'react';
import { AgentState, ASBLProfile, SearchResult } from '../types';
import { searchGrants } from '../services/geminiService';
import { useApp } from '../contexts/AppContext';

export const useGrantSearch = () => {
  const { addToHistory } = useApp();
  const [state, setState] = useState<AgentState>({ status: 'idle', message: '' });
  const [currentResult, setCurrentResult] = useState<SearchResult | null>(null);

  const performSearch = useCallback(async (profile: ASBLProfile) => {
    setState({ status: 'searching', message: 'Je démarre mes recherches pour toi...' });
    setCurrentResult(null);

    try {
      // Simulation d'étapes d'analyse pour l'UX
      setTimeout(() => setState(s => ({ ...s, message: 'Je scanne ton secteur d\'activité...' })), 1500);
      setTimeout(() => setState(s => ({ ...s, status: 'analyzing', message: 'Je fouille les bases de données de financement...' })), 3000);

      const data = await searchGrants(profile);
      
      const resultWithMeta = {
        ...data,
        profileName: profile.name
      };

      setCurrentResult(resultWithMeta);
      addToHistory(resultWithMeta);
      setState({ status: 'complete', message: 'Ça y est, j\'ai trouvé des pépites !' });
      
    } catch (error) {
      console.error(error);
      let errorMsg = 'Oups, j\'ai eu un petit vertige technique.';
      if (error instanceof Error) errorMsg = error.message;

      setState({ 
        status: 'error', 
        message: errorMsg
      });
    }
  }, [addToHistory]);

  const resetSearch = useCallback(() => {
    setState({ status: 'idle', message: '' });
    setCurrentResult(null);
  }, []);

  return {
    state,
    currentResult,
    performSearch,
    resetSearch
  };
};

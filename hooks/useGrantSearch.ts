import { useState, useCallback } from 'react';
import { AgentState, ASBLProfile, SearchResult } from '../types';
import { searchAndRefineGrants } from '../services/geminiService';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../contexts/LanguageContext';

export const useGrantSearch = () => {
  const { addToHistory } = useApp();
  const { language, t } = useLanguage();
  const [state, setState] = useState<AgentState>({ status: 'idle', message: '' });
  const [currentResult, setCurrentResult] = useState<SearchResult | null>(null);

  const performSearch = useCallback(async (profile: ASBLProfile) => {
    setState({ status: 'searching', message: t('results.loading_title') });
    setCurrentResult(null);

    try {
      // Utilisation de la nouvelle fonction CoVe (Chain of Verification)
      const data = await searchAndRefineGrants(profile, language);
      
      const resultWithMeta = {
        ...data,
        profileName: profile.name
      };

      setCurrentResult(resultWithMeta);
      addToHistory(resultWithMeta);
      setState({ status: 'complete', message: 'OK' });
      
    } catch (error) {
      console.error(error);
      let errorMsg = 'Error';
      if (error instanceof Error) errorMsg = error.message;

      setState({ 
        status: 'error', 
        message: errorMsg
      });
    }
  }, [addToHistory, language, t]);

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
import React from 'react';
import ProfileForm from '../components/ProfileForm';
import ResultsView from '../components/ResultsView';
import { useGrantSearch } from '../hooks/useGrantSearch';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard: React.FC = () => {
  const { state, currentResult, performSearch } = useGrantSearch();
  const { t } = useLanguage();

  const isSearching = state.status === 'searching' || state.status === 'analyzing';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Form */}
      <div className="lg:col-span-4 xl:col-span-4">
        <div className="sticky top-8 space-y-4">
           <ProfileForm 
             onSearch={performSearch} 
             isLoading={isSearching} 
           />
        </div>
      </div>

      {/* Right Column: Results & Feedback */}
      <div className="lg:col-span-8 xl:col-span-8 min-h-[500px]">
        {/* Loading State - RIGHT COLUMN */}
        {isSearching ? (
           <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-violet-100 shadow-sm text-center animate-fade-in min-h-[400px]">
              <div className="bg-violet-50 p-6 rounded-full mb-6 relative mx-auto w-fit">
                 <Loader2 className="animate-spin text-violet-600" size={48} />
                 <div className="absolute inset-0 rounded-full border-4 border-violet-100 animate-ping opacity-20"></div>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2 font-outfit">{t('results.loading_title')}</h3>
              <p className="text-slate-500 max-w-md mx-auto animate-pulse">
                {state.message}
              </p>
           </div>
        ) : state.status === 'error' ? (
           /* Error State - RIGHT COLUMN */
           <div className="h-full flex flex-col items-center justify-center p-12 bg-red-50 rounded-3xl border border-red-100 text-center animate-fade-in min-h-[400px]">
              <div className="bg-white p-4 rounded-full mb-4 shadow-sm text-red-500 mx-auto w-fit">
                 <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-bold text-red-800 mb-2">{t('results.error_title')}</h3>
              <p className="text-red-600 max-w-md mb-6 mx-auto">
                {state.message}
              </p>
           </div>
        ) : (
           /* Results or Onboarding - RIGHT COLUMN */
           <ResultsView result={currentResult} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
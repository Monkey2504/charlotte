
import React from 'react';
import ProfileForm from '../components/ProfileForm';
import ResultsView from '../components/ResultsView';
import { useGrantSearch } from '../hooks/useGrantSearch';
import { Loader2 } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { state, currentResult, performSearch } = useGrantSearch();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Form */}
      <div className="lg:col-span-4 xl:col-span-4">
        <div className="sticky top-8 space-y-4">
           <ProfileForm 
             onSearch={performSearch} 
             isLoading={state.status === 'searching' || state.status === 'analyzing'} 
           />
           
           {/* Feedback Status */}
           {(state.status === 'searching' || state.status === 'analyzing') && (
              <div className="bg-white border border-violet-100 shadow-sm rounded-xl p-4 flex items-center gap-3 animate-pulse">
                 <Loader2 className="animate-spin text-violet-600" size={24} />
                 <div>
                    <p className="text-sm font-semibold text-slate-800">Analyse en cours...</p>
                    <p className="text-xs text-slate-500">{state.message}</p>
                 </div>
              </div>
           )}
           
           {state.status === 'error' && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
                {state.message}
              </div>
           )}
        </div>
      </div>

      {/* Right Column: Results */}
      <div className="lg:col-span-8 xl:col-span-8 min-h-[500px]">
        <ResultsView result={currentResult} />
      </div>
    </div>
  );
};

export default Dashboard;

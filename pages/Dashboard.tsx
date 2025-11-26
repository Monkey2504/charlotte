
import React, { useEffect, useRef } from 'react';
import ProfileForm from '../components/ProfileForm';
import ResultsView from '../components/ResultsView';
import { useGrantSearch } from '../hooks/useGrantSearch';
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useApp } from '../contexts/AppContext';
import { cn } from '../utils/styles';
import { Sector } from '../types';

const ThinkingProcess: React.FC<{ thoughts: string[] }> = ({ thoughts }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thoughts]);

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-violet-100 shadow-sm min-h-[500px] relative overflow-hidden">
       {/* Background Animation */}
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-50/50 via-transparent to-transparent opacity-70 animate-pulse"></div>
       
       <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border border-white shadow-xl max-w-md w-full relative z-10">
          <div className="flex justify-center mb-8">
             <div className="relative">
               <div className="w-16 h-16 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30 animate-bounce-slow">
                  <Sparkles className="text-white" size={32} />
               </div>
               <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 shadow-md">
                 <Loader2 className="animate-spin text-violet-600" size={20} />
               </div>
             </div>
          </div>

          <div className="space-y-4">
             {thoughts.length === 0 && (
                <p className="text-center text-slate-400 text-sm animate-pulse">Initialisation...</p>
             )}
             {thoughts.map((thought, idx) => {
               const isLast = idx === thoughts.length - 1;
               return (
                 <div 
                   key={idx} 
                   className={cn(
                     "flex items-start gap-3 transition-all duration-500",
                     isLast ? "opacity-100 scale-100" : "opacity-50 scale-95"
                   )}
                 >
                    <div className={cn(
                      "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border",
                      isLast ? "border-violet-500 bg-violet-50" : "border-emerald-500 bg-emerald-50"
                    )}>
                       {isLast ? (
                         <div className="w-2 h-2 bg-violet-600 rounded-full animate-pulse"></div>
                       ) : (
                         <CheckCircle2 size={12} className="text-emerald-600" />
                       )}
                    </div>
                    <p className={cn(
                      "text-sm font-medium",
                      isLast ? "text-slate-800" : "text-slate-400"
                    )}>
                      {thought}
                    </p>
                 </div>
               );
             })}
             <div ref={bottomRef} />
          </div>
       </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { state, currentResult, performSearch, thoughts } = useGrantSearch();
  const { updateCurrentProfile } = useApp();
  const { t } = useLanguage();

  const isSearching = state.status === 'searching' || state.status === 'analyzing';

  const handleLoadExample = () => {
    updateCurrentProfile({
      name: "Centre Culturel Horizon",
      sector: Sector.CULTURE,
      region: "Bruxelles-Capitale",
      description: "ASBL active dans l'initiation artistique (théâtre, musique) pour les jeunes de quartiers défavorisés. Nous souhaitons lancer un festival de rue cet été pour favoriser la cohésion sociale et cherchons des subsides pour le matériel et les artistes.",
      enterpriseNumber: "0456.789.123",
      budget: "50k€ - 200k€",
      website: "https://www.horizon-culture.be"
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Form */}
      <div className="lg:col-span-4 xl:col-span-4">
        <div className="sticky top-8 space-y-4">
           <ProfileForm 
             onSearch={performSearch} 
             isLoading={isSearching}
             onLoadExample={handleLoadExample}
           />
        </div>
      </div>

      {/* Right Column: Results & Feedback */}
      <div className="lg:col-span-8 xl:col-span-8 min-h-[500px]">
        {isSearching ? (
           <ThinkingProcess thoughts={thoughts} />
        ) : state.status === 'error' ? (
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
           <ResultsView 
             result={currentResult} 
             onLoadExample={handleLoadExample} 
           />
        )}
      </div>
    </div>
  );
};

export default Dashboard;

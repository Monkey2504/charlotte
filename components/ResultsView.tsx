import React, { useState } from 'react';
import { SearchResult, GrantOpportunity } from '../types';
import { ExternalLink, Calendar, Globe, ShieldCheck, Trophy, ArrowRight, Lightbulb, Sparkles, Target, TrendingUp, Search, Zap } from 'lucide-react';
import { Card, Badge, ProgressBar, Button } from './ui/DesignSystem';
import { useLanguage } from '../contexts/LanguageContext';

interface ResultsViewProps {
  result: SearchResult | null;
}

// --- SENIOR TEXT RENDERER ---
// Remplace le simple split par un parsing plus sémantique
// Gère les sauts de ligne, les listes à puces et le gras
const FormattedText: React.FC<{ text: string; className?: string }> = ({ text, className = "" }) => {
  if (!text) return null;

  const paragraphs = text.split('\n').filter(p => p.trim() !== '');

  return (
    <div className={`space-y-2 ${className}`}>
      {paragraphs.map((paragraph, idx) => {
        // Gestion des listes à puces
        if (paragraph.trim().startsWith('- ') || paragraph.trim().startsWith('* ')) {
           const content = paragraph.replace(/^[-*]\s+/, '');
           return (
             <div key={idx} className="flex gap-2 ml-2">
               <span className="text-violet-500 mt-1.5">•</span>
               <span className="text-slate-600">{parseBold(content)}</span>
             </div>
           );
        }
        // Paragraphe standard
        return <p key={idx} className="text-slate-600 leading-relaxed">{parseBold(paragraph)}</p>;
      })}
    </div>
  );
};

// Helper pour le gras (**text**)
const parseBold = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-bold text-slate-800">{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
};

const ResultsView: React.FC<ResultsViewProps> = ({ result }) => {
  const [sortBy, setSortBy] = useState<'relevance' | 'deadline'>('relevance');
  const { t } = useLanguage();

  if (!result) {
    return (
      <div className="h-full flex flex-col justify-center animate-fade-in py-8">
        {/* HERO SECTION / ONBOARDING */}
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-white/50 relative overflow-hidden max-w-4xl mx-auto">
           <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-violet-100/50 to-transparent rounded-bl-full pointer-events-none -mr-20 -mt-20 opacity-60"></div>
           <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-fuchsia-100/40 to-transparent rounded-tr-full pointer-events-none -ml-20 -mb-20 opacity-60"></div>

           <div className="p-10 md:p-14 text-center relative z-10">
              <div className="inline-flex bg-gradient-to-br from-violet-500 to-fuchsia-600 p-1 rounded-3xl mb-8 shadow-xl shadow-violet-500/20">
                 <div className="bg-white p-5 rounded-[1.3rem]">
                   <Sparkles size={48} className="text-transparent bg-clip-text bg-gradient-to-br from-violet-600 to-fuchsia-600 fill-violet-50" />
                 </div>
              </div>
              
              <h3 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-6 font-outfit tracking-tight leading-tight">
                {t('results.empty_title')}
              </h3>
              <p className="text-slate-600 mb-12 leading-relaxed max-w-xl mx-auto text-lg font-light">
                {t('results.empty_desc')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-start mb-12">
                 <BenefitCard icon={<Target size={20} />} title={t('results.benefit_sort')} desc={t('results.benefit_sort_desc')} color="amber" />
                 <BenefitCard icon={<TrendingUp size={20} />} title={t('results.benefit_find')} desc={t('results.benefit_find_desc')} color="emerald" />
                 <BenefitCard icon={<Lightbulb size={20} />} title={t('results.benefit_advise')} desc={t('results.benefit_advise_desc')} color="violet" />
              </div>

              <div className="relative pt-6">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 py-1 rounded-full border border-slate-100 shadow-sm text-[10px] font-bold text-slate-400 uppercase tracking-widest z-10">
                   {t('results.preview_title')}
                 </div>
                 <div className="opacity-60 scale-95 select-none pointer-events-none blur-[1px] grayscale-[20%]">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex gap-4 items-center max-w-md mx-auto">
                       <div className="w-12 h-12 rounded-full bg-slate-100"></div>
                       <div className="flex-1 space-y-2">
                          <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                          <div className="h-2 bg-slate-100 rounded w-3/4"></div>
                       </div>
                       <div className="h-8 w-20 bg-violet-100 rounded-lg"></div>
                    </div>
                 </div>
                 <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-4">
                     <div className="flex items-center gap-2 text-violet-600 font-medium animate-pulse">
                        <Zap size={16} fill="currentColor" />
                        <p>{t('results.cta')}</p>
                     </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  const timestamp = result.timestamp ? new Date(result.timestamp) : new Date();
  const dateStr = timestamp.toLocaleDateString();

  const opportunities = result.opportunities || [];
  const sortedOpportunities = [...opportunities].sort((a, b) => {
     if (sortBy === 'relevance') {
       return (b.relevanceScore || 0) - (a.relevanceScore || 0);
     }
     const getTime = (isoDate?: string) => {
       if (!isoDate) return 4102444800000; // 2100
       const t = new Date(isoDate).getTime();
       return isNaN(t) ? 4102444800000 : t;
     };
     return getTime(a.deadlineDate) - getTime(b.deadlineDate);
  });

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t('results.found_title')}</h2>
             <Badge variant="success">{opportunities.length} {t('results.found_pistes')}</Badge>
           </div>
           <p className="text-sm text-slate-500 flex items-center gap-2">
             <Calendar size={14} className="text-violet-500" />
             {t('results.found_date')} <span className="font-medium text-slate-700">{dateStr}</span>
           </p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1">
          <SortButton active={sortBy === 'relevance'} onClick={() => setSortBy('relevance')}>{t('results.sort_relevance')}</SortButton>
          <SortButton active={sortBy === 'deadline'} onClick={() => setSortBy('deadline')}>{t('results.sort_deadline')}</SortButton>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 p-1 shadow-lg shadow-violet-500/20">
         <div className="bg-white rounded-[1.3rem] p-6 md:p-8">
            <div className="flex gap-5 items-start">
                <div className="bg-violet-50 p-3 rounded-2xl h-fit shrink-0 text-violet-600">
                    <Trophy size={28} />
                </div>
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{t('results.summary_title')}</h3>
                    <FormattedText text={result.executiveSummary} />
                </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
           {sortedOpportunities.length > 0 ? (
             sortedOpportunities.map((opp, idx) => (
               <OpportunityCard key={idx} data={opp} t={t} />
             ))
           ) : (
             <div className="text-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
               <Search size={48} className="mx-auto mb-4 opacity-50" />
               <p className="font-medium">Aucune opportunité trouvée.</p>
               <p className="text-sm">Essayez d'élargir votre description ou de changer de secteur.</p>
             </div>
           )}
        </div>

        <div className="xl:col-span-1 space-y-6">
          <Card title={<div className="flex items-center gap-2 text-amber-600"><Lightbulb size={20} fill="currentColor" className="text-amber-100" /> {t('results.advice_title')}</div>} className="border-l-4 border-l-amber-400">
             <div className="text-sm italic">
               <FormattedText text={result.strategicAdvice} />
             </div>
          </Card>

          <Card title={<div className="flex items-center gap-2"><Globe size={18} className="text-violet-600"/> {t('results.sources_title')}</div>}>
             <div className="space-y-3">
              {result.sources && result.sources.length > 0 ? (
                result.sources.map((source, idx) => (
                  source.web?.uri && (
                    <a key={idx} href={source.web.uri} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group">
                      <div className="mt-0.5 bg-slate-100 text-slate-500 p-1.5 rounded-lg shrink-0 group-hover:bg-violet-100 group-hover:text-violet-600 transition-colors">
                        <ExternalLink size={14} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-700 group-hover:text-violet-700 truncate">
                            {source.web.title || "Source Web"}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {new URL(source.web.uri).hostname}
                        </p>
                      </div>
                    </a>
                  )
                ))
              ) : (
                <p className="text-sm text-slate-400 italic text-center py-4">{t('results.sources_empty')}</p>
              )}
            </div>
          </Card>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 text-xs flex gap-3 leading-snug">
             <ShieldCheck size={16} className="shrink-0 mt-0.5 text-slate-400" />
             <p>{t('results.disclaimer')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub-Components for Cleaner Code ---

const BenefitCard: React.FC<{ icon: React.ReactNode; title: string; desc: string; color: 'amber' | 'emerald' | 'violet' }> = ({ icon, title, desc, color }) => {
  const colorClasses = {
    amber: "bg-amber-100 text-amber-600 hover:shadow-amber-100/50",
    emerald: "bg-emerald-100 text-emerald-600 hover:shadow-emerald-100/50",
    violet: "bg-violet-100 text-violet-600 hover:shadow-violet-100/50"
  };
  
  return (
    <div className={`group p-6 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all duration-300 ${colorClasses[color]}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]}`}>
            {icon}
        </div>
        <h4 className="font-bold text-slate-800 text-base mb-2">{title}</h4>
        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
};

const SortButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button 
     onClick={onClick}
     className={`px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-sm ${active ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 shadow-none'}`}
  >
    {children}
  </button>
);

const OpportunityCard: React.FC<{ data: GrantOpportunity, t: (k:string)=>string }> = ({ data, t }) => {
  const score = data.relevanceScore || 0;
  const scoreColor = score > 80 ? 'bg-emerald-500 shadow-emerald-200' : score > 50 ? 'bg-amber-500 shadow-amber-200' : 'bg-slate-400 shadow-slate-200';

  const handleDetailsClick = () => {
    if (data.url) {
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } else {
      const query = encodeURIComponent(`${data.title} ${data.provider} subvention`);
      window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300 group">
       <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
             <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 text-[10px] font-bold uppercase tracking-wider">{data.type || "Opportunité"}</span>
                {data.deadlineDate && new Date(data.deadlineDate) < new Date(new Date().setMonth(new Date().getMonth() + 1)) && (
                    <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Zap size={10} fill="currentColor" /> Urgent
                    </span>
                )}
             </div>
             
             <h4 className="text-xl font-bold text-slate-800 group-hover:text-violet-700 transition-colors mb-1">{parseBold(data.title)}</h4>
             <p className="text-sm font-medium text-slate-500 mb-4">{data.provider}</p>
             
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
                <div className="absolute top-0 left-4 -mt-1.5 w-3 h-3 bg-slate-50 border-t border-l border-slate-100 transform rotate-45"></div>
                <div className="text-sm text-slate-600 italic">
                   <FormattedText text={data.relevanceReason} />
                </div>
             </div>

             <div className="flex items-center gap-4 mt-5 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-slate-600">
                   <Calendar size={14} className="text-violet-500" /> 
                   {t('results.card_deadline')} <span className="text-slate-900 font-bold">{data.deadline}</span>
                </span>
             </div>
          </div>

          <div className="w-full md:w-48 shrink-0 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 md:pl-6 rtl:md:border-l-0 rtl:md:border-r rtl:md:pl-0 rtl:md:pr-6">
             <ProgressBar 
               value={score} 
               label={t('results.card_score')}
               colorClass={scoreColor}
             />
             <Button 
                variant="outline" 
                className="w-full mt-6 text-xs py-3 border-slate-200 hover:border-violet-300 hover:bg-violet-50 text-slate-600 hover:text-violet-700" 
                icon={data.url ? <ExternalLink size={14}/> : <Search size={14}/>}
                onClick={handleDetailsClick}
             >
                {t('results.card_details')}
             </Button>
          </div>
       </div>
    </div>
  );
};

export default ResultsView;

import React, { useState } from 'react';
import { SearchResult, GrantOpportunity } from '../types';
import { ExternalLink, Calendar, Globe, ShieldCheck, Trophy, ArrowRight, Lightbulb, Bot, Target, TrendingUp } from 'lucide-react';
import { Card, Badge, ProgressBar, Button } from './ui/DesignSystem';
import { useLanguage } from '../contexts/LanguageContext';

interface ResultsViewProps {
  result: SearchResult | null;
}

const ResultsView: React.FC<ResultsViewProps> = ({ result }) => {
  const [sortBy, setSortBy] = useState<'relevance' | 'deadline'>('relevance');
  const { t } = useLanguage();

  if (!result) {
    return (
      <div className="h-full flex flex-col justify-center animate-fade-in py-8">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 md:p-12 text-center max-w-3xl mx-auto">
           <div className="inline-flex bg-violet-50 p-4 rounded-2xl mb-6 shadow-sm border border-violet-100">
              <Bot size={48} className="text-violet-600" />
           </div>
           
           <h3 className="text-2xl font-bold text-slate-800 mb-4 font-outfit">
             {t('results.empty_title')}
           </h3>
           <p className="text-slate-500 mb-10 leading-relaxed max-w-lg mx-auto">
             {t('results.empty_desc')}
           </p>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-start mb-10">
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:border-amber-200 hover:bg-amber-50/50">
                 <div className="bg-white p-2 w-fit rounded-lg shadow-sm text-amber-500 mb-3">
                    <Target size={20} />
                 </div>
                 <h4 className="font-bold text-slate-700 text-sm mb-1">{t('results.benefit_sort')}</h4>
                 <p className="text-xs text-slate-500 leading-relaxed">{t('results.benefit_sort_desc')}</p>
              </div>
              
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:border-emerald-200 hover:bg-emerald-50/50">
                 <div className="bg-white p-2 w-fit rounded-lg shadow-sm text-emerald-500 mb-3">
                    <TrendingUp size={20} />
                 </div>
                 <h4 className="font-bold text-slate-700 text-sm mb-1">{t('results.benefit_find')}</h4>
                 <p className="text-xs text-slate-500 leading-relaxed">{t('results.benefit_find_desc')}</p>
              </div>

              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:border-violet-200 hover:bg-violet-50/50">
                 <div className="bg-white p-2 w-fit rounded-lg shadow-sm text-violet-500 mb-3">
                    <Lightbulb size={20} />
                 </div>
                 <h4 className="font-bold text-slate-700 text-sm mb-1">{t('results.benefit_advise')}</h4>
                 <p className="text-xs text-slate-500 leading-relaxed">{t('results.benefit_advise_desc')}</p>
              </div>
           </div>

           <div className="pt-8 border-t border-slate-100 relative">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
                {t('results.preview_title')}
              </p>
              {/* Fake UI preview */}
              <div className="opacity-80 scale-95 select-none pointer-events-none blur-[0.5px]">
                 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex gap-4 items-center">
                    <div className="flex-1 space-y-3">
                       <div className="flex items-center gap-2">
                           <div className="h-4 bg-violet-100 rounded w-20"></div>
                           <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                       </div>
                       <div className="h-3 bg-slate-50 rounded w-3/4"></div>
                    </div>
                 </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent flex items-end justify-center pb-2">
                  <p className="text-sm font-medium text-violet-600 animate-pulse">{t('results.cta')}</p>
              </div>
           </div>
        </div>
      </div>
    );
  }

  const dateStr = new Date(result.timestamp).toLocaleDateString();

  const sortedOpportunities = [...result.opportunities].sort((a, b) => {
     if (sortBy === 'relevance') return b.relevanceScore - a.relevanceScore;
     
     const dateA = a.deadlineDate ? new Date(a.deadlineDate).getTime() : new Date('2099-12-31').getTime();
     const dateB = b.deadlineDate ? new Date(b.deadlineDate).getTime() : new Date('2099-12-31').getTime();
     return dateA - dateB;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
           <div className="flex items-center gap-3 mb-1">
             <h2 className="text-2xl font-bold text-slate-800">{t('results.found_title')}</h2>
             <Badge variant="success">{result.opportunities.length} {t('results.found_pistes')}</Badge>
           </div>
           <p className="text-sm text-slate-500 flex items-center gap-2">
             <Calendar size={14} />
             {t('results.found_date')} {dateStr}
           </p>
        </div>
        <div className="flex gap-2">
          <button 
             onClick={() => setSortBy('relevance')}
             className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${sortBy === 'relevance' ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            {t('results.sort_relevance')}
          </button>
          <button 
             onClick={() => setSortBy('deadline')}
             className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${sortBy === 'deadline' ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            {t('results.sort_deadline')}
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 p-6 rounded-2xl border border-violet-100">
         <div className="flex gap-4">
            <div className="bg-white p-2.5 rounded-xl h-fit shadow-sm text-violet-600">
               <Trophy size={24} />
            </div>
            <div>
               <h3 className="text-lg font-semibold text-slate-800 mb-1">{t('results.summary_title')}</h3>
               <p className="text-slate-700 leading-relaxed text-sm md:text-base">
                 {result.executiveSummary}
               </p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Main List */}
        <div className="xl:col-span-2 space-y-4">
           {sortedOpportunities.map((opp, idx) => (
             <OpportunityCard key={idx} data={opp} t={t} />
           ))}
        </div>

        {/* Sidebar */}
        <div className="xl:col-span-1 space-y-6">
          {/* Strategic Advice */}
          <Card title={<div className="flex items-center gap-2 text-amber-600"><Lightbulb size={20}/> {t('results.advice_title')}</div>} className="border-l-4 border-l-amber-400">
             <p className="text-sm text-slate-600 italic">
               "{result.strategicAdvice}"
             </p>
          </Card>

          {/* Sources */}
          <Card title={<div className="flex items-center gap-2"><Globe size={18} className="text-violet-600"/> {t('results.sources_title')}</div>}>
             <div className="space-y-3">
              {result.sources.length > 0 ? (
                result.sources.map((source, idx) => (
                  source.web?.uri && (
                    <a
                      key={idx}
                      href={source.web.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
                    >
                      <div className="mt-1 bg-slate-100 text-slate-500 p-1.5 rounded-md shrink-0 group-hover:bg-violet-100 group-hover:text-violet-600 transition-colors">
                        <ExternalLink size={12} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-medium text-slate-700 group-hover:text-violet-700 truncate">
                            {source.web.title || "Lien Web"}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                            {new URL(source.web.uri).hostname}
                        </p>
                      </div>
                    </a>
                  )
                ))
              ) : (
                <p className="text-sm text-slate-400 italic">{t('results.sources_empty')}</p>
              )}
            </div>
          </Card>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 text-xs flex gap-2">
             <ShieldCheck size={16} className="shrink-0" />
             <p>{t('results.disclaimer')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const OpportunityCard: React.FC<{ data: GrantOpportunity, t: (k:string)=>string }> = ({ data, t }) => {
  const scoreColor = data.relevanceScore > 80 ? 'bg-emerald-500' : data.relevanceScore > 50 ? 'bg-amber-500' : 'bg-slate-400';

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-shadow group">
       <div className="flex flex-col md:flex-row gap-5">
          <div className="flex-1">
             <div className="flex items-start justify-between mb-2">
                <div>
                   <span className="text-[10px] uppercase font-bold tracking-wider text-violet-600 mb-1 block">{data.type}</span>
                   <h4 className="text-lg font-bold text-slate-800 group-hover:text-violet-700 transition-colors">{data.title}</h4>
                   <p className="text-sm font-medium text-slate-500">{data.provider}</p>
                </div>
             </div>
             
             <p className="text-sm text-slate-600 mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                "{data.relevanceReason}"
             </p>

             <div className="flex items-center gap-4 mt-4 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-md">
                   <Calendar size={12} /> {t('results.card_deadline')} {data.deadline}
                </span>
             </div>
          </div>

          <div className="w-full md:w-40 shrink-0 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-5 rtl:md:border-l-0 rtl:md:border-r rtl:md:pl-0 rtl:md:pr-5">
             <ProgressBar 
               value={data.relevanceScore} 
               label={t('results.card_score')}
               colorClass={scoreColor}
             />
             <Button variant="outline" className="w-full mt-4 text-xs py-2" icon={<ArrowRight size={12}/>}>
                {t('results.card_details')}
             </Button>
          </div>
       </div>
    </div>
  );
};

export default ResultsView;
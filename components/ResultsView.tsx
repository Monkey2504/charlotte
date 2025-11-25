
import React, { useState } from 'react';
import { SearchResult, GrantOpportunity } from '../types';
import { ExternalLink, Calendar, Info, Globe, ShieldCheck, Trophy, ArrowRight, Lightbulb, Bot, Target, TrendingUp } from 'lucide-react';
import { Card, Badge, ProgressBar, Button } from './ui/DesignSystem';

interface ResultsViewProps {
  result: SearchResult | null;
}

const ResultsView: React.FC<ResultsViewProps> = ({ result }) => {
  const [sortBy, setSortBy] = useState<'relevance' | 'deadline'>('relevance');

  if (!result) {
    return (
      <div className="h-full flex flex-col justify-center animate-fade-in py-8">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 md:p-12 text-center max-w-3xl mx-auto">
           <div className="inline-flex bg-violet-50 p-4 rounded-2xl mb-6 shadow-sm border border-violet-100">
              <Bot size={48} className="text-violet-600" />
           </div>
           
           <h3 className="text-2xl font-bold text-slate-800 mb-4 font-outfit">
             Coucou, moi c'est Charlotte !
           </h3>
           <p className="text-slate-500 mb-10 leading-relaxed max-w-lg mx-auto">
             Je suis ton assistante personnelle dédiée au financement. Remplis le formulaire à gauche, et je pars immédiatement à la chasse aux opportunités pour toi.
           </p>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-10">
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:border-amber-200 hover:bg-amber-50/50">
                 <div className="bg-white p-2 w-fit rounded-lg shadow-sm text-amber-500 mb-3">
                    <Target size={20} />
                 </div>
                 <h4 className="font-bold text-slate-700 text-sm mb-1">Je trie</h4>
                 <p className="text-xs text-slate-500 leading-relaxed">Je ne te montre que ce qui est vraiment utile pour TON projet.</p>
              </div>
              
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:border-emerald-200 hover:bg-emerald-50/50">
                 <div className="bg-white p-2 w-fit rounded-lg shadow-sm text-emerald-500 mb-3">
                    <TrendingUp size={20} />
                 </div>
                 <h4 className="font-bold text-slate-700 text-sm mb-1">Je déniche</h4>
                 <p className="text-xs text-slate-500 leading-relaxed">Je scanne le local, le régional et le fédéral pour ne rien rater.</p>
              </div>

              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:border-violet-200 hover:bg-violet-50/50">
                 <div className="bg-white p-2 w-fit rounded-lg shadow-sm text-violet-500 mb-3">
                    <Lightbulb size={20} />
                 </div>
                 <h4 className="font-bold text-slate-700 text-sm mb-1">Je te conseille</h4>
                 <p className="text-xs text-slate-500 leading-relaxed">Je te dis exactement pourquoi je pense que ça va marcher.</p>
              </div>
           </div>

           <div className="pt-8 border-t border-slate-100 relative">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
                Voilà ce que je vais te préparer
              </p>
              {/* Fake UI preview */}
              <div className="opacity-80 scale-95 select-none pointer-events-none blur-[0.5px]">
                 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-left flex gap-4 items-center">
                    <div className="flex-1 space-y-3">
                       <div className="flex items-center gap-2">
                           <div className="h-4 bg-violet-100 rounded w-20"></div>
                           <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                       </div>
                       <div className="h-3 bg-slate-50 rounded w-3/4"></div>
                    </div>
                    <div className="w-32 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex justify-between mb-1">
                           <div className="h-2 bg-slate-200 rounded w-8"></div>
                           <div className="h-2 bg-emerald-100 rounded w-6"></div>
                        </div>
                       <div className="h-2 bg-emerald-400 rounded-full w-4/5"></div>
                    </div>
                 </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent flex items-end justify-center pb-2">
                  <p className="text-sm font-medium text-violet-600 animate-pulse">Dis-moi ce que tu cherches, je m'occupe de tout !</p>
              </div>
           </div>
        </div>
      </div>
    );
  }

  const dateStr = new Date(result.timestamp).toLocaleDateString('fr-BE', { 
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const sortedOpportunities = [...result.opportunities].sort((a, b) => {
     if (sortBy === 'relevance') return b.relevanceScore - a.relevanceScore;
     return a.deadline.localeCompare(b.deadline); 
  });

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
           <div className="flex items-center gap-3 mb-1">
             <h2 className="text-2xl font-bold text-slate-800">Voici mes trouvailles</h2>
             <Badge variant="success">{result.opportunities.length} pistes</Badge>
           </div>
           <p className="text-sm text-slate-500 flex items-center gap-2">
             <Calendar size={14} />
             Mes recherches du {dateStr}
           </p>
        </div>
        <div className="flex gap-2">
          <button 
             onClick={() => setSortBy('relevance')}
             className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${sortBy === 'relevance' ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Mes coups de cœur
          </button>
          <button 
             onClick={() => setSortBy('deadline')}
             className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${sortBy === 'deadline' ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Les plus urgents
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
               <h3 className="text-lg font-semibold text-slate-800 mb-1">Mon résumé pour toi</h3>
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
             <OpportunityCard key={idx} data={opp} />
           ))}
        </div>

        {/* Sidebar */}
        <div className="xl:col-span-1 space-y-6">
          {/* Strategic Advice */}
          <Card title={<div className="flex items-center gap-2 text-amber-600"><Lightbulb size={20}/> Mon conseil d'amie</div>} className="border-l-4 border-l-amber-400">
             <p className="text-sm text-slate-600 italic">
               "{result.strategicAdvice}"
             </p>
          </Card>

          {/* Sources */}
          <Card title={<div className="flex items-center gap-2"><Globe size={18} className="text-violet-600"/> Où j'ai trouvé ça</div>}>
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
                <p className="text-sm text-slate-400 italic">Je n'ai pas de lien direct, mais Google est ton ami aussi !</p>
              )}
            </div>
          </Card>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 text-xs flex gap-2">
             <ShieldCheck size={16} className="shrink-0" />
             <p>Je fais de mon mieux pour t'aider, mais vérifie toujours les détails officiels, d'accord ?</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const OpportunityCard: React.FC<{ data: GrantOpportunity }> = ({ data }) => {
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
                   <Calendar size={12} /> Deadline : {data.deadline}
                </span>
             </div>
          </div>

          <div className="w-full md:w-40 shrink-0 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-5">
             <ProgressBar 
               value={data.relevanceScore} 
               label="Mon feeling" 
               colorClass={scoreColor}
             />
             <Button variant="outline" className="w-full mt-4 text-xs py-2" icon={<ArrowRight size={12}/>}>
                Détails
             </Button>
          </div>
       </div>
    </div>
  );
};

export default ResultsView;

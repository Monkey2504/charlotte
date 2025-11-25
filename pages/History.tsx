import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Card, Button, Badge } from '../components/ui/DesignSystem';
import { Calendar, Trash2, Trophy, Download, ShieldCheck } from 'lucide-react';
import { historyService } from '../services/historyService';
import { useLanguage } from '../contexts/LanguageContext';

const History: React.FC = () => {
  const { history, clearHistory, isAdmin } = useApp();
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h1 className="text-2xl font-bold text-slate-800">{t('history.title')}</h1>
         <div className="flex gap-2">
            {isAdmin && (
              <Button 
                variant="outline" 
                onClick={() => historyService.exportLogsToJSON()} 
                icon={<Download size={16} />}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                {t('history.export')}
              </Button>
            )}
            {history.length > 0 && (
              <Button variant="ghost" onClick={clearHistory} icon={<Trash2 size={16} />} className="text-slate-400 hover:text-red-500 hover:bg-red-50">
                {t('history.clear')}
              </Button>
            )}
         </div>
      </div>

      {history.length === 0 ? (
        <Card className="text-center py-16">
           <div className="bg-slate-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
             <HistoryIcon size={32} className="text-slate-400" />
           </div>
           <h3 className="text-lg font-semibold text-slate-600">{t('history.empty_title')}</h3>
           <p className="text-slate-400 max-w-md mx-auto mt-2">
             {t('history.empty_desc')}
           </p>
        </Card>
      ) : (
        <div className="grid gap-6">
           {history.map((item) => (
             <Card key={item.id} className="hover:shadow-md transition-shadow group relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-violet-500 rtl:left-auto rtl:right-0"></div>
               <div className="flex flex-col md:flex-row gap-6 p-2">
                  <div className="md:w-1/3 space-y-3 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6 rtl:md:border-r-0 rtl:md:border-l rtl:md:pl-6">
                     <div>
                        <h3 className="font-bold text-slate-800 text-lg truncate">{item.profileName || "Recherche Sans Nom"}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                          <Calendar size={12} />
                          {new Date(item.timestamp).toLocaleDateString()}
                        </p>
                     </div>
                     <div className="flex flex-wrap gap-2">
                        <Badge variant="info">{item.opportunities.length} {t('history.opportunities')}</Badge>
                        <Badge variant="neutral">{item.sources.length} {t('history.sources')}</Badge>
                     </div>
                  </div>
                  
                  <div className="md:w-2/3 flex flex-col justify-between">
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('history.synthesis')}</h4>
                        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                            {item.executiveSummary}
                        </p>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-50 flex gap-4 overflow-hidden">
                        {item.opportunities.slice(0, 2).map((opp, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 truncate max-w-[50%]">
                                <Trophy size={12} className="text-amber-500 shrink-0" />
                                <span className="truncate">{opp.title}</span>
                            </div>
                        ))}
                        {item.opportunities.length > 2 && (
                            <span className="text-xs text-slate-400 self-center">+{item.opportunities.length - 2} {t('history.others')}</span>
                        )}
                    </div>
                  </div>
               </div>
             </Card>
           ))}
        </div>
      )}
      
      {isAdmin && (
        <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-800 text-sm">
           <ShieldCheck size={20} />
           <p><strong>{t('history.admin_mode')}</strong></p>
        </div>
      )}
    </div>
  );
};

// Helper Icon
const HistoryIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/><path d="M3 3v9h9"/><path d="M12 7v5l4 2"/></svg>
);

export default History;
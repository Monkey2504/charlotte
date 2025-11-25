import React, { useState, useEffect } from 'react';
import { ASBLProfile, Sector, SearchMode } from '../types';
import { enrichProfileFromNumber } from '../services/geminiService';
import { Button, Input, Select, Card, TextArea } from './ui/DesignSystem';
import { Search, Sparkles, Globe, MapPin, Building2, Wallet, AlertCircle, Zap, Eye } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../contexts/LanguageContext';

interface ProfileFormProps {
  onSearch: (profile: ASBLProfile) => void;
  isLoading: boolean;
}

const COOLDOWN_SECONDS = 30;
type UserType = 'entity' | 'individual';

const ProfileForm: React.FC<ProfileFormProps> = ({ onSearch, isLoading }) => {
  const { currentProfile, updateCurrentProfile } = useApp();
  const { t, language } = useLanguage();
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [userType, setUserType] = useState<UserType>('entity');
  const [searchMode, setSearchMode] = useState<SearchMode>('deep'); // Default to Deep
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: number;
    if (cooldown > 0) {
      timer = window.setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [cooldown]);

  const handleChange = (field: keyof ASBLProfile, value: any) => {
    updateCurrentProfile({ [field]: value });
    if (field === 'enterpriseNumber') setEnrichError(null);
  };

  const handleAutoFill = async () => {
    if (cooldown > 0) return;
    if (!currentProfile.enterpriseNumber || currentProfile.enterpriseNumber.length < 3) {
        setEnrichError(t('form.autofill_empty'));
        return;
    }
    setIsEnriching(true);
    setEnrichError(null);
    try {
        const enrichedData = await enrichProfileFromNumber(currentProfile.enterpriseNumber, language);
        updateCurrentProfile(enrichedData);
    } catch (err) {
        setEnrichError(t('form.autofill_error'));
    } finally {
        setIsEnriching(false);
        setCooldown(COOLDOWN_SECONDS);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ ...currentProfile, searchMode });
  };

  return (
    <Card className="border-t-4 border-t-violet-500 shadow-md">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="text-violet-600" size={24} />
          {t('form.title')}
        </h2>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">{t('form.subtitle')}</p>
      </div>

      <div className="bg-slate-100 p-1 rounded-xl flex mb-6">
         <button 
           type="button"
           onClick={() => setUserType('entity')}
           className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${userType === 'entity' ? 'bg-white shadow-sm text-violet-700' : 'text-slate-500 hover:text-slate-700'}`}
         >
           {t('form.type_entity')}
         </button>
         <button 
           type="button"
           onClick={() => setUserType('individual')}
           className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${userType === 'individual' ? 'bg-white shadow-sm text-violet-700' : 'text-slate-500 hover:text-slate-700'}`}
         >
           {t('form.type_individual')}
         </button>
      </div>

      {userType === 'individual' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 text-xs text-amber-800 mb-6 animate-fade-in">
           <AlertCircle size={16} className="shrink-0 mt-0.5" />
           <p>{t('form.individual_warning')}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-violet-50/50 p-4 rounded-xl border border-violet-100 space-y-2">
           <div className="flex items-end gap-2">
              <Input 
                label={userType === 'entity' ? t('form.identity_label_entity') : t('form.identity_label_individual')}
                placeholder={userType === 'entity' ? "0456.789.123" : "Prénom Nom"}
                value={currentProfile.enterpriseNumber || ''}
                onChange={(e) => handleChange('enterpriseNumber', e.target.value)}
                error={enrichError || undefined}
                className="bg-white"
              />
              {userType === 'entity' && (
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleAutoFill}
                  isLoading={isEnriching}
                  disabled={cooldown > 0}
                  className={`mb-[1px] border-violet-200 transition-colors w-14 flex justify-center ${cooldown > 0 ? 'bg-slate-100 text-slate-400' : 'text-violet-700 hover:bg-violet-100'}`}
                >
                  {isEnriching ? <span className="opacity-0">.</span> : cooldown > 0 ? <span className="text-xs font-bold font-mono">{cooldown}</span> : <Sparkles size={18} className="text-violet-600" />}
                </Button>
              )}
           </div>
        </div>

        <Input 
          label={t('form.name_label')}
          required
          placeholder="..."
          value={currentProfile.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
             label={t('form.website_label')}
             leftIcon={<Globe size={16} />}
             placeholder="https://..."
             value={currentProfile.website || ''}
             onChange={(e) => handleChange('website', e.target.value)}
          />
          <Input 
             label={t('form.region_label')}
             leftIcon={<MapPin size={16} />}
             required
             value={currentProfile.region}
             onChange={(e) => handleChange('region', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
            label={t('form.sector_label')}
            options={Object.values(Sector).map(s => ({ value: s, label: s }))}
            value={currentProfile.sector}
            onChange={(e) => handleChange('sector', e.target.value)}
          />
          <Select 
            label={t('form.budget_label')}
            leftIcon={<Wallet size={16} />}
            options={[
                { value: "< 10k€", label: "< 10k€" },
                { value: "10k€ - 50k€", label: "10k€ - 50k€" },
                { value: "50k€ - 200k€", label: "50k€ - 200k€" },
                { value: "> 200k€", label: "> 200k€" },
            ]}
            value={currentProfile.budget}
            onChange={(e) => handleChange('budget', e.target.value)}
          />
        </div>

        <TextArea
          label={t('form.desc_label')}
          required
          rows={4}
          placeholder={t('form.desc_placeholder')}
          value={currentProfile.description}
          onChange={(e) => handleChange('description', e.target.value)}
        />

        {/* SEARCH MODE SELECTOR ENHANCED */}
        <div className="pt-2 space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Stratégie de recherche</label>
            <div className="grid grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={() => setSearchMode('fast')}
                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${searchMode === 'fast' ? 'bg-violet-50 border-violet-300 ring-1 ring-violet-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                >
                    <div className="flex items-center gap-2 mb-1 relative z-10">
                        <Zap size={16} className={searchMode === 'fast' ? 'text-violet-600' : 'text-slate-400'} />
                        <span className={`text-xs font-bold ${searchMode === 'fast' ? 'text-violet-900' : 'text-slate-600'}`}>{t('form.mode_fast')}</span>
                    </div>
                    {searchMode === 'fast' && <div className="absolute bottom-0 left-0 h-1 bg-violet-400 w-full"></div>}
                </button>
                <button
                    type="button"
                    onClick={() => setSearchMode('deep')}
                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${searchMode === 'deep' ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                >
                    <div className="flex items-center gap-2 mb-1 relative z-10">
                        <Eye size={16} className={searchMode === 'deep' ? 'text-emerald-600' : 'text-slate-400'} />
                        <span className={`text-xs font-bold ${searchMode === 'deep' ? 'text-emerald-900' : 'text-slate-600'}`}>{t('form.mode_deep')}</span>
                    </div>
                    {searchMode === 'deep' && <div className="absolute bottom-0 left-0 h-1 bg-emerald-400 w-full"></div>}
                </button>
            </div>
        </div>

        <Button 
          type="submit" 
          variant="primary" 
          className="w-full py-4 text-base shadow-violet-500/20 shadow-lg mt-4"
          isLoading={isLoading}
          icon={<Search size={20} />}
        >
          {t('form.submit')}
        </Button>
      </form>
    </Card>
  );
};

export default ProfileForm;

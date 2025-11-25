
import React, { useState, useEffect } from 'react';
import { ASBLProfile, Sector } from '../types';
import { enrichProfileFromNumber } from '../services/geminiService';
import { Button, Input, Select, Card, TextArea } from './ui/DesignSystem';
import { Search, Sparkles, Globe, MapPin, Building2, Wallet, Timer } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface ProfileFormProps {
  onSearch: (profile: ASBLProfile) => void;
  isLoading: boolean;
}

const COOLDOWN_SECONDS = 30;

const ProfileForm: React.FC<ProfileFormProps> = ({ onSearch, isLoading }) => {
  const { currentProfile, updateCurrentProfile } = useApp();
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  
  // Cooldown system to prevent API spam
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: number;
    if (cooldown > 0) {
      timer = window.setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  const handleChange = (field: keyof ASBLProfile, value: string) => {
    updateCurrentProfile({ [field]: value });
    if (field === 'enterpriseNumber') setEnrichError(null);
  };

  const handleAutoFill = async () => {
    if (cooldown > 0) return;

    if (!currentProfile.enterpriseNumber || currentProfile.enterpriseNumber.length < 3) {
        setEnrichError("Donne-moi un petit indice (nom ou numéro) !");
        return;
    }
    
    setIsEnriching(true);
    setEnrichError(null);

    try {
        const enrichedData = await enrichProfileFromNumber(currentProfile.enterpriseNumber);
        updateCurrentProfile(enrichedData);
        // Start cooldown only after a successful attempt to allow retries on network errors immediately if needed, 
        // OR start it always to be safer. Let's start it always to be safer on costs.
    } catch (err) {
        setEnrichError("Je n'ai pas réussi à trouver ta structure, désolée.");
    } finally {
        setIsEnriching(false);
        setCooldown(COOLDOWN_SECONDS); // Activate cooldown
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(currentProfile);
  };

  return (
    <Card className="border-t-4 border-t-violet-500 shadow-md">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="text-violet-600" size={24} />
          Parle-moi de ton projet
        </h2>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
          Pour que je puisse t'aider efficacement, j'ai besoin de mieux te connaître. Plus tu es précise, plus mes trouvailles seront pertinentes !
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Identity Section */}
        <div className="bg-violet-50/50 p-4 rounded-xl border border-violet-100 space-y-2">
           <div className="flex items-end gap-2">
              <Input 
                label="On commence par ton numéro BCE ou ton nom ?" 
                placeholder="ex: 0456.789.123"
                value={currentProfile.enterpriseNumber || ''}
                onChange={(e) => handleChange('enterpriseNumber', e.target.value)}
                error={enrichError || undefined}
                className="bg-white"
              />
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleAutoFill}
                isLoading={isEnriching}
                disabled={cooldown > 0}
                title={cooldown > 0 ? `Attendre ${cooldown}s` : "Laisse Charlotte chercher les infos"}
                className={`mb-[1px] border-violet-200 transition-colors w-14 flex justify-center ${cooldown > 0 ? 'bg-slate-100 text-slate-400' : 'text-violet-700 hover:bg-violet-100'}`}
              >
                {isEnriching ? (
                   <span className="opacity-0">.</span> // Loader handled by Button component
                ) : cooldown > 0 ? (
                   <span className="text-xs font-bold font-mono">{cooldown}</span>
                ) : (
                   <Sparkles size={18} className="text-violet-600" />
                )}
              </Button>
           </div>
           <p className="text-[11px] text-slate-500 flex items-start gap-1.5 pl-1">
             <Sparkles size={12} className="text-violet-500 shrink-0 mt-0.5"/>
             <span>Clique sur l'étincelle et je remplis le reste toute seule !</span>
           </p>
        </div>

        {/* Core Fields */}
        <Input 
          label="Quel est le nom officiel ?"
          required
          placeholder="Association Sans But Lucratif..."
          value={currentProfile.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
             label="Votre site web"
             leftIcon={<Globe size={16} />}
             placeholder="https://..."
             value={currentProfile.website || ''}
             onChange={(e) => handleChange('website', e.target.value)}
          />
          <Input 
             label="Où est votre siège ?"
             leftIcon={<MapPin size={16} />}
             required
             value={currentProfile.region}
             onChange={(e) => handleChange('region', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
            label="Quel est votre secteur ?"
            options={Object.values(Sector).map(s => ({ value: s, label: s }))}
            value={currentProfile.sector}
            onChange={(e) => handleChange('sector', e.target.value)}
          />
          <Select 
            label="Une idée du budget annuel ?"
            leftIcon={<Wallet size={16} />}
            options={[
                { value: "< 10k€", label: "Petit (< 10k€)" },
                { value: "10k€ - 50k€", label: "Moyen (10k€ - 50k€)" },
                { value: "50k€ - 200k€", label: "Confortable (50k€ - 200k€)" },
                { value: "> 200k€", label: "Grand (> 200k€)" },
            ]}
            value={currentProfile.budget}
            onChange={(e) => handleChange('budget', e.target.value)}
          />
        </div>

        <TextArea
          label="DIS-MOI TOUT SUR VOTRE MISSION"
          required
          rows={4}
          placeholder="Que faites-vous concrètement ? Qui aidez-vous ? Quels sont vos projets actuels qui ont besoin de financement ?"
          value={currentProfile.description}
          onChange={(e) => handleChange('description', e.target.value)}
        />

        <Button 
          type="submit" 
          variant="primary" 
          className="w-full py-4 text-base shadow-violet-500/20 shadow-lg"
          isLoading={isLoading}
          icon={<Search size={20} />}
        >
          C'est parti Charlotte, cherche pour moi !
        </Button>
      </form>
    </Card>
  );
};

export default ProfileForm;


export type Language = 'fr' | 'nl' | 'de' | 'ar';

export type SearchMode = 'fast' | 'deep';

export enum ProfileStatus {
  BASE = 'base',
  ENRICHED = 'enriched',
  ERROR = 'error'
}

export enum Sector {
  SOCIAL = 'Action Sociale',
  CULTURE = 'Culture & Arts',
  ENV = 'Environnement & Durable',
  SPORT = 'Sport & Loisirs',
  EDUCATION = 'Éducation & Jeunesse',
  HEALTH = 'Santé & Bien-être',
  TECH = 'Technologie & Numérique',
  INTL = 'Aide Internationale (Humanitaire)',
  ANIMAL = 'Bien-être Animal',
  CIVIC = 'Citoyenneté & Démocratie',
  ECONOMY = 'Économie Sociale & Emploi',
  HOUSING = 'Logement & Habitat',
  HERITAGE = 'Patrimoine & Histoire',
  SCIENCE = 'Recherche & Science',
  JUSTICE = 'Justice & Droits',
  OTHER = 'Autre'
}

export interface ASBLProfile {
  enterpriseNumber?: string;
  name: string;
  website?: string;
  sector: Sector;
  region: string;
  description: string;
  budget: string;
  searchMode?: SearchMode;
  status?: ProfileStatus;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface GrantOpportunity {
  title: string;
  provider: string;
  deadline: string; // Human readable string for display
  deadlineDate?: string; // ISO 8601 YYYY-MM-DD for reliable sorting
  relevanceScore: number; // 0 to 100
  relevanceReason: string;
  type: 'Subvention' | 'Appel à projets' | 'Mécénat' | 'Autre';
  url?: string; // Optional direct link if found
}

export interface SearchResult {
  executiveSummary: string;
  opportunities: GrantOpportunity[];
  strategicAdvice: string;
  sources: GroundingChunk[];
  timestamp: string;
  profileName?: string;
}

export interface HistoryItem extends SearchResult {
  id: string;
}

export type AgentStatus = 'idle' | 'searching' | 'analyzing' | 'complete' | 'error';

export interface AgentState {
  status: AgentStatus;
  message: string;
}

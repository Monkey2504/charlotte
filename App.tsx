
import React, { useState, useEffect, useRef, createContext, useContext, useCallback, ReactNode } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, History as HistoryIcon, Sparkles, Menu, X, Activity, 
  Search, Globe, MapPin, Building2, Wallet, AlertCircle, Zap, Eye,
  ExternalLink, Calendar, ShieldCheck, Trophy, Lightbulb, Target, TrendingUp, Download, Dices,
  Loader2, CheckCircle2, AlertTriangle, Trash2
} from 'lucide-react';

// ==========================================
// 1. UTILS & CONFIG
// ==========================================

/**
 * Utilitaire pour combiner les noms de classes conditionnellement.
 */
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Fonction utilitaire pour récupérer les variables d'environnement
const getEnv = () => {
  const envs: any = {};
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      Object.assign(envs, import.meta.env);
    }
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env) {
      Object.assign(envs, process.env);
    }
  } catch (e) {}
  return envs;
};

const ENV = getEnv();

const CONFIG = {
  API_KEY: ENV.VITE_API_KEY || ENV.API_KEY || ENV.REACT_APP_API_KEY || ENV.NEXT_PUBLIC_API_KEY || "",
  MODEL_ID: "gemini-2.5-flash",
  TIMEOUT_MS: 300000, 
  MAX_HISTORY_ITEMS: 50,
};

// ==========================================
// 2. TYPES
// ==========================================

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
  deadline: string;
  deadlineDate?: string;
  relevanceScore: number;
  relevanceReason: string;
  type: 'Subvention' | 'Appel à projets' | 'Mécénat' | 'Autre';
  url?: string;
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

// ==========================================
// 3. I18N
// ==========================================

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  fr: {
    'app.title': 'Charlotte AI',
    'app.subtitle': 'Ton alliée financement',
    'nav.dashboard': 'Mon bureau',
    'nav.history': 'Mes souvenirs',
    'nav.association': 'Association',
    'nav.connected': 'Connecté·e',
    'nav.requests': 'recherches',
    'form.title': 'Parle-moi de ton projet',
    'form.subtitle': 'Pour que je puisse t\'aider efficacement, j\'ai besoin de mieux te connaître. Plus tu es précis·e, plus mes trouvailles seront pertinentes !',
    'form.btn_example': '✨ Exemple',
    'form.type_entity': 'Structure existante (ASBL/Entreprise)',
    'form.type_individual': 'Porteur·se de projet / Particulier',
    'form.individual_warning': '⚠️ Attention : Charlotte est optimisée pour les structures enregistrées. Pour un·e particulier·ère, les aides trouvées seront plus limitées.',
    'form.identity_label_entity': 'Numéro d\'entreprise (BCE) ou Nom officiel',
    'form.identity_label_individual': 'Ton Nom et Prénom',
    'form.autofill_btn': 'Laisse Charlotte chercher',
    'form.autofill_hint': 'Clique sur l\'étincelle et je remplis le reste toute seule !',
    'form.autofill_error': 'Je n\'ai pas réussi à trouver ta structure, désolée.',
    'form.autofill_empty': 'Donne-moi un petit indice (nom ou numéro) !',
    'form.name_label': 'Quel est le nom officiel ?',
    'form.website_label': 'Ton site web',
    'form.region_label': 'Où est ton siège ?',
    'form.sector_label': 'Quel est ton secteur ?',
    'form.budget_label': 'Une idée du budget annuel ?',
    'form.desc_label': 'DIS-MOI TOUT SUR TA MISSION',
    'form.desc_placeholder': 'Que faites-vous concrètement ? Qui aidez-vous ? Quels sont vos projets actuels qui ont besoin de financement ?',
    'form.submit': 'C\'est parti Charlotte, cherche pour moi !',
    'form.mode_fast': '⚡ Éclair (Rapide)',
    'form.mode_deep': '🕵️ Audit Approfondi (Recommandé)',
    'results.loading_title': 'Je travaille...',
    'results.error_title': 'Oups !',
    'results.empty_title': 'Coucou, moi c\'est Charlotte !',
    'results.empty_desc': 'Je suis ton assistante personnelle dédiée au financement. Remplis le formulaire à gauche, et je pars immédiatement à la chasse aux opportunités pour toi.',
    'results.btn_demo': '🎲 Essayer une démo',
    'results.benefit_sort': 'Je trie',
    'results.benefit_sort_desc': 'Je ne te montre que ce qui est vraiment utile pour TON projet.',
    'results.benefit_find': 'Je déniche',
    'results.benefit_find_desc': 'Je scanne le local, le régional et le fédéral pour ne rien rater.',
    'results.benefit_advise': 'Je te conseille',
    'results.benefit_advise_desc': 'Je te dis exactement pourquoi je pense que ça va marcher.',
    'results.preview_title': 'Voilà ce que je vais te préparer',
    'results.cta': 'Dis-moi ce que tu cherches, je m\'occupe de tout !',
    'results.found_title': 'Voici mes trouvailles',
    'results.found_pistes': 'pistes',
    'results.found_date': 'Mes recherches du',
    'results.sort_relevance': 'Mes coups de cœur',
    'results.sort_deadline': 'Les plus urgents',
    'results.summary_title': 'Mon résumé pour toi',
    'results.advice_title': 'Mon conseil d\'amie',
    'results.download_advice': 'Télécharger mon conseil',
    'results.sources_title': 'Où j\'ai trouvé ça',
    'results.sources_empty': 'Je n\'ai pas de lien direct, mais Google est aussi ton allié !',
    'results.disclaimer': 'Je fais de mon mieux pour t\'aider, mais vérifie toujours les détails officiels, d\'accord ?',
    'results.card_deadline': 'Deadline :',
    'results.card_details': 'Détails',
    'results.card_score': 'Mon feeling',
    'history.title': 'Historique des Recherches',
    'history.clear': 'Effacer',
    'history.empty_title': 'Aucun historique',
    'history.empty_desc': 'Vos recherches passées apparaîtront ici.',
    'history.synthesis': 'Synthèse',
    'history.opportunities': 'opportunités',
    'history.sources': 'sources',
    'history.others': 'autres',
  },
  nl: {
    'app.title': 'Charlotte AI',
    'app.subtitle': 'Jouw financieringspartner',
    'nav.dashboard': 'Mijn kantoor',
    'nav.history': 'Mijn herinneringen',
    'nav.association': 'Vereniging',
    'nav.connected': 'Verbonden',
    'nav.requests': 'zoekopdrachten',
    'form.title': 'Vertel me over je project',
    'form.subtitle': 'Om je goed te kunnen helpen, moet ik je beter leren kennen. Hoe preciezer je bent, hoe relevanter mijn vondsten!',
    'form.btn_example': '✨ Voorbeeld',
    'form.type_entity': 'Bestaande structuur (VZW/Bedrijf)',
    'form.type_individual': 'Projectdrager / Particulier',
    'form.individual_warning': '⚠️ Let op: Charlotte is geoptimaliseerd voor geregistreerde structuren. Voor particulieren zijn de resultaten beperkter.',
    'form.identity_label_entity': 'Ondernemingsnummer (KBO) of officiële naam',
    'form.identity_label_individual': 'Je naam en voornaam',
    'form.autofill_btn': 'Laat Charlotte zoeken',
    'form.autofill_hint': 'Klik op de vonk en ik vul de rest zelf in!',
    'form.autofill_error': 'Ik heb je structuur helaas niet kunnen vinden.',
    'form.autofill_empty': 'Geef me een kleine hint (naam of nummer)!',
    'form.name_label': 'Wat is de officiële naam?',
    'form.website_label': 'Je website',
    'form.region_label': 'Waar is je zetel?',
    'form.sector_label': 'Wat is je sector?',
    'form.budget_label': 'Idee van het jaarbudget?',
    'form.desc_label': 'VERTEL ME ALLES OVER JE MISSIE',
    'form.desc_placeholder': 'Wat doen jullie concreet? Wie helpen jullie? Welke projecten hebben nu financiering nodig?',
    'form.submit': 'Kom op Charlotte, zoek voor mij!',
    'form.mode_fast': '⚡ Snelle Scan',
    'form.mode_deep': '🕵️ Diepe Audit (Aanbevolen)',
    'results.loading_title': 'Ik ben aan het werk...',
    'results.error_title': 'Oeps!',
    'results.empty_title': 'Hallo, ik ben Charlotte!',
    'results.empty_desc': 'Ik ben je persoonlijke assistente voor financiering. Vul het formulier links in en ik ga meteen op jacht naar kansen voor jou.',
    'results.btn_demo': '🎲 Bekijk voorbeeld',
    'results.benefit_sort': 'Ik sorteer',
    'results.benefit_sort_desc': 'Ik toon je alleen wat écht nuttig is voor JOUW project.',
    'results.benefit_find': 'Ik spoor op',
    'results.benefit_find_desc': 'Ik scan lokaal, regionaal en federaal om niets te missen.',
    'results.benefit_advise': 'Ik adviseer',
    'results.benefit_advise_desc': 'Ik vertel je precies waarom ik denk dat het zal werken.',
    'results.preview_title': 'Dit ga ik voor je voorbereiden',
    'results.cta': 'Vertel me wat je zoekt, ik regel de rest!',
    'results.found_title': 'Dit heb ik gevonden',
    'results.found_pistes': 'pistes',
    'results.found_date': 'Mijn zoekopdrachten van',
    'results.sort_relevance': 'Mijn favorieten',
    'results.sort_deadline': 'Dringendste',
    'results.summary_title': 'Mijn samenvatting voor jou',
    'results.advice_title': 'Mijn vriendinnenadvies',
    'results.download_advice': 'Advies downloaden',
    'results.sources_title': 'Waar ik dit vond',
    'results.sources_empty': 'Geen directe link, maar Google is ook jouw vriend!',
    'results.disclaimer': 'Ik doe mijn best om te helpen, maar check altijd de officiële details, oké?',
    'results.card_deadline': 'Deadline:',
    'results.card_details': 'Details',
    'results.card_score': 'Mijn gevoel',
    'history.title': 'Zoekgeschiedenis',
    'history.clear': 'Wissen',
    'history.empty_title': 'Geen geschiedenis',
    'history.empty_desc': 'Je eerdere zoekopdrachten verschijnen hier.',
    'history.synthesis': 'Synthese',
    'history.opportunities': 'kansen',
    'history.sources': 'bronnen',
    'history.others': 'andere',
  },
  de: {
    'app.title': 'Charlotte AI',
    'app.subtitle': 'Deine Finanzierungs-Alliierte',
    'nav.dashboard': 'Mein Büro',
    'nav.history': 'Meine Erinnerungen',
    'nav.association': 'Verein',
    'nav.connected': 'Verbunden',
    'nav.requests': 'Suchanfragen',
    'form.title': 'Erzähl mir von deinem Projekt',
    'form.subtitle': 'Um dir effektiv helfen zu können, muss ich dich besser kennenlernen. Je genauer du bist, desto relevanter meine Funde!',
    'form.btn_example': '✨ Beispiel',
    'form.type_entity': 'Bestehende Struktur (Vb/Unternehmen)',
    'form.type_individual': 'Projektträger / Einzelperson',
    'form.individual_warning': '⚠️ Achtung: Charlotte ist für registrierte Strukturen optimiert. Für Einzelpersonen sind die Ergebnisse begrenzter.',
    'form.identity_label_entity': 'Unternehmensnummer (ZDE) oder offizieller Name',
    'form.identity_label_individual': 'Dein Vor- und Nachname',
    'form.autofill_btn': 'Lass Charlotte suchen',
    'form.autofill_hint': 'Klick auf den Funken und ich fülle den Rest alleine aus!',
    'form.autofill_error': 'Ich konnte deine Struktur leider nicht finden.',
    'form.autofill_empty': 'Gib mir einen kleinen Hinweis (Name oder Nummer)!',
    'form.name_label': 'Wie lautet der offizielle Name?',
    'form.website_label': 'Deine Webseite',
    'form.region_label': 'Wo ist dein Sitz?',
    'form.sector_label': 'Was ist dein Sektor?',
    'form.budget_label': 'Idee vom Jahresbudget?',
    'form.desc_label': 'ERZÄHL MIR ALLES ÜBER DEINE MISSION',
    'form.desc_placeholder': 'Was macht ihr konkret? Wem helft ihr? Welche aktuellen Projekte brauchen Finanzierung?',
    'form.submit': 'Los Charlotte, such für mich!',
    'form.mode_fast': '⚡ Blitzsuche',
    'form.mode_deep': '🕵️ Tiefenprüfung (Empfohlen)',
    'results.loading_title': 'Ich arbeite...',
    'results.error_title': 'Hoppla!',
    'results.empty_title': 'Hallo, ich bin Charlotte!',
    'results.empty_desc': 'Ich bin deine persönliche Finanzierungsassistentin. Fülle das Formular links aus und ich gehe sofort auf Chancenjagd für dich.',
    'results.btn_demo': '🎲 Beispiel ansehen',
    'results.benefit_sort': 'Ich sortiere',
    'results.benefit_sort_desc': 'Ich zeige dir nur, was für DEIN Projekt wirklich nützlich ist.',
    'results.benefit_find': 'Ich stöbere auf',
    'results.benefit_find_desc': 'Ich scanne lokal, regionaal und föderal, um nichts zu verpassen.',
    'results.benefit_advise': 'Ich berate',
    'results.benefit_advise_desc': 'Ich sage dir genau, warum ich denke, dass es klappen wird.',
    'results.preview_title': 'Das bereite ich für dich vor',
    'results.cta': 'Sag mir was du suchst, ich kümmere mich um alles!',
    'results.found_title': 'Meine Fundstücke',
    'results.found_pistes': 'Pisten',
    'results.found_date': 'Meine Suche vom',
    'results.sort_relevance': 'Meine Favoriten',
    'results.sort_deadline': 'Am dringendsten',
    'results.summary_title': 'Meine Zusammenfassung für dich',
    'results.advice_title': 'Mein Rat als Freundin',
    'results.download_advice': 'Ratschlag herunterladen',
    'results.sources_title': 'Wo ich das gefunden habe',
    'results.sources_empty': 'Kein direkter Link, aber Google ist auch dein Freund!',
    'results.disclaimer': 'Ich tue mein Bestes, aber überprüfe immer die offiziellen Details, okay?',
    'results.card_deadline': 'Frist:',
    'results.card_details': 'Details',
    'results.card_score': 'Mein Gefühl',
    'history.title': 'Suchverlauf',
    'history.clear': 'Löschen',
    'history.empty_title': 'Kein Verlauf',
    'history.empty_desc': 'Deine vergangenen Suchen erscheinen hier.',
    'history.synthesis': 'Synthese',
    'history.opportunities': 'Chancen',
    'history.sources': 'Quellen',
    'history.others': 'andere',
  },
  ar: {
    'app.title': 'شارلوت AI',
    'app.subtitle': 'حليفك في التمويل',
    'nav.dashboard': 'مكتبي',
    'nav.history': 'ذكرياتي',
    'nav.association': 'الجمعية',
    'nav.connected': 'متصل',
    'nav.requests': 'عمليات البحث',
    'form.title': 'أخبريني عن مشروعك',
    'form.subtitle': 'لكي أساعدك بفعالية، أحتاج لمعرفتك بشكل أفضل. كلما كنتِ دقيقة، كانت النتائج أكثر صلة!',
    'form.btn_example': '✨ مثال',
    'form.type_entity': 'هيكل قائم (جمعية/شركة)',
    'form.type_individual': 'حامل المشروع / فرد',
    'form.individual_warning': '⚠️ تنبيه: تم تحسين شارلوت للهياكل المسجلة. بالنسبة للأفراد، قد تكون النتائج محدودة.',
    'form.identity_label_entity': 'رقم المؤسسة أو الاسم الرسمي',
    'form.identity_label_individual': 'اسمك الكامل',
    'form.autofill_btn': 'دعي شارلوت تبحث',
    'form.autofill_hint': 'اضغطي على الشرارة وسأملأ الباقي بنفسي!',
    'form.autofill_error': 'لم أتمكن من العثور على مؤسستك، آسفة.',
    'form.autofill_empty': 'أعطيني تلميحاً صغيراً (الاسم أو الرقم)!',
    'form.name_label': 'ما هو الاسم الرسمي؟',
    'form.website_label': 'موقعك الإلكتروني',
    'form.region_label': 'أين يقع مقركم؟',
    'form.sector_label': 'ما هو قطاعكم؟',
    'form.budget_label': 'فكرة عن الميزانية السنوية؟',
    'form.desc_label': 'أخبريني كل شيء عن مهمتكم',
    'form.desc_placeholder': 'ماذا تفعلون بالتحديد؟ من تساعدون؟ ما هي مشاريعكم الحالية التي تحتاج لتمويل؟',
    'form.submit': 'انطلقي يا شارلوت، ابحثي لي!',
    'form.mode_fast': '⚡ بحث سريع',
    'form.mode_deep': '🕵️ تدقيق شامل (موصى به)',
    'results.loading_title': 'أنا أعمل...',
    'results.error_title': 'عفواً!',
    'results.empty_title': 'مرحباً، أنا شارلوت!',
    'results.empty_desc': 'أنا مساعدتك الشخصية المخصصة للتمويل. املئي النموذج على اليسار، وسأبدأ فوراً في صيد الفرص لك.',
    'results.btn_demo': '🎲 عرض مثال',
    'results.benefit_sort': 'أنا أرتب',
    'results.benefit_sort_desc': 'لا أعرض لك إلا ما هو مفيد حقاً لمشروعك.',
    'results.benefit_find': 'أنا أكتشف',
    'results.benefit_find_desc': 'أقوم بمسح شامل محلياً، إقليمياً وفيدرالياً حتى لا يفوتنا شيء.',
    'results.benefit_advise': 'أنا أنصح',
    'results.benefit_advise_desc': 'أخبرك بالضبط لماذا أعتقد أن هذا سينجح.',
    'results.preview_title': 'هذا ما سأحضره لك',
    'results.cta': 'قولي لي ما تبحثين عنه، وأنا سأتولى الباقي!',
    'results.found_title': 'إليك ما وجدته',
    'results.found_pistes': 'فرص',
    'results.found_date': 'أبحاثي بتاريخ',
    'results.sort_relevance': 'المفضلة لدي',
    'results.sort_deadline': 'الأكثر إلحاحاً',
    'results.summary_title': 'ملخصي لك',
    'results.advice_title': 'نصيحتي لك كصديقة',
    'results.download_advice': 'تحميل النصيحة',
    'results.sources_title': 'أين وجدت هذا',
    'results.sources_empty': 'لا يوجد رابط مباشر، لكن جوجل صديقك أيضاً!',
    'results.disclaimer': 'أبذل قصارى جهدي لمساعدتك، لكن تحققي دائماً من التفاصيل الرسمية، حسناً؟',
    'results.card_deadline': 'الموعد النهائي:',
    'results.card_details': 'التفاصيل',
    'results.card_score': 'شعوري',
    'history.title': 'سجل البحث',
    'history.clear': 'مسح',
    'history.empty_title': 'لا يوجد سجل',
    'history.empty_desc': 'ستظهر أبحاثك السابقة هنا.',
    'history.synthesis': 'الخلاصة',
    'history.opportunities': 'فرص',
    'history.sources': 'مصادر',
    'history.others': 'أخرى',
  }
};

// ==========================================
// 4. SERVICES
// ==========================================

const STORAGE_KEYS = {
  HISTORY: 'charlotte_search_history',
  PROFILE_DRAFT: 'charlotte_current_profile_draft',
  ENRICHMENT_CACHE: 'charlotte_enrichment_cache',
  REQUEST_COUNT: 'charlotte_request_count'
};

const persistenceService = {
  async getHistory(): Promise<HistoryItem[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },
  async saveHistory(items: HistoryItem[]): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(items));
    } catch (e) {}
  },
  async getProfileDraft(): Promise<Partial<ASBLProfile> | null> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROFILE_DRAFT);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  },
  async saveProfileDraft(profile: Partial<ASBLProfile>): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE_DRAFT, JSON.stringify(profile));
    } catch (e) {}
  },
  async getEnrichmentCache(): Promise<Map<string, Partial<ASBLProfile>>> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ENRICHMENT_CACHE);
      if (!stored) return new Map();
      const obj = JSON.parse(stored);
      return new Map(Object.entries(obj));
    } catch (e) {
      return new Map();
    }
  },
  async saveEnrichmentCache(cache: Map<string, Partial<ASBLProfile>>): Promise<void> {
    try {
      const obj = Object.fromEntries(cache);
      localStorage.setItem(STORAGE_KEYS.ENRICHMENT_CACHE, JSON.stringify(obj));
    } catch (e) {}
  },
  async getRequestCount(): Promise<number> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.REQUEST_COUNT);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  },
  async saveRequestCount(count: number): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.REQUEST_COUNT, count.toString());
    } catch (e) {}
  }
};

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// GEMINI SERVICE
const THOUGHTS: Record<Language, Record<string, string>> = {
  fr: {
    analyze: "J'analyse ton profil et ton secteur...",
    search_start_fast: "⚡ Recherche Éclair (Focus Portails Officiels)...",
    search_start_deep: "🕵️ Investigation 360° (Presse, Fondations, Monitor)...",
    filtering: "Je filtre les sources non officielles et les dates dépassées...",
    audit_start: "Je soumets le rapport à la Challengeuse pour validation...",
    audit_refine: "La Challengeuse a des remarques : j'affine mes requêtes...",
    audit_ok: "Audit validé ! Je prépare le rapport final...",
    finalizing: "Mise en forme de la synthèse..."
  },
  nl: {
    analyze: "Ik analyseer je profiel en sector...",
    search_start_fast: "⚡ Snelle scan (Officiële portalen)...",
    search_start_deep: "🕵️ 360° Onderzoek (Pers, Stichtingen)...",
    filtering: "Ik filter onofficiële bronnen en verstreken deadlines...",
    audit_start: "Kwaliteitscontrole door de Challenger...",
    audit_refine: "De Challenger heeft opmerkingen, ik verfijn mijn resultaten...",
    audit_ok: "Audit goedgekeurd! Ik maak het eindrapport op...",
    finalizing: "Synthese opmaken..."
  },
  de: {
    analyze: "Ich analysiere dein Profil und deinen Sektor...",
    search_start_fast: "⚡ Blitzsuche (Offizielle Portale)...",
    search_start_deep: "🕵️ 360° Untersuchung (Presse, Stiftungen)...",
    filtering: "Ich filtere inoffizielle Quellen...",
    audit_start: "Qualitätskontrolle durch den Challenger...",
    audit_refine: "Der Challenger hat Anmerkungen...",
    audit_ok: "Audit genehmigt! Ich erstelle den Abschlussbericht...",
    finalizing: "Zusammenfassung formatieren..."
  },
  ar: {
    analyze: "أقوم بتحليل ملفك الشخصي وقطاعك...",
    search_start_fast: "⚡ بحث سريع (البوابات الرسمية)...",
    search_start_deep: "🕵️ تحقيق شامل (الصحافة، المؤسسات)...",
    filtering: "أقوم بتصفية المصادر غير الرسمية...",
    audit_start: "أرسل التقرير إلى المدقق...",
    audit_refine: "لدى المدقق ملاحظات، أقوم بالتحسين...",
    audit_ok: "تمت الموافقة! إعداد التقرير النهائي...",
    finalizing: "تنسيق الخلاصة..."
  }
};

const apiKey = CONFIG.API_KEY || ""; 
const MODEL_NAME = 'gemini-2.5-flash-preview-09-2025'; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

const cleanAndParseJson = (text: string): any => {
  if (!text) return {};
  let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const tryParse = (str: string): any | null => {
    try {
      const fixed = str.replace(/\*\*([a-zA-Z0-9_]+)\*\*:/g, '"$1":');
      return JSON.parse(fixed);
    } catch (e) {
      return null;
    }
  };
  const firstCurly = cleaned.indexOf("{");
  const lastCurly = cleaned.lastIndexOf("}");
  if (firstCurly !== -1 && lastCurly > firstCurly) {
    const potentialObj = cleaned.substring(firstCurly, lastCurly + 1);
    const result = tryParse(potentialObj);
    if (result) return result;
  }
  const firstSquare = cleaned.indexOf("[");
  const lastSquare = cleaned.lastIndexOf("]");
  if (firstSquare !== -1 && lastSquare > firstSquare) {
    const potentialArr = cleaned.substring(firstSquare, lastSquare + 1);
    const contentInside = potentialArr.slice(1, -1).trim();
    if (!contentInside.toLowerCase().startsWith('http')) {
      const result = tryParse(potentialArr);
      if (result && Array.isArray(result)) {
        if (result.length > 0 && result[0].opportunities) return result[0];
        return { opportunities: result };
      }
    }
  }
  return {};
};

const normalizeProfileData = (raw: any): Partial<ASBLProfile> => {
  const data = raw || {};
  const normalized: Partial<ASBLProfile> = {};
  if (typeof data.name === "string") normalized.name = data.name;
  if (typeof data.website === "string") normalized.website = data.website;
  if (typeof data.region === "string") normalized.region = data.region;
  if (typeof data.description === "string") normalized.description = data.description;
  const validSectors = Object.values(Sector) as string[];
  if (typeof data.sector === "string" && validSectors.includes(data.sector)) {
    normalized.sector = data.sector as Sector;
  } else {
    normalized.sector = Sector.OTHER;
  }
  return normalized;
};

class GeminiService {
  private async callApi(payload: any, maxRetries = 3): Promise<any> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const errorDetails = await response.text();
          if (response.status === 429 || response.status >= 400) {
            throw new Error(`Erreur API critique (${response.status}): ${errorDetails}`);
          }
          throw new Error(`Échec de la requête API: ${response.statusText}`);
        }
        return await response.json();
      } catch (error: any) {
        if (attempt === maxRetries - 1) throw error;
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async enrichProfileFromNumber(enterpriseNumber: string, language: Language = "fr"): Promise<Partial<ASBLProfile>> {
    const cleanNumber = enterpriseNumber.trim();
    const cacheKey = cleanNumber;
    try {
      const cache = await persistenceService.getEnrichmentCache();
      if (cache.has(cacheKey)) return cache.get(cacheKey)!;
    } catch (e) { }
    
    const prompt = `
      CONTEXT: User is searching for a Belgian Non-Profit (ASBL/VZW) or Company.
      QUERY: "${cleanNumber}"
      TASK: Search for this entity in Belgium (BCE/KBO/Staatsblad/Companyweb). 
      Identify: Official Name, Sector, Region, Description, Website.
      OUTPUT FORMAT: JSON Only.
      { "name": "...", "website": "...", "region": "...", "description": "...", "sector": "..." }
    `;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ "google_search": {} }],
      generationConfig: { responseMimeType: "application/json" }
    };

    try {
      const resp = await this.callApi(payload);
      const rawText = resp.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Réponse vide");
      const normalized = normalizeProfileData(cleanAndParseJson(rawText));
      if (normalized.name) {
        try {
          const cache = await persistenceService.getEnrichmentCache();
          cache.set(cacheKey, normalized);
          await persistenceService.saveEnrichmentCache(cache);
        } catch (e) { }
      }
      return normalized;
    } catch (err: any) {
      return {
        enterpriseNumber: cleanNumber,
        name: 'ASBL NON ENRICHIE',
        website: 'Non disponible',
        region: 'Non défini',
        description: 'L\'enrichissement IA a échoué.',
        sector: Sector.OTHER,
        status: ProfileStatus.BASE,
      } as Partial<ASBLProfile>; 
    }
  }

  async searchAndRefineGrants(
    profile: ASBLProfile, 
    language: Language = "fr",
    onThought?: (thought: string) => void
  ): Promise<SearchResult> {
    if (onThought) onThought(THOUGHTS[language].analyze);
    await new Promise(r => setTimeout(r, 500));
    if (onThought) onThought(THOUGHTS[language].search_start_deep);
    await new Promise(r => setTimeout(r, 1000));
    if (onThought) onThought(THOUGHTS[language].audit_ok);
    await new Promise(r => setTimeout(r, 500));
    if (onThought) onThought(THOUGHTS[language].finalizing);
    
    const mockResult = {
      executiveSummary: "Simulation: Recherche de subsides limitée (Mode Demo / API Restreinte).",
      opportunities: [
        { title: "Opportunité de Simulation", provider: "Source de test", deadline: "31 Décembre 2025", deadlineDate: "2025-12-31", relevanceScore: 80, relevanceReason: "Ceci est un résultat simulé.", type: "Subvention", url: "" }
      ],
      strategicAdvice: "Le service fonctionne en mode dégradé.",
      sources: [],
      timestamp: new Date().toISOString(),
      profileName: profile.name
    } as SearchResult;
    
    return mockResult;
  }
}

const geminiService = new GeminiService();

// ==========================================
// 5. CONTEXTS
// ==========================================

// Language Context
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('fr');
  const isRTL = language === 'ar';
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);
  const t = (key: string): string => TRANSLATIONS[language][key] || key;
  return <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>{children}</LanguageContext.Provider>;
};
const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage error');
  return context;
};

// App Context
interface AppContextType {
  history: HistoryItem[];
  addToHistory: (result: SearchResult) => void;
  clearHistory: () => void;
  currentProfile: ASBLProfile;
  updateCurrentProfile: (updates: Partial<ASBLProfile>) => void;
  requestCount: number;
}
const AppContext = createContext<AppContextType | undefined>(undefined);
const DEFAULT_PROFILE: ASBLProfile = {
  enterpriseNumber: '',
  name: '',
  website: '',
  sector: Sector.SOCIAL,
  region: 'Belgique (Fédéral)',
  description: '',
  budget: '< 50k€'
};
const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentProfile, setCurrentProfile] = useState<ASBLProfile>(DEFAULT_PROFILE);
  const [requestCount, setRequestCount] = useState<number>(350); 
  useEffect(() => {
    const initData = async () => {
      const storedHistory = await persistenceService.getHistory();
      if (storedHistory.length > 0) setHistory(storedHistory);
      const storedProfile = await persistenceService.getProfileDraft();
      if (storedProfile) setCurrentProfile({ ...DEFAULT_PROFILE, ...storedProfile });
      const storedCount = await persistenceService.getRequestCount();
      setRequestCount(storedCount > 350 ? storedCount : 350); 
    };
    initData();
    const interval = setInterval(() => {
      setRequestCount(prev => {
        const shouldIncrement = Math.random() > 0.7;
        return shouldIncrement ? prev + 1 : prev;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  const addToHistory = (result: SearchResult) => {
    const newItem: HistoryItem = { ...result, id: generateUUID() };
    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 50);
      persistenceService.saveHistory(updated);
      return updated;
    });
    setRequestCount(prev => {
      const newCount = prev + 1;
      persistenceService.saveRequestCount(newCount);
      return newCount;
    });
  };
  const clearHistory = () => {
    setHistory([]);
    persistenceService.saveHistory([]);
  };
  const updateCurrentProfile = (updates: Partial<ASBLProfile>) => {
    setCurrentProfile(prev => {
      const updated = { ...prev, ...updates };
      persistenceService.saveProfileDraft(updated);
      return updated;
    });
  };
  return (
    <AppContext.Provider value={{ history, addToHistory, clearHistory, currentProfile, updateCurrentProfile, requestCount }}>
      {children}
    </AppContext.Provider>
  );
};
const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp error');
  return context;
};

// ==========================================
// 6. HOOKS
// ==========================================

const useScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalStyle; };
  }, [isLocked]);
};

const useGrantSearch = () => {
  const { addToHistory } = useApp();
  const { language, t } = useLanguage();
  const [state, setState] = useState<AgentState>({ status: 'idle', message: '' });
  const [currentResult, setCurrentResult] = useState<SearchResult | null>(null);
  const [thoughts, setThoughts] = useState<string[]>([]);

  const performSearch = useCallback(async (profile: ASBLProfile) => {
    setState({ status: 'searching', message: t('results.loading_title') });
    setCurrentResult(null);
    setThoughts([]);
    try {
      const data = await geminiService.searchAndRefineGrants(profile, language, (thought) => {
        setThoughts(prev => [...prev, thought]);
      });
      await new Promise(resolve => setTimeout(resolve, 1500));
      const resultWithMeta = { ...data, profileName: profile.name };
      setCurrentResult(resultWithMeta);
      addToHistory(resultWithMeta);
      setState({ status: 'complete', message: 'OK' });
    } catch (error: any) {
      setState({ status: 'error', message: error.message || 'Error' });
    }
  }, [addToHistory, language, t]);

  return { state, currentResult, performSearch, thoughts };
};

// ==========================================
// 7. UI COMPONENTS
// ==========================================

// Button
const BUTTON_VARIANTS = {
  primary: "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/40 focus:ring-violet-500 border border-transparent",
  secondary: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm focus:ring-slate-400",
  ghost: "bg-transparent hover:bg-violet-50 text-slate-600 hover:text-violet-700 focus:ring-violet-300",
  outline: "bg-transparent border-2 border-violet-100 text-violet-600 hover:border-violet-200 hover:bg-violet-50 focus:ring-violet-500"
};
const BUTTON_BASE_STYLES = "inline-flex items-center justify-center px-5 py-3 rounded-2xl font-semibold transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed text-sm";
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof BUTTON_VARIANTS;
  isLoading?: boolean;
  icon?: React.ReactNode;
}
const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', isLoading, icon, className = '', disabled, ...props }) => {
  return (
    <button className={cn(BUTTON_BASE_STYLES, BUTTON_VARIANTS[variant], className)} disabled={disabled || isLoading} {...props}>
      {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}
const Input: React.FC<InputProps> = ({ label, error, leftIcon, className = '', ...props }) => {
  return (
    <div className="w-full group">
      {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1 transition-colors group-focus-within:text-violet-600">{label}</label>}
      <div className="relative">
        {leftIcon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-violet-500">{leftIcon}</div>}
        <input className={cn(
          "w-full bg-slate-50 border-transparent focus:bg-white text-slate-800 text-sm rounded-xl py-3 outline-none transition-all duration-200 shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 placeholder:text-slate-400",
          error ? "ring-red-300 focus:ring-red-500 bg-red-50/50" : "hover:bg-white",
          leftIcon ? "pl-11 pr-4" : "px-4",
          className
        )} {...props} />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500 ml-1 font-medium flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span>{error}</p>}
    </div>
  );
};

// TextArea
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
const TextArea: React.FC<TextAreaProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full group">
      {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1 transition-colors group-focus-within:text-violet-600">{label}</label>}
      <textarea className={cn(
        "w-full bg-slate-50 border-transparent focus:bg-white text-slate-800 text-sm rounded-xl py-3 px-4 outline-none transition-all duration-200 shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 resize-none leading-relaxed placeholder:text-slate-400",
        error ? "ring-red-300 focus:ring-red-500 bg-red-50/50" : "hover:bg-white",
        className
      )} {...props} />
      {error && <p className="mt-1.5 text-xs text-red-500 ml-1 font-medium">{error}</p>}
    </div>
  );
};

// Select
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  leftIcon?: React.ReactNode;
  options: { value: string; label: string }[];
}
const Select: React.FC<SelectProps> = ({ label, leftIcon, options, className = '', ...props }) => {
  return (
    <div className="w-full group">
      {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1 transition-colors group-focus-within:text-violet-600">{label}</label>}
      <div className="relative">
        {leftIcon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-violet-500">{leftIcon}</div>}
        <select className={cn(
          "w-full bg-slate-50 border-transparent focus:bg-white text-slate-800 text-sm rounded-xl py-3 outline-none transition-all duration-200 shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 appearance-none cursor-pointer hover:bg-white",
          leftIcon ? "pl-11 pr-10" : "px-4 pr-10",
          className
        )} {...props}>
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
    </div>
  );
};

// Card
const Card: React.FC<{ children: React.ReactNode; className?: string; title?: React.ReactNode; action?: React.ReactNode }> = ({ children, className = '', title, action }) => (
  <div className={cn("bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-white/20 ring-1 ring-slate-100", className)}>
    {(title || action) && (
      <div className="px-6 py-5 border-b border-slate-50/80 bg-slate-50/30 rounded-t-3xl backdrop-blur-sm flex justify-between items-center gap-4">
        {title && <h3 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h3>}
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

// Badge
const BADGE_VARIANTS = {
  success: 'bg-emerald-100/50 text-emerald-700 ring-1 ring-emerald-200/50',
  warning: 'bg-amber-100/50 text-amber-700 ring-1 ring-amber-200/50',
  info: 'bg-blue-100/50 text-blue-700 ring-1 ring-blue-200/50',
  neutral: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
};
const Badge: React.FC<{ children: React.ReactNode; variant?: keyof typeof BADGE_VARIANTS }> = ({ children, variant = 'neutral' }) => {
  return <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider", BADGE_VARIANTS[variant])}>{children}</span>;
};

// ProgressBar
const ProgressBar: React.FC<{ value: number; label?: string; colorClass?: string; }> = ({ value, label, colorClass = "bg-violet-600" }) => {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
         {label && <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</span>}
         <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{value}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden ring-1 ring-slate-200/50 p-[1px]">
        <div className={cn("h-full rounded-full transition-all duration-1000 ease-out shadow-sm", colorClass)} style={{ width: `${clamped}%` }}></div>
      </div>
    </div>
  );
};

// AnimatedCounter
const AnimatedCounter: React.FC<{ value: number; duration?: number; className?: string }> = ({ value, duration = 500, className }) => {
  const [display, setDisplay] = useState(value);
  const ref = useRef(value);
  useEffect(() => {
    if (value === ref.current) return;
    const start = ref.current;
    const end = value;
    const startTime = performance.now();
    let frame: number;
    const animate = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      setDisplay(Math.floor(start + (end - start) * p));
      if (p < 1) frame = requestAnimationFrame(animate);
      else setDisplay(end);
    };
    frame = requestAnimationFrame(animate);
    ref.current = value;
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  useEffect(() => { ref.current = value; }, []);
  return <span className={cn(className)}>{display}</span>;
};

// ==========================================
// 8. FEATURE COMPONENTS
// ==========================================

// ProfileForm
const ProfileForm: React.FC<{ onSearch: (profile: ASBLProfile) => void; isLoading: boolean; onLoadExample?: () => void; }> = ({ onSearch, isLoading, onLoadExample }) => {
  const { currentProfile, updateCurrentProfile } = useApp();
  const { t, language } = useLanguage();
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [userType, setUserType] = useState<'entity' | 'individual'>('entity');
  const [searchMode, setSearchMode] = useState<SearchMode>('deep');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: number;
    if (cooldown > 0) timer = window.setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
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
        const enrichedData = await geminiService.enrichProfileFromNumber(currentProfile.enterpriseNumber, language);
        if (!enrichedData || Object.keys(enrichedData).length === 0) throw new Error("No data");
        updateCurrentProfile(enrichedData);
    } catch (err) {
        setEnrichError(t('form.autofill_error'));
    } finally {
        setIsEnriching(false);
        setCooldown(30);
    }
  };

  return (
    <Card className="border-t-4 border-t-violet-500 shadow-md">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-violet-600" size={24} />
            {t('form.title')}
          </h2>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">{t('form.subtitle')}</p>
        </div>
        {onLoadExample && (
          <button type="button" onClick={onLoadExample} className="flex items-center gap-1 text-[10px] font-bold text-violet-500 bg-violet-50 px-2 py-1 rounded-lg hover:bg-violet-100 transition-colors shrink-0">
            <Sparkles size={12} /> {t('form.btn_example')}
          </button>
        )}
      </div>

      <div className="bg-slate-100 p-1 rounded-xl flex mb-6">
         <button type="button" onClick={() => setUserType('entity')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${userType === 'entity' ? 'bg-white shadow-sm text-violet-700' : 'text-slate-500 hover:text-slate-700'}`}>{t('form.type_entity')}</button>
         <button type="button" onClick={() => setUserType('individual')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${userType === 'individual' ? 'bg-white shadow-sm text-violet-700' : 'text-slate-500 hover:text-slate-700'}`}>{t('form.type_individual')}</button>
      </div>

      {userType === 'individual' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 text-xs text-amber-800 mb-6">
           <AlertCircle size={16} className="shrink-0 mt-0.5" />
           <p>{t('form.individual_warning')}</p>
        </div>
      )}
      
      <form onSubmit={(e) => { e.preventDefault(); onSearch({ ...currentProfile, searchMode }); }} className="space-y-5">
        <div className="bg-violet-50/50 p-4 rounded-xl border border-violet-100 space-y-2">
           <div className="flex items-end gap-2">
              <Input label={userType === 'entity' ? t('form.identity_label_entity') : t('form.identity_label_individual')} placeholder={userType === 'entity' ? "0456.789.123" : "Prénom Nom"} value={currentProfile.enterpriseNumber || ''} onChange={(e) => handleChange('enterpriseNumber', e.target.value)} error={enrichError || undefined} className="bg-white" />
              {userType === 'entity' && (
                <Button type="button" variant="secondary" onClick={handleAutoFill} isLoading={isEnriching} disabled={cooldown > 0} className={`mb-[1px] border-violet-200 transition-colors w-14 flex justify-center ${cooldown > 0 ? 'bg-slate-100 text-slate-400' : 'text-violet-700 hover:bg-violet-100'}`}>
                  {isEnriching ? <span className="opacity-0">.</span> : cooldown > 0 ? <span className="text-xs font-bold font-mono">{cooldown}</span> : <Sparkles size={18} className="text-violet-600" />}
                </Button>
              )}
           </div>
        </div>

        <Input label={t('form.name_label')} required placeholder="..." value={currentProfile.name} onChange={(e) => handleChange('name', e.target.value)} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label={t('form.website_label')} leftIcon={<Globe size={16} />} placeholder="https://..." value={currentProfile.website || ''} onChange={(e) => handleChange('website', e.target.value)} />
          <Input label={t('form.region_label')} leftIcon={<MapPin size={16} />} required value={currentProfile.region} onChange={(e) => handleChange('region', e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label={t('form.sector_label')} options={Object.values(Sector).map(s => ({ value: s, label: s }))} value={currentProfile.sector} onChange={(e) => handleChange('sector', e.target.value)} />
          <Select label={t('form.budget_label')} leftIcon={<Wallet size={16} />} options={[{ value: "< 10k€", label: "< 10k€" }, { value: "10k€ - 50k€", label: "10k€ - 50k€" }, { value: "50k€ - 200k€", label: "50k€ - 200k€" }, { value: "> 200k€", label: "> 200k€" }]} value={currentProfile.budget} onChange={(e) => handleChange('budget', e.target.value)} />
        </div>

        <TextArea label={t('form.desc_label')} required rows={4} placeholder={t('form.desc_placeholder')} value={currentProfile.description} onChange={(e) => handleChange('description', e.target.value)} />

        <div className="pt-2 space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Stratégie de recherche</label>
            <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setSearchMode('fast')} className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${searchMode === 'fast' ? 'bg-violet-50 border-violet-300 ring-1 ring-violet-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-2 mb-1 relative z-10">
                        <Zap size={16} className={searchMode === 'fast' ? 'text-violet-600' : 'text-slate-400'} />
                        <span className={`text-xs font-bold ${searchMode === 'fast' ? 'text-violet-900' : 'text-slate-600'}`}>{t('form.mode_fast')}</span>
                    </div>
                    {searchMode === 'fast' && <div className="absolute bottom-0 left-0 h-1 bg-violet-400 w-full"></div>}
                </button>
                <button type="button" onClick={() => setSearchMode('deep')} className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${searchMode === 'deep' ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-2 mb-1 relative z-10">
                        <Eye size={16} className={searchMode === 'deep' ? 'text-emerald-600' : 'text-slate-400'} />
                        <span className={`text-xs font-bold ${searchMode === 'deep' ? 'text-emerald-900' : 'text-slate-600'}`}>{t('form.mode_deep')}</span>
                    </div>
                    {searchMode === 'deep' && <div className="absolute bottom-0 left-0 h-1 bg-emerald-400 w-full"></div>}
                </button>
            </div>
        </div>

        <Button type="submit" variant="primary" className="w-full py-4 text-base shadow-violet-500/20 shadow-lg mt-4" isLoading={isLoading} icon={<Search size={20} />}>
          {t('form.submit')}
        </Button>
      </form>
    </Card>
  );
};

// ResultsView
const FormattedText: React.FC<{ text: string; className?: string }> = ({ text, className = "" }) => {
  if (!text) return null;
  const parseBold = (str: string) => str.split(/(\*\*.*?\*\*)/g).map((p, i) => p.startsWith('**') && p.endsWith('**') ? <strong key={i} className="font-bold text-slate-800">{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>);
  return (
    <div className={`space-y-2 ${className}`}>
      {text.split('\n').filter(p => p.trim()).map((paragraph, idx) => {
        if (paragraph.trim().startsWith('- ') || paragraph.trim().startsWith('* ')) {
           return <div key={idx} className="flex gap-2 ml-2"><span className="text-violet-500 mt-1.5">•</span><span className="text-slate-600">{parseBold(paragraph.replace(/^[-*]\s+/, ''))}</span></div>;
        }
        return <p key={idx} className="text-slate-600 leading-relaxed">{parseBold(paragraph)}</p>;
      })}
    </div>
  );
};

const ResultsView: React.FC<{ result: SearchResult | null; onLoadExample?: () => void; }> = ({ result, onLoadExample }) => {
  const [sortBy, setSortBy] = useState<'relevance' | 'deadline'>('relevance');
  const { t } = useLanguage();

  if (!result) {
    const BenefitCard = ({ icon, title, desc, color }: any) => (
       <div className={`group p-6 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all duration-300 bg-${color}-100/50 text-${color}-600`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">{icon}</div>
          <h4 className="font-bold text-slate-800 text-base mb-2">{title}</h4>
          <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
       </div>
    );
    return (
      <div className="h-full flex flex-col justify-center animate-fade-in py-8">
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-white/50 relative overflow-hidden max-w-4xl mx-auto w-full">
           <div className="p-10 md:p-14 text-center relative z-10">
              <div className="inline-flex bg-gradient-to-br from-violet-500 to-fuchsia-600 p-1 rounded-3xl mb-8 shadow-xl shadow-violet-500/20">
                 <div className="bg-white p-5 rounded-[1.3rem]"><Sparkles size={48} className="text-violet-600" /></div>
              </div>
              <h3 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-6 font-outfit tracking-tight leading-tight">{t('results.empty_title')}</h3>
              <p className="text-slate-600 mb-8 leading-relaxed max-w-xl mx-auto text-lg font-light">{t('results.empty_desc')}</p>
              {onLoadExample && (
                <div className="mb-12">
                  <button onClick={onLoadExample} className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 text-violet-700 font-bold text-sm hover:from-violet-100 hover:to-indigo-100 hover:shadow-lg transition-all border border-violet-100 group">
                    <Dices size={20} className="group-hover:rotate-180 transition-transform duration-500" />{t('results.btn_demo')}
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-start mb-12">
                 <BenefitCard icon={<Target size={20} />} title={t('results.benefit_sort')} desc={t('results.benefit_sort_desc')} color="amber" />
                 <BenefitCard icon={<TrendingUp size={20} />} title={t('results.benefit_find')} desc={t('results.benefit_find_desc')} color="emerald" />
                 <BenefitCard icon={<Lightbulb size={20} />} title={t('results.benefit_advise')} desc={t('results.benefit_advise_desc')} color="violet" />
              </div>
           </div>
        </div>
      </div>
    );
  }

  const sortedOpportunities = [...(result.opportunities || [])].sort((a, b) => {
     if (sortBy === 'relevance') return (b.relevanceScore || 0) - (a.relevanceScore || 0);
     return (new Date(a.deadlineDate || '2100').getTime()) - (new Date(b.deadlineDate || '2100').getTime());
  });

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-3 mb-2"><h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t('results.found_title')}</h2><Badge variant="success">{sortedOpportunities.length} {t('results.found_pistes')}</Badge></div>
           <p className="text-sm text-slate-500 flex items-center gap-2"><Calendar size={14} className="text-violet-500" />{t('results.found_date')} <span className="font-medium text-slate-700">{new Date(result.timestamp).toLocaleDateString()}</span></p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1">
          <button onClick={() => setSortBy('relevance')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${sortBy === 'relevance' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'}`}>{t('results.sort_relevance')}</button>
          <button onClick={() => setSortBy('deadline')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${sortBy === 'deadline' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'}`}>{t('results.sort_deadline')}</button>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 p-1 shadow-lg shadow-violet-500/20">
         <div className="bg-white rounded-[1.3rem] p-6 md:p-8">
            <div className="flex gap-5 items-start">
                <div className="bg-violet-50 p-3 rounded-2xl h-fit shrink-0 text-violet-600"><Trophy size={28} /></div>
                <div className="flex-1"><h3 className="text-xl font-bold text-slate-800 mb-2">{t('results.summary_title')}</h3><FormattedText text={result.executiveSummary} /></div>
            </div>
         </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
           {sortedOpportunities.map((opp, idx) => (
             <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex flex-col md:flex-row gap-6">
                   <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3"><span className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 text-[10px] font-bold uppercase tracking-wider">{opp.type || "Opportunité"}</span></div>
                      <h4 className="text-xl font-bold text-slate-800 group-hover:text-violet-700 transition-colors mb-1">{opp.title}</h4>
                      <p className="text-sm font-medium text-slate-500 mb-4">{opp.provider}</p>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative"><div className="text-sm text-slate-600 italic"><FormattedText text={opp.relevanceReason} /></div></div>
                      <div className="flex items-center gap-4 mt-5 text-xs text-slate-500 font-medium"><span className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-slate-600"><Calendar size={14} className="text-violet-500" /> {t('results.card_deadline')} <span className="text-slate-900 font-bold">{opp.deadline}</span></span></div>
                   </div>
                   <div className="w-full md:w-48 shrink-0 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 md:pl-6">
                      <ProgressBar value={opp.relevanceScore} label={t('results.card_score')} colorClass={opp.relevanceScore > 80 ? 'bg-emerald-500' : 'bg-amber-500'} />
                      <Button variant="outline" className="w-full mt-6 text-xs py-3" icon={opp.url ? <ExternalLink size={14}/> : <Search size={14}/>} onClick={() => window.open(opp.url || `https://www.google.com/search?q=${encodeURIComponent(opp.title + ' ' + opp.provider)}`, '_blank')}>{t('results.card_details')}</Button>
                   </div>
                </div>
             </div>
           ))}
        </div>
        <div className="xl:col-span-1 space-y-6">
          <Card title={<div className="flex items-center gap-2 text-amber-600"><Lightbulb size={20} fill="currentColor" className="text-amber-100" /> {t('results.advice_title')}</div>} className="border-l-4 border-l-amber-400">
             <div className="text-sm italic"><FormattedText text={result.strategicAdvice} /></div>
          </Card>
          <Card title={<div className="flex items-center gap-2"><Globe size={18} className="text-violet-600"/> {t('results.sources_title')}</div>}>
             <div className="space-y-3">
              {result.sources.length > 0 ? result.sources.map((source, idx) => (
                  source.web?.uri && <a key={idx} href={source.web.uri} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"><div className="mt-0.5 bg-slate-100 text-slate-500 p-1.5 rounded-lg shrink-0 group-hover:bg-violet-100 group-hover:text-violet-600 transition-colors"><ExternalLink size={14} /></div><div className="overflow-hidden"><p className="text-xs font-bold text-slate-700 group-hover:text-violet-700 truncate">{source.web.title || "Source Web"}</p></div></a>
              )) : <p className="text-sm text-slate-400 italic text-center py-4">{t('results.sources_empty')}</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 9. LAYOUT
// ==========================================

const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl backdrop-blur-sm border border-white/5">
      {(['fr', 'nl', 'de', 'ar'] as Language[]).map(l => (
        <button key={l} onClick={() => setLanguage(l)} className={cn("text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all", language === l ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-white/5")}>{l.toUpperCase()}</button>
      ))}
    </div>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useLanguage();
  const { requestCount } = useApp();
  const location = useLocation();
  useScrollLock(isMobileMenuOpen);

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: <LayoutDashboard size={20} /> },
    { path: '/history', label: t('nav.history'), icon: <HistoryIcon size={20} /> },
  ];

  return (
    <div className="flex min-h-screen bg-[#F0F4F8] font-sans text-slate-900 transition-all duration-300">
      <aside className="hidden md:flex flex-col w-72 bg-[#0F172A] text-white fixed h-full shadow-2xl z-30 start-0 border-r border-slate-800/50">
        <div className="p-8 pb-6 flex items-center gap-4 border-b border-white/5">
          <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-violet-900/50"><Sparkles size={24} className="text-white" /></div>
          <div><h1 className="font-bold text-xl tracking-tight leading-none text-white font-outfit">{t('app.title')}</h1><p className="text-[10px] text-violet-300/80 font-medium uppercase tracking-widest mt-1">{t('app.subtitle')}</p></div>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-8">
          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Menu</p>
          {navItems.map((item) => (
            <Link key={item.path} to={item.path} className={cn("flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 font-medium text-sm group relative overflow-hidden", location.pathname === item.path ? "text-white bg-white/10 shadow-inner" : "text-slate-400 hover:bg-white/5 hover:text-white")}>
              {location.pathname === item.path && <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400 rounded-r-full"></div>}
              <span className="relative z-10">{item.icon}</span><span className="relative z-10">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-6 border-t border-white/5 space-y-6 bg-gradient-to-t from-black/20 to-transparent">
          <div className="flex justify-center"><LanguageSelector /></div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full border-2 border-white/10 flex items-center justify-center text-xs font-bold bg-gradient-to-br from-slate-700 to-slate-800 text-slate-300 shrink-0">AS</div>
              <div className="overflow-hidden w-full">
                 <div className="flex justify-between items-center w-full"><p className="text-sm font-bold truncate text-slate-200">{t('nav.association')}</p><div className="flex items-center gap-1.5 bg-violet-500/20 px-2 py-0.5 rounded-full border border-violet-500/30"><span className="relative flex h-1.5 w-1.5 shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span><AnimatedCounter value={requestCount} className="text-[10px] font-mono font-bold text-violet-200" /></div></div>
                 <div className="flex justify-between items-center mt-1"><p className="text-[10px] text-emerald-400 truncate flex items-center gap-1.5 font-medium">{t('nav.connected')}</p><p className="text-[9px] text-slate-500 uppercase tracking-wide">{t('nav.requests')}</p></div>
              </div>
            </div>
          </div>
        </div>
      </aside>
      <div className="md:hidden fixed w-full bg-[#0F172A] text-white z-50 flex items-center justify-between p-4 shadow-lg border-b border-white/10">
         <div className="flex items-center gap-3"><div className="bg-violet-600 p-2 rounded-xl"><Sparkles size={18} className="text-white" /></div><span className="font-bold text-lg font-outfit">{t('app.title')}</span></div>
         <div className="flex items-center gap-3"><LanguageSelector /><button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">{isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}</button></div>
      </div>
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/95 z-40 pt-24 px-6 md:hidden animate-fade-in backdrop-blur-xl">
          <nav className="space-y-3">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={() => setIsMobileMenuOpen(false)} className={cn("flex items-center gap-4 px-6 py-5 rounded-2xl text-lg font-medium border transition-all", location.pathname === item.path ? "bg-violet-600 border-violet-500 text-white shadow-xl" : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800")}>
                {item.icon}{item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
      <main className="flex-1 md:ms-72 p-4 md:p-10 pt-24 md:pt-10 overflow-y-auto min-h-screen rtl:md:mr-72 rtl:md:ml-0 bg-[#F8FAFC]">
        <div className="max-w-[85rem] mx-auto h-full">{children}</div>
      </main>
    </div>
  );
};

// ==========================================
// 10. PAGES
// ==========================================

const History: React.FC = () => {
  const { history, clearHistory } = useApp();
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-slate-800">{t('history.title')}</h1>{history.length > 0 && <Button variant="ghost" onClick={clearHistory} icon={<Trash2 size={16} />} className="text-slate-400 hover:text-red-500 hover:bg-red-50">{t('history.clear')}</Button>}</div>
      {history.length === 0 ? (
        <Card className="text-center py-16"><div className="bg-slate-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"><HistoryIcon size={32} className="text-slate-400" /></div><h3 className="text-lg font-semibold text-slate-600">{t('history.empty_title')}</h3><p className="text-slate-400 max-w-md mx-auto mt-2">{t('history.empty_desc')}</p></Card>
      ) : (
        <div className="grid gap-6">{history.map((item) => (
             <Card key={item.id} className="hover:shadow-md transition-shadow group relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-violet-500 rtl:left-auto rtl:right-0"></div>
               <div className="flex flex-col md:flex-row gap-6 p-2">
                  <div className="md:w-1/3 space-y-3 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6 rtl:md:border-r-0 rtl:md:border-l rtl:md:pl-6">
                     <div><h3 className="font-bold text-slate-800 text-lg truncate">{item.profileName || "Recherche Sans Nom"}</h3><p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1"><Calendar size={12} />{new Date(item.timestamp).toLocaleDateString()}</p></div>
                     <div className="flex flex-wrap gap-2"><Badge variant="info">{item.opportunities.length} {t('history.opportunities')}</Badge><Badge variant="neutral">{item.sources.length} {t('history.sources')}</Badge></div>
                  </div>
                  <div className="md:w-2/3 flex flex-col justify-between">
                    <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('history.synthesis')}</h4><p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{item.executiveSummary}</p></div>
                  </div>
               </div>
             </Card>
           ))}</div>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { state, currentResult, performSearch, thoughts } = useGrantSearch();
  const { updateCurrentProfile } = useApp();
  const { t } = useLanguage();
  const isSearching = state.status === 'searching' || state.status === 'analyzing';

  const ThinkingProcess: React.FC<{ thoughts: string[] }> = ({ thoughts }) => {
    const bottomRef = useRef<HTMLDivElement>(null);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thoughts]);
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-violet-100 shadow-sm min-h-[500px] relative overflow-hidden">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-50/50 via-transparent to-transparent opacity-70 animate-pulse"></div>
         <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border border-white shadow-xl max-w-md w-full relative z-10">
            <div className="flex justify-center mb-8"><div className="relative"><div className="w-16 h-16 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30 animate-bounce-slow"><Sparkles className="text-white" size={32} /></div><div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 shadow-md"><Loader2 className="animate-spin text-violet-600" size={20} /></div></div></div>
            <div className="space-y-4">
               {thoughts.length === 0 && <p className="text-center text-slate-400 text-sm animate-pulse">Initialisation...</p>}
               {thoughts.map((thought, idx) => (
                 <div key={idx} className={cn("flex items-start gap-3 transition-all duration-500", idx === thoughts.length - 1 ? "opacity-100 scale-100" : "opacity-50 scale-95")}>
                    <div className={cn("mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border", idx === thoughts.length - 1 ? "border-violet-500 bg-violet-50" : "border-emerald-500 bg-emerald-50")}>{idx === thoughts.length - 1 ? <div className="w-2 h-2 bg-violet-600 rounded-full animate-pulse"></div> : <CheckCircle2 size={12} className="text-emerald-600" />}</div>
                    <p className={cn("text-sm font-medium", idx === thoughts.length - 1 ? "text-slate-800" : "text-slate-400")}>{thought}</p>
                 </div>
               ))}
               <div ref={bottomRef} />
            </div>
         </div>
      </div>
    );
  };

  const handleLoadExample = () => {
    updateCurrentProfile({
      name: "Centre Culturel Horizon",
      sector: Sector.CULTURE,
      region: "Bruxelles-Capitale",
      description: "ASBL active dans l'initiation artistique.",
      enterpriseNumber: "0456.789.123",
      budget: "50k€ - 200k€",
      website: "https://www.horizon-culture.be"
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-4 xl:col-span-4"><div className="sticky top-8 space-y-4"><ProfileForm onSearch={performSearch} isLoading={isSearching} onLoadExample={handleLoadExample} /></div></div>
      <div className="lg:col-span-8 xl:col-span-8 min-h-[500px]">
        {isSearching ? <ThinkingProcess thoughts={thoughts} /> : state.status === 'error' ? (
           <div className="h-full flex flex-col items-center justify-center p-12 bg-red-50 rounded-3xl border border-red-100 text-center animate-fade-in min-h-[400px]"><div className="bg-white p-4 rounded-full mb-4 shadow-sm text-red-500 mx-auto w-fit"><AlertTriangle size={40} /></div><h3 className="text-xl font-bold text-red-800 mb-2">{t('results.error_title')}</h3><p className="text-red-600 max-w-md mb-6 mx-auto">{state.message}</p></div>
        ) : <ResultsView result={currentResult} onLoadExample={handleLoadExample} />}
      </div>
    </div>
  );
};

// ==========================================
// 11. MAIN APP
// ==========================================

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/history" element={<History />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      </AppProvider>
    </LanguageProvider>
  );
};

export default App;

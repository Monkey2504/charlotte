
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, Sparkles, Menu, X, Activity } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../utils/styles';
import { useScrollLock } from '../hooks/useScrollLock';
import { Language } from '../types';
import { AnimatedCounter } from './ui/DesignSystem'; // Import AnimatedCounter

// Sub-component for Navigation Items
const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; onClick?: () => void }> = ({ to, icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  const containerClass = cn(
    "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 font-medium text-sm group relative overflow-hidden",
    isActive 
      ? "text-white bg-white/10 shadow-inner" 
      : "text-slate-400 hover:bg-white/5 hover:text-white"
  );

  return (
    <Link to={to} className={containerClass} onClick={onClick}>
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400 rounded-r-full shadow-[0_0_10px_rgba(167,139,250,0.5)]"></div>}
      <span className={cn("relative z-10 transition-colors duration-300", isActive ? "text-violet-300" : "text-slate-500 group-hover:text-white")}>{icon}</span>
      <span className="relative z-10">{label}</span>
    </Link>
  );
};

// Mobile Nav Item
const MobileNavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; onClick: () => void }> = ({ to, icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  const containerClass = cn(
    "flex items-center gap-4 px-6 py-5 rounded-2xl text-lg font-medium border transition-all",
    isActive
      ? "bg-violet-600 border-violet-500 text-white shadow-xl"
      : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800"
  );

  return (
    <Link to={to} onClick={onClick} className={containerClass}>
      {icon}
      {label}
    </Link>
  );
};

const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  
  const langs: { code: Language; label: string }[] = [
    { code: 'fr', label: 'FR' },
    { code: 'nl', label: 'NL' },
    { code: 'de', label: 'DE' },
    { code: 'ar', label: 'AR' }
  ];

  return (
    <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl backdrop-blur-sm border border-white/5">
      {langs.map(l => (
        <button
          key={l.code}
          onClick={() => setLanguage(l.code)}
          className={cn(
            "text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all",
            language === l.code ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useLanguage();
  const { requestCount } = useApp();

  useScrollLock(isMobileMenuOpen);

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: <LayoutDashboard size={20} /> },
    { path: '/history', label: t('nav.history'), icon: <History size={20} /> },
  ];

  return (
    <div className="flex min-h-screen bg-[#F0F4F8] font-sans text-slate-900 transition-all duration-300">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-[#0F172A] text-white fixed h-full shadow-2xl z-30 start-0 border-r border-slate-800/50">
        <div className="p-8 pb-6 flex items-center gap-4 border-b border-white/5 select-none relative">
          <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-violet-900/50 relative group cursor-default">
             <div className="absolute inset-0 bg-white/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
             {/* Changement d'icône pour Sparkles (plus magique) */}
             <Sparkles size={24} className="text-white relative z-10" />
          </div>
          <div>
             <h1 className="font-bold text-xl tracking-tight leading-none text-white font-outfit">{t('app.title')}</h1>
             <p className="text-[10px] text-violet-300/80 font-medium uppercase tracking-widest mt-1">{t('app.subtitle')}</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-8">
          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Menu</p>
          {navItems.map((item) => (
            <NavItem 
              key={item.path}
              to={item.path}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 space-y-6 bg-gradient-to-t from-black/20 to-transparent">
          <div className="flex justify-center">
             <LanguageSelector />
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full border-2 border-white/10 flex items-center justify-center text-xs font-bold shadow-inner bg-gradient-to-br from-slate-700 to-slate-800 text-slate-300 shrink-0">
                AS
              </div>
              <div className="overflow-hidden w-full">
                 <div className="flex justify-between items-center w-full">
                   <p className="text-sm font-bold truncate text-slate-200">{t('nav.association')}</p>
                   {/* Desktop counter with animation */}
                   <AnimatedCounter 
                     value={requestCount} 
                     className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-mono" 
                   />
                 </div>
                 <div className="flex justify-between items-center mt-1">
                   <p className="text-[10px] text-emerald-400 truncate flex items-center gap-1.5 font-medium">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]"></span>
                     {t('nav.connected')}
                   </p>
                   <p className="text-[9px] text-slate-500 uppercase tracking-wide">{t('nav.requests')}</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed w-full bg-[#0F172A] text-white z-50 flex items-center justify-between p-4 shadow-lg border-b border-white/10">
         <div className="flex items-center gap-3">
            <div className="bg-violet-600 p-2 rounded-xl">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg font-outfit">{t('app.title')}</span>
         </div>
         <div className="flex items-center gap-3">
            <div className="scale-75 origin-right rtl:origin-left">
              <LanguageSelector />
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
         </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/95 z-40 pt-24 px-6 md:hidden animate-fade-in backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
        >
          <nav className="space-y-3">
            {navItems.map((item) => (
              <MobileNavItem 
                key={item.path}
                to={item.path}
                label={item.label}
                icon={item.icon}
                onClick={() => setIsMobileMenuOpen(false)}
              />
            ))}
          </nav>
          
          <div className="mt-8 border-t border-white/10 pt-6">
             <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                   <Activity size={18} className="text-violet-400" />
                   <span className="text-slate-300 font-medium">{t('nav.requests')}</span>
                </div>
                {/* Mobile counter with animation */}
                <AnimatedCounter 
                  value={requestCount} 
                  className="bg-violet-600 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg shadow-violet-900/50" 
                />
             </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ms-72 p-4 md:p-10 pt-24 md:pt-10 overflow-y-auto min-h-screen rtl:md:mr-72 rtl:md:ml-0 bg-[#F8FAFC]">
        <div className="max-w-[85rem] mx-auto h-full">
           {children}
        </div>
      </main>
    </div>
  );
};


import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, Bot, Menu, X, ShieldAlert, Globe, Activity } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../utils/styles';
import { useScrollLock } from '../hooks/useScrollLock';
import { Language } from '../types';

// Sub-component for Navigation Items
const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; onClick?: () => void }> = ({ to, icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  const containerClass = cn(
    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm group",
    isActive 
      ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40" 
      : "text-slate-400 hover:bg-slate-800 hover:text-white"
  );

  const iconClass = cn(
    isActive ? "text-white" : "text-slate-500 group-hover:text-white transition-colors"
  );

  return (
    <Link to={to} className={containerClass} onClick={onClick}>
      <span className={iconClass}>{icon}</span>
      {label}
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
    <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
      {langs.map(l => (
        <button
          key={l.code}
          onClick={() => setLanguage(l.code)}
          className={cn(
            "text-xs font-bold px-2 py-1 rounded-md transition-all",
            language === l.code ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-slate-700"
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

  // Lock body scroll when mobile menu is open
  useScrollLock(isMobileMenuOpen);

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: <LayoutDashboard size={20} /> },
    { path: '/history', label: t('nav.history'), icon: <History size={20} /> },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 transition-all duration-300">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full shadow-xl z-30 start-0">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800 select-none relative">
          <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 p-2 rounded-xl shadow-lg shadow-violet-500/20 relative">
             <Bot size={24} className="text-white" />
          </div>
          <div>
             <h1 className="font-bold text-lg tracking-tight leading-tight">{t('app.title')}</h1>
             <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{t('app.subtitle')}</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <NavItem 
              key={item.path}
              to={item.path}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="flex justify-center">
             <LanguageSelector />
          </div>

          <div className="bg-slate-900/50 pt-2">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full border flex items-center justify-center text-xs font-bold shadow-inner transition-colors bg-slate-700 border-slate-600 text-slate-300 shrink-0">
                AS
              </div>
              <div className="overflow-hidden w-full">
                 <div className="flex justify-between items-center w-full">
                   <p className="text-sm font-medium truncate text-slate-200">{t('nav.association')}</p>
                   <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{requestCount}</span>
                 </div>
                 <div className="flex justify-between items-center mt-0.5">
                   <p className="text-xs text-emerald-400 truncate flex items-center gap-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                     {t('nav.connected')}
                   </p>
                   <p className="text-[9px] text-slate-500 uppercase">{t('nav.requests')}</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed w-full bg-slate-900 text-white z-50 flex items-center justify-between p-4 shadow-lg border-b border-slate-800">
         <div className="flex items-center gap-3">
            <div className="bg-violet-600 p-1.5 rounded-lg relative">
              <Bot size={20} className="text-white" />
            </div>
            <span className="font-bold tracking-tight">{t('app.title')}</span>
         </div>
         <div className="flex items-center gap-3">
            <div className="scale-75 origin-right rtl:origin-left">
              <LanguageSelector />
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
         </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/95 z-40 pt-24 px-6 md:hidden animate-fade-in backdrop-blur-sm"
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
          
          <div className="mt-8 border-t border-slate-800 pt-6">
             <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                   <Activity size={18} className="text-violet-400" />
                   <span className="text-slate-300 font-medium">{t('nav.requests')}</span>
                </div>
                <span className="bg-violet-600 text-white px-2 py-0.5 rounded text-sm font-bold">{requestCount}</span>
             </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ms-64 p-4 md:p-8 pt-24 md:pt-8 overflow-y-auto min-h-screen rtl:md:mr-64 rtl:md:ml-0">
        <div className="max-w-7xl mx-auto h-full">
           {children}
        </div>
      </main>
    </div>
  );
};

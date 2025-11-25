
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, Bot, Menu, X, ShieldAlert } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { cn } from '../utils/styles';
import { useScrollLock } from '../hooks/useScrollLock';

// Sub-component for Navigation Items to clean up the main Layout
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

// Mobile Nav Item variant (bigger touch targets)
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

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAdmin, enableAdmin } = useApp();
  const [logoClickCount, setLogoClickCount] = useState(0);

  // Lock body scroll when mobile menu is open
  useScrollLock(isMobileMenuOpen);

  const navItems = [
    { path: '/', label: 'Mon bureau', icon: <LayoutDashboard size={20} /> },
    { path: '/history', label: 'Mes souvenirs', icon: <History size={20} /> },
  ];

  const handleSecretClick = () => {
    if (isAdmin) return;
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    
    if (newCount >= 5) {
      enableAdmin();
      setLogoClickCount(0);
    }
    
    // Reset count after 2 seconds of inactivity
    setTimeout(() => setLogoClickCount(0), 2000);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full shadow-xl z-30">
        <div 
          className="p-6 flex items-center gap-3 border-b border-slate-800 cursor-pointer select-none relative"
          onClick={handleSecretClick}
        >
          <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 p-2 rounded-xl shadow-lg shadow-violet-500/20 relative">
             <Bot size={24} className="text-white" />
             {isAdmin && (
               <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-slate-900 rounded-full animate-pulse"></span>
             )}
          </div>
          <div>
             <h1 className="font-bold text-lg tracking-tight leading-tight">Charlotte AI</h1>
             <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Ton alliée financement</p>
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

        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={cn(
                "h-9 w-9 rounded-full border flex items-center justify-center text-xs font-bold shadow-inner transition-colors",
                isAdmin ? "bg-red-900/20 border-red-500 text-red-400" : "bg-slate-700 border-slate-600 text-slate-300"
              )}>
              {isAdmin ? <ShieldAlert size={16} /> : 'AS'}
            </div>
            <div className="overflow-hidden">
               <p className="text-sm font-medium truncate text-slate-200">{isAdmin ? 'Mode Admin' : 'Association'}</p>
               <p className="text-xs text-emerald-400 truncate flex items-center gap-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                 Connectée
               </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed w-full bg-slate-900 text-white z-50 flex items-center justify-between p-4 shadow-lg border-b border-slate-800">
         <div className="flex items-center gap-3" onClick={handleSecretClick}>
            <div className="bg-violet-600 p-1.5 rounded-lg relative">
              <Bot size={20} className="text-white" />
              {isAdmin && (
               <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-slate-900 rounded-full animate-pulse"></span>
             )}
            </div>
            <span className="font-bold tracking-tight">Charlotte AI</span>
         </div>
         <button 
           onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
           className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
           aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
           aria-expanded={isMobileMenuOpen}
         >
           {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
         </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/95 z-40 pt-24 px-6 md:hidden animate-fade-in backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
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
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-24 md:pt-8 overflow-y-auto min-h-screen">
        <div className="max-w-7xl mx-auto h-full">
           {children}
        </div>
      </main>
    </div>
  );
};

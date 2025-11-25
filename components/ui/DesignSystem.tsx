
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/styles';

// --- BUTTONS ---

// Modernisation : Ombres colorées (Glow) et interaction plus marquée
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

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', isLoading, icon, className = '', disabled, ...props 
}) => {
  return (
    <button 
      className={cn(BUTTON_BASE_STYLES, BUTTON_VARIANTS[variant], className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" aria-hidden="true" /> : icon && <span className="mr-2" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
};

// --- INPUTS ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, leftIcon, className = '', ...props }) => {
  const inputStyles = cn(
    "w-full bg-slate-50 border-transparent focus:bg-white text-slate-800 text-sm rounded-xl py-3 outline-none transition-all duration-200 shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 placeholder:text-slate-400",
    error ? "ring-red-300 focus:ring-red-500 bg-red-50/50" : "hover:bg-white",
    leftIcon ? "pl-11 pr-4" : "px-4",
    className
  );

  return (
    <div className="w-full group">
      {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1 transition-colors group-focus-within:text-violet-600">{label}</label>}
      <div className="relative">
        {leftIcon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-violet-500" aria-hidden="true">{leftIcon}</div>}
        <input className={inputStyles} aria-invalid={!!error} {...props} />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500 ml-1 font-medium flex items-center gap-1" role="alert">
        <span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span>
        {error}
      </p>}
    </div>
  );
};

// --- TEXTAREA ---
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, error, className = '', ...props }) => {
  const areaStyles = cn(
    "w-full bg-slate-50 border-transparent focus:bg-white text-slate-800 text-sm rounded-xl py-3 px-4 outline-none transition-all duration-200 shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 resize-none leading-relaxed placeholder:text-slate-400",
    error ? "ring-red-300 focus:ring-red-500 bg-red-50/50" : "hover:bg-white",
    className
  );

  return (
    <div className="w-full group">
      {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1 transition-colors group-focus-within:text-violet-600">{label}</label>}
      <textarea className={areaStyles} aria-invalid={!!error} {...props} />
      {error && <p className="mt-1.5 text-xs text-red-500 ml-1 font-medium" role="alert">{error}</p>}
    </div>
  );
};

// --- SELECT ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  leftIcon?: React.ReactNode;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, leftIcon, options, className = '', ...props }) => {
  const selectStyles = cn(
    "w-full bg-slate-50 border-transparent focus:bg-white text-slate-800 text-sm rounded-xl py-3 outline-none transition-all duration-200 shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 appearance-none cursor-pointer hover:bg-white",
    leftIcon ? "pl-11 pr-10" : "px-4 pr-10",
    className
  );

  return (
    <div className="w-full group">
      {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1 transition-colors group-focus-within:text-violet-600">{label}</label>}
      <div className="relative">
        {leftIcon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-violet-500" aria-hidden="true">{leftIcon}</div>}
        <select className={selectStyles} {...props}>
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

// --- CARDS ---
// Changement majeur : "Soft UI" - Moins de bordures, plus d'ombres douces
export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: React.ReactNode }> = ({ children, className = '', title }) => (
  <div className={cn("bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-white/20 ring-1 ring-slate-100", className)}>
    {title && (
      <div className="px-6 py-5 border-b border-slate-50/80 bg-slate-50/30 rounded-t-3xl backdrop-blur-sm">
        <h3 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h3>
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

// --- BADGE ---
const BADGE_VARIANTS = {
  success: 'bg-emerald-100/50 text-emerald-700 ring-1 ring-emerald-200/50',
  warning: 'bg-amber-100/50 text-amber-700 ring-1 ring-amber-200/50',
  info: 'bg-blue-100/50 text-blue-700 ring-1 ring-blue-200/50',
  neutral: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
};

export const Badge: React.FC<{ children: React.ReactNode; variant?: keyof typeof BADGE_VARIANTS }> = ({ children, variant = 'neutral' }) => {
  return (
    <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider", BADGE_VARIANTS[variant])}>
      {children}
    </span>
  );
};

// --- PROGRESS BAR ---
interface ProgressBarProps {
  value: number; // 0 to 100
  label?: string;
  colorClass?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, label, colorClass = "bg-violet-600" }) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  
  return (
    <div 
      className="w-full"
      role="progressbar" 
      aria-valuenow={clampedValue} 
      aria-valuemin={0} 
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="flex justify-between items-center mb-2">
         {label && <span className="text-xs font-bold text-slate-500 uppercase tracking-wide" aria-hidden="true">{label}</span>}
         <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md" aria-hidden="true">{value}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden ring-1 ring-slate-200/50 p-[1px]">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000 ease-out shadow-sm", colorClass)} 
          style={{ width: `${clampedValue}%` }}
        ></div>
      </div>
    </div>
  );
};

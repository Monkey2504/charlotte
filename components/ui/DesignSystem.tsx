
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/styles';

// --- BUTTONS ---

// Configuration des styles (Pattern CVA-like)
const BUTTON_VARIANTS = {
  primary: "bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200 focus:ring-violet-500",
  secondary: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm focus:ring-slate-400",
  ghost: "bg-transparent hover:bg-slate-100 text-slate-600 focus:ring-slate-300",
  outline: "border-2 border-violet-600 text-violet-600 hover:bg-violet-50 focus:ring-violet-500"
};

const BUTTON_BASE_STYLES = "inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed text-sm";

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
    "w-full bg-white border rounded-xl py-2.5 text-slate-700 text-sm outline-none transition-all focus:ring-2 focus:ring-violet-500/20",
    error ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-violet-500",
    leftIcon ? "pl-10 pr-4" : "px-4",
    className
  );

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{label}</label>}
      <div className="relative">
        {leftIcon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">{leftIcon}</div>}
        <input className={inputStyles} aria-invalid={!!error} {...props} />
      </div>
      {error && <p className="mt-1 text-xs text-red-500 ml-1" role="alert">{error}</p>}
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
    "w-full bg-white border rounded-xl py-3 px-4 text-slate-700 text-sm outline-none transition-all focus:ring-2 focus:ring-violet-500/20 resize-none leading-relaxed",
    error ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-violet-500",
    className
  );

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{label}</label>}
      <textarea className={areaStyles} aria-invalid={!!error} {...props} />
      {error && <p className="mt-1 text-xs text-red-500 ml-1" role="alert">{error}</p>}
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
    "w-full bg-white border border-slate-200 rounded-xl py-2.5 text-slate-700 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none appearance-none transition-all",
    leftIcon ? "pl-10 pr-8" : "px-4 pr-8",
    className
  );

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{label}</label>}
      <div className="relative">
        {leftIcon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">{leftIcon}</div>}
        <select className={selectStyles} {...props}>
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
    </div>
  );
};

// --- CARDS ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: React.ReactNode }> = ({ children, className = '', title }) => (
  <div className={cn("bg-white rounded-2xl border border-slate-100 shadow-sm", className)}>
    {title && (
      <div className="px-6 py-4 border-b border-slate-50">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

// --- BADGE ---
const BADGE_VARIANTS = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  info: 'bg-blue-50 text-blue-700 border-blue-100',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200'
};

export const Badge: React.FC<{ children: React.ReactNode; variant?: keyof typeof BADGE_VARIANTS }> = ({ children, variant = 'neutral' }) => {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", BADGE_VARIANTS[variant])}>
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
  // Ensure value is within bounds for ARIA
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
      <div className="flex justify-between items-center mb-1">
         {label && <span className="text-xs font-medium text-slate-600" aria-hidden="true">{label}</span>}
         <span className="text-xs font-bold text-slate-700" aria-hidden="true">{value}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div 
          className={cn("h-2 rounded-full transition-all duration-500", colorClass)} 
          style={{ width: `${clampedValue}%` }}
        ></div>
      </div>
    </div>
  );
};

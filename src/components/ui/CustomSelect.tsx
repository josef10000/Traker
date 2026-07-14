import React, { useState, useRef, useEffect } from 'react';
import { CaretDown } from '@phosphor-icons/react';

export interface CustomSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  className?: string;
  required?: boolean;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function CustomSelect({ 
  value, 
  onChange, 
  options, 
  className = '', 
  placeholder = 'Selecione...',
  disabled = false,
  name,
  required
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={containerRef} className="relative w-full">
      {name && <input type="hidden" name={name} value={value} required={required} />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-slate-200 text-left text-sm disabled:opacity-30 disabled:cursor-not-allowed ${className}`}
      >
        <span className={selectedOption ? 'text-white' : 'text-slate-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <CaretDown size={14} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul className="absolute z-[100] w-full mt-1.5 bg-[#090d16] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`px-4 py-2.5 text-xs transition-all cursor-pointer ${
                  opt.disabled
                    ? 'text-slate-600 cursor-not-allowed bg-transparent'
                    : isSelected
                    ? 'bg-sky-500 text-white font-bold'
                    : 'text-slate-300 hover:bg-sky-500/10 hover:text-white'
                }`}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

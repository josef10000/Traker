import React, { useState, useRef, useEffect } from 'react';
import { CaretDown, CalendarBlank, Check } from '@phosphor-icons/react';

interface CustomMonthYearPickerProps {
  selectedMonth: number;
  selectedYear: number;
  onSelectMonth: (month: number) => void;
  onSelectYear: (year: number) => void;
  theme?: 'dark' | 'light';
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const CustomMonthYearPicker: React.FC<CustomMonthYearPickerProps> = ({
  selectedMonth,
  selectedYear,
  onSelectMonth,
  onSelectYear,
  theme = 'dark'
}) => {
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [customYearInput, setCustomYearInput] = useState('');

  const monthRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  // Lista padrão de anos (2020 a 2030)
  const baseYears = Array.from({ length: 11 }, (_, i) => 2020 + i);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthRef.current && !monthRef.current.contains(event.target as Node)) {
        setIsMonthOpen(false);
      }
      if (yearRef.current && !yearRef.current.contains(event.target as Node)) {
        setIsYearOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomYearSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customYearInput.trim(), 10);
    if (!isNaN(parsed) && parsed >= 2000 && parsed <= 2100) {
      onSelectYear(parsed);
      setCustomYearInput('');
      setIsYearOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* SELETOR CUSTOMIZADO DE MÊS */}
      <div className="relative" ref={monthRef}>
        <button
          type="button"
          onClick={() => {
            setIsMonthOpen(!isMonthOpen);
            setIsYearOpen(false);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            theme === 'dark'
              ? 'bg-slate-900/90 text-white border-white/10 hover:border-sky-500/50 hover:bg-slate-800'
              : 'bg-white text-slate-800 border-slate-200 hover:border-sky-500/50 hover:bg-slate-50 shadow-sm'
          }`}
        >
          <CalendarBlank size={14} className="text-sky-400" />
          <span>{MONTHS[selectedMonth]}</span>
          <CaretDown size={12} className={`transition-transform duration-200 text-slate-400 ${isMonthOpen ? 'rotate-180' : ''}`} />
        </button>

        {isMonthOpen && (
          <div className={`absolute left-0 mt-2 w-64 p-3 rounded-2xl z-[100] shadow-2xl border backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
            theme === 'dark'
              ? 'bg-slate-950/95 border-white/10 text-white shadow-black/60'
              : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300'
          }`}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Selecionar Mês</p>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((month, idx) => {
                const isSelected = idx === selectedMonth;
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => {
                      onSelectMonth(idx);
                      setIsMonthOpen(false);
                    }}
                    className={`px-2 py-2 rounded-xl text-[11px] font-bold transition-all text-center cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30 font-extrabold'
                        : theme === 'dark'
                          ? 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                          : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    {month.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SELETOR CUSTOMIZADO DE ANO */}
      <div className="relative" ref={yearRef}>
        <button
          type="button"
          onClick={() => {
            setIsYearOpen(!isYearOpen);
            setIsMonthOpen(false);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            theme === 'dark'
              ? 'bg-slate-900/90 text-white border-white/10 hover:border-sky-500/50 hover:bg-slate-800'
              : 'bg-white text-slate-800 border-slate-200 hover:border-sky-500/50 hover:bg-slate-50 shadow-sm'
          }`}
        >
          <span>{selectedYear}</span>
          <CaretDown size={12} className={`transition-transform duration-200 text-slate-400 ${isYearOpen ? 'rotate-180' : ''}`} />
        </button>

        {isYearOpen && (
          <div className={`absolute right-0 mt-2 w-48 p-2 rounded-2xl z-[100] shadow-2xl border backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
            theme === 'dark'
              ? 'bg-slate-950/95 border-white/10 text-white shadow-black/60'
              : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300'
          }`}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Ano de Referência</p>
            
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {baseYears.map((year) => {
                const isSelected = year === selectedYear;
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      onSelectYear(year);
                      setIsYearOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30 font-extrabold'
                        : theme === 'dark'
                          ? 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                          : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <span>{year}</span>
                    {isSelected && <Check size={12} />}
                  </button>
                );
              })}
            </div>

            {/* ENTRADA DE ANO CUSTOMIZADO */}
            <div className={`mt-2 pt-2 border-t ${theme === 'dark' ? 'border-white/10' : 'border-slate-100'}`}>
              <form onSubmit={handleCustomYearSubmit} className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Digitar ano..."
                  min="2000"
                  max="2100"
                  value={customYearInput}
                  onChange={(e) => setCustomYearInput(e.target.value)}
                  className={`w-full px-2.5 py-1 rounded-lg text-[11px] outline-none border transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-900 text-white border-slate-800 focus:border-sky-500'
                      : 'bg-slate-50 text-slate-900 border-slate-200 focus:border-sky-500'
                  }`}
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                >
                  Ok
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

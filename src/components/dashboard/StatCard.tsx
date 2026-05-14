import React, { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, LucideIcon, Info } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  subtitle?: string;
  color: 'primary' | 'emerald' | 'rose' | 'amber' | 'sky' | 'indigo';
  id?: string;
  chartData?: any[];
  chartType?: 'area' | 'bar' | 'pie';
}

export const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  subtitle,
  color,
  id,
  chartData = [],
  chartType = 'area'
}: StatCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const colorClasses = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
  };

  const chartColors = {
    primary: '#0ea5e9',
    emerald: '#10b981',
    rose: '#f43f5e',
    amber: '#f59e0b',
    sky: '#0ea5e9',
    indigo: '#6366f1'
  };

  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-white/10 text-[10px] uppercase font-bold tracking-widest">
          Sem dados
        </div>
      );
    }

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <Bar 
              dataKey="value" 
              fill={chartColors[color]} 
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              innerRadius="60%"
              outerRadius="85%"
              paddingAngle={5}
              dataKey="value"
              isAnimationActive={true}
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index === 0 ? chartColors[color] : 'rgba(255,255,255,0.05)'} 
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }

    // Default: Area Chart
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors[color]} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={chartColors[color]} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={chartColors[color]} 
            strokeWidth={2}
            fillOpacity={1} 
            fill={`url(#gradient-${color})`} 
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div 
      className="relative h-40 w-full cursor-pointer perspective-1000 group"
      onClick={() => setIsFlipped(!isFlipped)}
      id={id}
    >
      <motion.div
        className="relative w-full h-full transition-all preserve-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Face Frontal */}
        <div className="absolute inset-0 backface-hidden">
          <div className="glass-card h-full p-5 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-current opacity-[0.03] -mr-8 -mt-8 rounded-full blur-2xl group-hover:opacity-[0.07] transition-all" />
            
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl border ${colorClasses[color]}`}>
                <Icon size={24} />
              </div>
              <div className="flex flex-col items-end gap-1">
                {trend && (
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20">
                    <TrendingUp size={10} />
                    {trend}
                  </span>
                )}
                <div className="text-white/20 group-hover:text-white/40 transition-colors">
                  <Info size={14} />
                </div>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">{title}</p>
              <h3 className="text-2xl font-black text-white mt-1 leading-none">{value}</h3>
              {subtitle && (
                <p className="text-[9px] font-bold text-white/30 mt-2 uppercase tracking-wider truncate">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        {/* Face Traseira */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <div className="glass-card h-full p-5 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden border border-white/5">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">Visão Analítica</p>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse`} style={{ backgroundColor: chartColors[color] }} />
            </div>
            
            <div className="flex-1 -mx-2 mt-1 opacity-90 group-hover:opacity-100 transition-opacity">
              {renderChart()}
            </div>
            
            <div className="relative z-10 pointer-events-none mt-1">
              <p className="text-[9px] font-bold text-white/60 truncate uppercase tracking-tighter">{title}</p>
              <p className="text-sm font-black text-white">{value}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

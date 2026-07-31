import React, { useState, useEffect } from 'react';

// Wrapper seguro para carregar react-apexcharts sem problemas no React 19 / Vite
export const ApexChartWrapper: React.FC<{
  type: 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'radialBar' | 'heatmap';
  options: any;
  series: any;
  height?: number | string;
  width?: number | string;
}> = ({ type, options, series, height = 350, width = '100%' }) => {
  const [ChartComponent, setChartComponent] = useState<any>(null);

  useEffect(() => {
    import('react-apexcharts').then((mod) => {
      setChartComponent(() => mod.default);
    }).catch(err => console.error("Erro ao carregar ApexCharts:", err));
  }, []);

  if (!ChartComponent) {
    return (
      <div 
        style={{ height: typeof height === 'number' ? `${height}px` : height }} 
        className="w-full flex items-center justify-center bg-slate-900/30 rounded-2xl border border-white/5 animate-pulse text-slate-500 text-xs font-mono"
      >
        <span>Carregando gráficos de alta precisão ApexCharts...</span>
      </div>
    );
  }

  return <ChartComponent type={type} options={options} series={series} height={height} width={width} />;
};

import React from 'react';
import Chart from 'react-apexcharts';

// Wrapper seguro estático para carregar react-apexcharts sem falhas de chunk/MIME em produção
export const ApexChartWrapper: React.FC<{
  type: 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'radialBar' | 'heatmap';
  options: any;
  series: any;
  height?: number | string;
  width?: number | string;
}> = ({ type, options, series, height = 350, width = '100%' }) => {
  return <Chart type={type} options={options} series={series} height={height} width={width} />;
};

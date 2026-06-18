import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className, size, ...props }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: size ? `${size}px` : '100%', height: size ? `${size}px` : '100%' }}
      {...props}
    >
      <defs>
        <linearGradient id="logo-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="logo-grad-accent" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Brilho de fundo */}
      <circle cx="100" cy="100" r="75" fill="url(#logo-grad-primary)" fillOpacity="0.08" />
      
      {/* Seta de Crescimento/Recuperação */}
      <path
        d="M60 135L100 75L140 135H112L100 115L88 135H60Z"
        fill="url(#logo-grad-primary)"
        filter="url(#logo-glow)"
      />
      
      {/* Radar superior (Rastreamento) */}
      <path
        d="M45 100C45 69.6243 69.6243 45 100 45C130.376 45 155 69.6243 155 100"
        stroke="url(#logo-grad-accent)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      
      {/* Nó de Conexão Central */}
      <circle cx="100" cy="100" r="14" fill="#ffffff" filter="url(#logo-glow)" />
      <circle cx="100" cy="100" r="8" fill="url(#logo-grad-accent)" />
    </svg>
  );
};

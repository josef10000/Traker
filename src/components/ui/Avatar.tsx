import React, { useState, useEffect } from 'react';

interface AvatarProps {
  displayName: string;
  email?: string;
  avatarStyle?: string;
  avatarSeed?: string;
  photoURL?: string;
  avatarType?: 'custom' | 'api';
  theme?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ 
  displayName, 
  email, 
  avatarStyle = 'initials', 
  avatarSeed,
  photoURL,
  avatarType = 'api',
  theme = 'dark',
  size = 'md', 
  className = '' 
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  // Reinicia o estado de erro se a url do avatar mudar
  useEffect(() => {
    setHasError(false);
  }, [avatarStyle, avatarSeed, photoURL, avatarType, email, displayName]);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-[12px]',
    md: 'w-10 h-10 text-[14px]',
    lg: 'w-12 h-12 text-[16px]',
    xl: 'w-20 h-20 text-[24px]'
  };

  const getThemeColors = (themeName?: string) => {
    if (themeName === 'sky') return '0ea5e9,0284c7,38bdf8,bae6fd';
    if (themeName === 'purple') return 'a855f7,7c3aed,c084fc,e9d5ff';
    // default (dark/slate)
    return '0f172a,1e293b,334155,475569';
  };

  // Se o modo for customizado e houver foto válida, exibe a foto do perfil enviada
  const isCustomPhoto = avatarType === 'custom' && !!photoURL;
  const activeSeed = avatarSeed || email || displayName || 'noverde';
  const seed = encodeURIComponent(activeSeed);
  const colors = getThemeColors(theme);
  const apiSrc = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${seed}&backgroundColor=${colors}`;
  const src = isCustomPhoto ? photoURL : apiSrc;

  // Calcula iniciais para fallback
  const initials = displayName
    ? displayName
        .split(' ')
        .filter(n => n.length > 0)
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <div className={`rounded-full border border-white/10 overflow-hidden shrink-0 flex items-center justify-center bg-slate-900 text-sky-500 font-bold ${sizeClasses[size]} ${className}`}>
      {!hasError ? (
        <img 
          src={src} 
          alt={displayName} 
          className="w-full h-full object-cover animate-in fade-in duration-200"
          onError={() => setHasError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

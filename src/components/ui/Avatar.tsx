import React, { useState } from 'react';

interface AvatarProps {
  displayName: string;
  email?: string;
  avatarStyle?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ displayName, email, avatarStyle = 'initials', size = 'md', className = '' }: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-[12px]',
    md: 'w-10 h-10 text-[14px]',
    lg: 'w-12 h-12 text-[16px]',
    xl: 'w-20 h-20 text-[24px]'
  };

  const seed = encodeURIComponent(email || displayName || 'noverde');
  const src = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${seed}`;

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
    <div className={`rounded-full border border-white/5 overflow-hidden shrink-0 flex items-center justify-center bg-slate-900 text-sky-500 font-bold ${sizeClasses[size]} ${className}`}>
      {!hasError ? (
        <img 
          src={src} 
          alt={displayName} 
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

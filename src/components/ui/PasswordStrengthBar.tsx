import React from 'react';

interface PasswordStrengthBarProps {
  password: string;
}

interface StrengthResult {
  score: number; // 0-4
  label: string;
  color: string;
  bg: string;
}

function getStrength(password: string): StrengthResult {
  if (!password) return { score: 0, label: '', color: '#3f3f3f', bg: '#1a1a1a' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Normalizar para 0-4
  const capped = Math.min(score, 4);

  const map: Record<number, StrengthResult> = {
    0: { score: 0, label: 'Muito fraca', color: '#ef4444', bg: '#450a0a' },
    1: { score: 1, label: 'Fraca',       color: '#f97316', bg: '#431407' },
    2: { score: 2, label: 'Média',       color: '#eab308', bg: '#422006' },
    3: { score: 3, label: 'Forte',       color: '#22c55e', bg: '#052e16' },
    4: { score: 4, label: 'Muito forte', color: '#10b981', bg: '#022c22' },
  };

  return map[capped];
}

export const PasswordStrengthBar: React.FC<PasswordStrengthBarProps> = ({ password }) => {
  const { score, label, color, bg } = getStrength(password);

  if (!password) return null;

  return (
    <div style={{ marginTop: '8px' }}>
      {/* Barra de progresso com 4 segmentos */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              backgroundColor: score >= seg ? color : '#2a2a2a',
              transition: 'background-color 0.3s ease',
            }}
          />
        ))}
      </div>
      {/* Label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#737373' }}>Força da senha</span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color,
            backgroundColor: bg,
            padding: '2px 8px',
            borderRadius: '4px',
            border: `1px solid ${color}33`,
          }}
        >
          {label}
        </span>
      </div>
      {/* Dica quando senha é curta */}
      {password.length < 12 && (
        <p style={{ fontSize: '11px', color: '#737373', marginTop: '4px', marginBottom: 0 }}>
          Mínimo de 12 caracteres — ainda faltam {12 - password.length}
        </p>
      )}
    </div>
  );
};

import React from 'react';
import { UserProfile } from '../../types';
import { KnowledgeBaseSection } from '../dashboard/KnowledgeBaseSection';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  theme?: 'light' | 'dark';
}

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({
  isOpen,
  onClose,
  profile,
  showToast,
  theme = 'dark'
}) => {
  if (!isOpen) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Base de Conhecimento"
      tabIndex={0}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in outline-none"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div 
        className={`w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto custom-scrollbar ${
          theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <KnowledgeBaseSection
          profile={profile}
          showToast={showToast}
          theme={theme}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

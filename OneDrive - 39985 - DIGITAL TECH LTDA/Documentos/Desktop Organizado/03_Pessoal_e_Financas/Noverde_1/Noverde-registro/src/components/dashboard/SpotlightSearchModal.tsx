import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlass, 
  X, 
  BookOpen, 
  Copy, 
  Check, 
  Command, 
  PushPin, 
  WarningCircle, 
  ArrowRight 
} from '@phosphor-icons/react';
import { KnowledgeArticle, UserProfile } from '../../types';
import { subscribeKnowledgeArticles } from '../../lib/knowledgeBaseService';

interface SpotlightSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSelectArticle?: (article: KnowledgeArticle) => void;
}

export const SpotlightSearchModal: React.FC<SpotlightSearchModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSelectArticle
}) => {
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.organizationId || !isOpen) return;
    const unsub = subscribeKnowledgeArticles(profile.organizationId, (data) => {
      setArticles(data);
    });
    return () => unsub();
  }, [profile.organizationId, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();
  const filtered = articles.filter(art => {
    if (!q) return true;
    return (
      art.title.toLowerCase().includes(q) ||
      art.content.toLowerCase().includes(q) ||
      (art.copyableScript && art.copyableScript.toLowerCase().includes(q)) ||
      (art.tags && art.tags.some(t => t.toLowerCase().includes(q)))
    );
  }).slice(0, 8); // Top 8 resultados rápidos

  const handleCopyScript = (art: KnowledgeArticle, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = art.copyableScript || art.content;
    navigator.clipboard.writeText(text);
    setCopiedId(art.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl shadow-slate-950 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de Pesquisa Spotlight */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900/90">
          <MagnifyingGlass size={22} className="text-sky-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por scripts, comunicados, políticas ou palavras-chave... (Ex: #Pix, Desconto)"
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-slate-500 outline-none font-medium"
          />
          {query && (
            <button 
              type="button" 
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold hover:text-white hover:bg-slate-700 transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Lista de Resultados */}
        <div className="overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <BookOpen size={40} className="mx-auto opacity-30" />
              <p className="text-xs font-semibold">Nenhum resultado encontrado para "{query}".</p>
            </div>
          ) : (
            filtered.map(art => (
              <div
                key={art.id}
                onClick={() => {
                  if (onSelectArticle) onSelectArticle(art);
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-slate-950/50 hover:bg-slate-800/60 border border-slate-800/80 hover:border-sky-500/30 transition-all cursor-pointer group flex items-start justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {art.isPinned && <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-400 font-bold">📌 Fixado</span>}
                    {art.isUrgent && <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 font-bold">🚨 Urgente</span>}
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-bold uppercase tracking-wider">
                      {art.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors truncate">
                    {art.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {art.copyableScript || art.content}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-center">
                  {art.copyableScript && (
                    <button
                      type="button"
                      onClick={(e) => handleCopyScript(art, e)}
                      className={`p-2 rounded-xl text-xs font-bold transition-all ${
                        copiedId === art.id 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-slate-800 text-slate-300 hover:bg-sky-500 hover:text-white'
                      }`}
                      title="Copiar Script"
                    >
                      {copiedId === art.id ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  )}
                  <ArrowRight size={16} className="text-slate-600 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <Command size={14} />
            <span>Navegação Rápida na Base de Conhecimento</span>
          </div>
          <div>Exibindo {filtered.length} de {articles.length} itens</div>
        </div>
      </div>
    </div>
  );
};

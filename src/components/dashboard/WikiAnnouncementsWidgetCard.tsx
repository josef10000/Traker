import React from 'react';
import { BookOpen, Megaphone, CaretRight, PushPin, Sparkle } from '@phosphor-icons/react';
import { KnowledgeArticle, UserProfile } from '../../types';

interface WikiAnnouncementsWidgetCardProps {
  articles?: KnowledgeArticle[];
  profile: UserProfile;
  onOpenWiki: () => void;
  theme?: 'dark' | 'light';
}

export const WikiAnnouncementsWidgetCard: React.FC<WikiAnnouncementsWidgetCardProps> = ({
  articles = [],
  profile,
  onOpenWiki,
  theme = 'dark'
}) => {
  const announcements = articles.filter(a => a.isAnnouncement || a.category === 'Comunicados');
  const topAnnouncements = announcements.slice(0, 3);
  const isDark = theme === 'dark';

  return (
    <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
      isDark
        ? 'bg-slate-900/60 border-purple-500/20 hover:border-purple-500/40 shadow-xl shadow-purple-950/10'
        : 'bg-white border-purple-200 hover:border-purple-300 shadow-md'
    }`}>
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Megaphone size={22} weight="bold" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>Comunicados da Wiki Corporativa</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Oficial
              </span>
            </h3>
            <p className="text-xs text-slate-400">Avisos urgentes, scripts de atendimento e circulares internas</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenWiki}
          className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
        >
          <span>Abrir Wiki</span>
          <CaretRight size={14} />
        </button>
      </div>

      <div className="pt-4 space-y-3">
        {topAnnouncements.length > 0 ? (
          topAnnouncements.map((art) => (
            <div
              key={art.id}
              onClick={onOpenWiki}
              className="p-3.5 rounded-2xl bg-slate-950/40 hover:bg-slate-950/70 border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer flex items-start gap-3 group"
            >
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                <PushPin size={16} weight="fill" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                    {art.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                    {new Date(art.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                  {art.content.replace(/<[^>]*>?/gm, '').substring(0, 120)}...
                </p>
              </div>
            </div>
          ))
        ) : (
          <div 
            onClick={onOpenWiki}
            className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 text-center cursor-pointer hover:border-purple-500/30 transition-all"
          >
            <BookOpen size={28} className="mx-auto text-purple-400 opacity-40 mb-1" />
            <p className="text-xs font-bold text-slate-300">Base de Conhecimento Wiki Disponível</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Clique para consultar manuais, procedimentos e artigos normativos.</p>
          </div>
        )}
      </div>
    </div>
  );
};

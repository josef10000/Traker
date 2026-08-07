import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  MagnifyingGlass, 
  Plus, 
  PushPin, 
  WarningCircle, 
  Copy, 
  Check, 
  PencilSimple, 
  Trash, 
  Tag, 
  Megaphone, 
  FileText, 
  Question, 
  ChatTeardropText, 
  Sparkle, 
  X,
  CaretLeft,
  CaretRight,
  Image as ImageIcon,
  UploadSimple,
  Eye,
  CheckCircle,
  Star,
  TextT,
  Clock
} from '@phosphor-icons/react';
import { KnowledgeArticle, KnowledgeCategory, UserProfile } from '../../types';
import { 
  subscribeKnowledgeArticles, 
  saveKnowledgeArticle, 
  deleteKnowledgeArticle,
  acknowledgeKnowledgeArticle
} from '../../lib/knowledgeBaseService';
import { uploadImage } from '../../lib/imageUpload';
import { notifyAnnouncementPublished } from '../../lib/notifications';
import { auth } from '../../lib/firebase';

interface KnowledgeBaseSectionProps {
  profile: UserProfile;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  theme?: 'light' | 'dark';
  onClose?: () => void;
}

export const KnowledgeBaseSection: React.FC<KnowledgeBaseSectionProps> = ({
  profile,
  showToast,
  theme = 'dark',
  onClose
}) => {
  const isDark = theme === 'dark';
  const canManage = profile.role === 'supervisor' || profile.role === 'manager' || profile.role === 'coordinator' || profile.role === 'super_admin' || profile.role === 'monitor';

  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | 'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sistema de Favoritos salvos por operador
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`tracker_favorites_${profile.uid}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(articleId) 
        ? prev.filter(id => id !== articleId) 
        : [...prev, articleId];
      try {
        localStorage.setItem(`tracker_favorites_${profile.uid}`, JSON.stringify(next));
      } catch (err) {
        console.error('Erro ao salvar favoritos:', err);
      }
      return next;
    });
  };

  // Estado do Modo Teleprompter Lateral Flutuante
  const [teleprompterArticle, setTeleprompterArticle] = useState<KnowledgeArticle | null>(null);
  const [teleprompterFontSize, setTeleprompterFontSize] = useState<number>(16);

  // Extração de Tags Únicas de todos os artigos para a Nuvem de Tags
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    articles.forEach(art => {
      if (art.tags && Array.isArray(art.tags)) {
        art.tags.forEach(t => set.add(t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`));
      }
    });
    return Array.from(set).slice(0, 12);
  }, [articles]);

  // Paginação: 6 por página
  const ITEMS_PER_PAGE = 6;
  const [currentPage, setCurrentPage] = useState(1);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  // Formulário Modal de Criação / Edição
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<KnowledgeCategory>('script');
  const [formContent, setFormContent] = useState('');
  const [enableCopyableScript, setEnableCopyableScript] = useState(false);
  const [formCopyableScript, setFormCopyableScript] = useState('');
  const [formImageUrl, setFormImageUrl] = useState<string | undefined>(undefined);
  const [formTagsStr, setFormTagsStr] = useState('');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formIsUrgent, setFormIsUrgent] = useState(false);
  const [formRequireAck, setFormRequireAck] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAcknowledgeArticle = async (articleId: string) => {
    try {
      await acknowledgeKnowledgeArticle(profile.organizationId || 'sandbox-test', articleId, profile.uid);
      if (showToast) showToast('Confirmação de leitura e ciência registrada!', 'success');
    } catch (err) {
      console.error('Erro ao confirmar ciente do comunicado:', err);
      if (showToast) showToast('Erro ao registrar ciência.', 'error');
    }
  };

  // Escuta os artigos da organização em tempo real
  useEffect(() => {
    if (!profile.organizationId) return;
    const unsub = subscribeKnowledgeArticles(profile.organizationId, (data) => {
      setArticles(data);
    });
    return () => unsub();
  }, [profile.organizationId]);

  // Reset da página atual ao filtrar por categoria ou termo de busca
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, selectedTag]);

  // Filtragem inteligente por categoria, tag e palavra-chave
  const filteredArticles = useMemo(() => {
    return articles.filter(art => {
      let matchesCat = true;
      if (selectedCategory === 'favorites') {
        matchesCat = favorites.includes(art.id);
      } else if (selectedCategory !== 'all') {
        matchesCat = art.category === selectedCategory;
      }

      const matchesTag = !selectedTag || (art.tags && art.tags.some(t => {
        const normTag = t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`;
        return normTag.toLowerCase() === selectedTag.toLowerCase();
      }));

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCat && matchesTag;

      const matchesQuery = 
        art.title.toLowerCase().includes(q) ||
        art.content.toLowerCase().includes(q) ||
        (art.copyableScript && art.copyableScript.toLowerCase().includes(q)) ||
        (art.tags && art.tags.some(t => t.toLowerCase().includes(q)));

      return matchesCat && matchesTag && matchesQuery;
    });
  }, [articles, selectedCategory, searchQuery, selectedTag, favorites]);

  // Cálculo da contagem por categoria
  const categoryCounts = useMemo(() => {
    return {
      all: articles.length,
      favorites: favorites.length,
      script: articles.filter(a => a.category === 'script').length,
      announcement: articles.filter(a => a.category === 'announcement').length,
      policy: articles.filter(a => a.category === 'policy').length,
      faq: articles.filter(a => a.category === 'faq').length,
    };
  }, [articles, favorites]);

  // Helper para destacar variáveis dinâmicas no script ex: [NOME_DO_CLIENTE]
  const renderHighlightedScript = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\[[^\]]+\])/g);
    return parts.map((part, idx) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        return (
          <span 
            key={idx} 
            className="inline-block px-1.5 py-0.5 my-0.5 rounded-md text-[11px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Cálculo da Paginação (6 itens por página)
  const totalPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE) || 1;

  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredArticles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredArticles, currentPage]);

  const handleCopyScript = (art: KnowledgeArticle) => {
    const text = art.copyableScript || art.content;
    navigator.clipboard.writeText(text);
    setCopiedId(art.id);
    if (showToast) showToast('Script copiado com sucesso!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploadedUrl = await uploadImage(file, { folder: 'kb-1year', retentionDays: 365 });
      setFormImageUrl(uploadedUrl);
      if (showToast) showToast('Imagem anexada com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      if (showToast) showToast('Erro ao carregar a imagem selecionada.', 'error');
    }
  };

  const handleOpenNewForm = () => {
    setEditingArticleId(null);
    setFormTitle('');
    setFormCategory('script');
    setFormContent('');
    setEnableCopyableScript(false);
    setFormCopyableScript('');
    setFormImageUrl(undefined);
    setFormTagsStr('');
    setFormIsPinned(false);
    setFormIsUrgent(false);
    setFormRequireAck(false);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (art: KnowledgeArticle) => {
    setEditingArticleId(art.id);
    setFormTitle(art.title);
    setFormCategory(art.category);
    setFormContent(art.content);
    const hasScript = Boolean(art.copyableScript && art.copyableScript.trim().length > 0);
    setEnableCopyableScript(hasScript);
    setFormCopyableScript(art.copyableScript || '');
    setFormImageUrl(art.imageUrl || undefined);
    setFormTagsStr(art.tags ? art.tags.join(', ') : '');
    setFormIsPinned(art.isPinned);
    setFormIsUrgent(art.isUrgent);
    setFormRequireAck(art.requireAcknowledgement || false);
    setIsFormOpen(true);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    setIsSaving(true);
    try {
      const tags = formTagsStr
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const finalScript = (enableCopyableScript && formCopyableScript.trim()) ? formCopyableScript.trim() : undefined;

      const articleId = await saveKnowledgeArticle({
        id: editingArticleId || undefined,
        organizationId: profile.organizationId || 'sandbox-test',
        title: formTitle.trim(),
        category: formCategory,
        content: formContent.trim(),
        copyableScript: finalScript,
        imageUrl: formImageUrl,
        tags: tags.length > 0 ? tags : undefined,
        isPinned: formIsPinned,
        isUrgent: formIsUrgent,
        requireAcknowledgement: formRequireAck,
        createdByUid: profile.uid,
        createdByName: profile.displayName || profile.email.split('@')[0],
        createdByRole: profile.role
      });

      if (formCategory === 'announcement' || formIsUrgent) {
        await notifyAnnouncementPublished(
          profile.organizationId || 'sandbox-test',
          formTitle.trim(),
          articleId,
          profile.displayName || profile.email.split('@')[0]
        );
      }

      if (showToast) showToast(editingArticleId ? 'Artigo atualizado!' : 'Artigo publicado!', 'success');
      setIsFormOpen(false);
    } catch (e) {
      console.error('Erro ao salvar artigo:', e);
      if (showToast) showToast('Erro ao salvar artigo na Base de Conhecimento.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este artigo/script?')) return;
    try {
      await deleteKnowledgeArticle(profile.organizationId || 'sandbox-test', articleId);
      if (showToast) showToast('Artigo excluído com sucesso.', 'info');
    } catch (e) {
      console.error('Erro ao excluir artigo:', e);
      if (showToast) showToast('Erro ao excluir artigo.', 'error');
    }
  };

  const getCategoryBadge = (cat: KnowledgeCategory) => {
    switch (cat) {
      case 'script':
        return <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold text-[10px]">💬 Script</span>;
      case 'announcement':
        return <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-[10px]">🚨 Comunicado</span>;
      case 'policy':
        return <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold text-[10px]">📜 Política</span>;
      case 'faq':
        return <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">❓ FAQ</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-lg bg-slate-500/10 text-slate-400 border border-slate-500/20 font-bold text-[10px]">📋 Geral</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isDark ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-md shadow-xl shadow-slate-950/40' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-inner shrink-0">
              <BookOpen size={22} weight="duotone" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2.5">
                <span>Base de Conhecimento & Roteiros</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-400 font-black border border-sky-500/30">
                  {filteredArticles.length} {filteredArticles.length === 1 ? 'item' : 'itens'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">Guias operacionais, roteiros de fala de alta conversão e comunicados.</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por termo ou tag..."
                className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold outline-none border transition-all ${
                  isDark 
                    ? 'bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-500'
                }`}
              />
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {canManage && (
              <button
                type="button"
                onClick={handleOpenNewForm}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-sky-500/25 transition-all shrink-0 cursor-pointer"
              >
                <Plus size={15} weight="bold" />
                <span className="hidden sm:inline">Novo Artigo / Script</span>
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Fechar Base de Conhecimento"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0 custom-scrollbar">
              {[
                { id: 'all', label: 'Todos', count: categoryCounts.all },
                { id: 'favorites', label: '⭐ Favoritos', count: categoryCounts.favorites },
                { id: 'script', label: '💬 Scripts', count: categoryCounts.script },
                { id: 'announcement', label: '🚨 Comunicados', count: categoryCounts.announcement },
                { id: 'policy', label: '📜 Políticas', count: categoryCounts.policy },
                { id: 'faq', label: '❓ FAQ', count: categoryCounts.faq }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 ring-1 ring-sky-400/50'
                      : isDark ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                    selectedCategory === cat.id
                      ? 'bg-white/20 text-white'
                      : isDark ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>

            {(selectedCategory !== 'all' || searchQuery || selectedTag) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setSelectedTag(null);
                }}
                className="text-[11px] font-bold text-sky-400 hover:text-sky-300 transition-colors whitespace-nowrap shrink-0"
              >
                Limpar Filtros
              </button>
            )}
          </div>

          {/* Nuvem de Tags Clicáveis */}
          {availableTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-white/5 text-xs">
              <span className="text-[11px] font-bold text-slate-500 shrink-0">Tags:</span>
              {availableTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(prev => prev === tag ? null : tag)}
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                    selectedTag === tag
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredArticles.length === 0 ? (
          <div className="md:col-span-2 py-20 text-center text-slate-500 space-y-4 bg-slate-900/30 rounded-3xl border border-white/5">
            <BookOpen size={56} className="mx-auto opacity-20" />
            <p className="text-sm font-semibold">Nenhum script ou artigo encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          paginatedArticles.map(art => {
            const readingTimeMin = Math.max(1, Math.ceil(((art.content?.length || 0) + (art.copyableScript?.length || 0)) / 400));
            const isUnreadUrgent = art.requireAcknowledgement && !art.acknowledgements?.[profile.uid];

            return (
              <div
                key={art.id}
                className={`p-6 rounded-3xl border transition-all flex flex-col justify-between relative group ${
                  art.isUrgent
                    ? 'bg-rose-950/20 border-rose-500/40 shadow-xl shadow-rose-500/5'
                    : art.isPinned
                    ? 'bg-sky-950/20 border-sky-500/30 shadow-xl shadow-sky-500/5'
                    : isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isUnreadUrgent && <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] animate-pulse">🟢 Novo</span>}
                      {art.isPinned && <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-400 font-bold text-[10px]">📌 Fixado</span>}
                      {art.isUrgent && <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 font-bold text-[10px] animate-pulse">🚨 Urgente</span>}
                      {getCategoryBadge(art.category)}
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold ml-1">
                        <Clock size={12} className="text-slate-500" />
                        <span>{readingTimeMin} min</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(art.id, e)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          favorites.includes(art.id) 
                            ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20' 
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/10'
                        }`}
                        title={favorites.includes(art.id) ? 'Remover dos Favoritos' : 'Marcar como Favorito'}
                      >
                        <Star size={16} weight={favorites.includes(art.id) ? 'fill' : 'regular'} />
                      </button>

                      {canManage && (
                        <>
                          <button type="button" onClick={() => handleOpenEditForm(art)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"><PencilSimple size={15} /></button>
                          <button type="button" onClick={() => handleDeleteArticle(art.id)} className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"><Trash size={15} /></button>
                        </>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-black tracking-tight text-white mb-2">{art.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium mb-4 whitespace-pre-wrap">{art.content}</p>

                  {art.imageUrl && (
                    <div 
                      role="button"
                      tabIndex={0}
                      onClick={() => setPreviewModalImage(art.imageUrl || null)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreviewModalImage(art.imageUrl || null); } }}
                      className="mb-4 relative rounded-2xl overflow-hidden border border-white/10 group/img cursor-pointer bg-slate-950/50 outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <img 
                        src={art.imageUrl} 
                        alt={art.title} 
                        className="w-full max-h-64 object-cover group-hover/img:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs">
                        <Eye size={18} />
                        <span>Clique para Ampliar</span>
                      </div>
                    </div>
                  )}

                  {art.copyableScript && (
                    <div className={`p-4 rounded-2xl border mb-4 space-y-2.5 transition-colors ${
                      isDark ? 'bg-slate-950/70 border-white/10 text-slate-200 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-800 shadow-sm'
                    }`}>
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs font-bold tracking-tight text-sky-400 flex items-center gap-1.5">
                          💬 Roteiro de Atendimento
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setTeleprompterArticle(art)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                            title="Abrir Gaveta Lateral do Teleprompter"
                          >
                            <PushPin size={13} />
                            <span>Teleprompter</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyScript(art)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              copiedId === art.id ? 'bg-emerald-500 text-white' : 'bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-white'
                            }`}
                          >
                            {copiedId === art.id ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar</>}
                          </button>
                        </div>
                      </div>
                      <div className="font-sans text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap select-all font-medium opacity-95">
                        {renderHighlightedScript(art.copyableScript)}
                      </div>
                    </div>
                  )}

                  {/* BLOCO DE CONFIRMAÇÃO DE LEITURA DO ARTIGO/COMUNICADO */}
                  {art.requireAcknowledgement && (
                    <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 mb-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-300 flex items-center gap-1.5">
                          <CheckCircle size={15} className={art.acknowledgements?.[profile.uid] ? 'text-emerald-400' : 'text-amber-400'} />
                          <span>Ciência do Comunicado</span>
                        </span>

                        {art.acknowledgements?.[profile.uid] ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            🟢 Ciente em {new Date(art.acknowledgements[profile.uid]).toLocaleDateString('pt-BR')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAcknowledgeArticle(art.id)}
                            className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle size={14} weight="bold" />
                            <span>Confirmar Ciência</span>
                          </button>
                        )}
                      </div>

                      {canManage && art.acknowledgements && (
                        <p className="text-[10px] text-slate-400 font-semibold pt-1 border-t border-white/5">
                          📊 <strong>Adesão da Equipe:</strong> {Object.keys(art.acknowledgements).length} colaborador(es) confirmaram ciência.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {art.tags?.map((tag, idx) => <span key={idx} className="px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5">#{tag}</span>)}
                  </div>
                  <span>Por <strong className="text-slate-300">{art.createdByName}</strong> • {new Date(art.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10">
          <span className="text-xs text-slate-400 font-semibold">
            Exibindo <strong className="text-slate-200">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> a <strong className="text-slate-200">{Math.min(currentPage * ITEMS_PER_PAGE, filteredArticles.length)}</strong> de <strong className="text-slate-200">{filteredArticles.length}</strong> artigos
          </span>
          <div className="flex items-center gap-1.5">
            <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors">
              <CaretLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button key={page} type="button" onClick={() => setCurrentPage(page)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentPage === page ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                {page}
              </button>
            ))}
            <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors">
              <CaretRight size={16} />
            </button>
          </div>
        </div>
      )}

      {previewModalImage && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Visualização expandida de imagem"
          tabIndex={0}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 outline-none" 
          onClick={() => setPreviewModalImage(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setPreviewModalImage(null); }}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 shadow-2xl" 
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
          >
            <img src={previewModalImage} alt="Visualização expandida" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
            <button 
              type="button"
              aria-label="Fechar imagem"
              onClick={() => setPreviewModalImage(null)} 
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 text-white hover:bg-rose-500 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar ${
            isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <Sparkle size={20} className="text-sky-400" />
                <span>{editingArticleId ? 'Editar Artigo' : 'Publicar Novo Artigo'}</span>
              </h3>
              <button type="button" onClick={() => setIsFormOpen(false)} className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveArticle} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Título</label>
                  <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-bold outline-none text-white" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Categoria</label>
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as KnowledgeCategory)} className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-bold outline-none text-white cursor-pointer">
                    <option value="script">💬 Script</option>
                    <option value="announcement">🚨 Comunicado</option>
                    <option value="policy">📜 Política</option>
                    <option value="faq">❓ FAQ</option>
                    <option value="general">📋 Geral</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Descrição / Instruções</label>
                <textarea rows={3} value={formContent} onChange={(e) => setFormContent(e.target.value)} className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-medium outline-none text-white custom-scrollbar" required />
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-wider text-sky-400">📷 Imagem Ilustrativa</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold cursor-pointer transition-all">
                    <UploadSimple size={16} />
                    <span>Selecionar Imagem...</span>
                    <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                  </label>
                  {formImageUrl && (
                    <button type="button" onClick={() => setFormImageUrl(undefined)} className="text-xs text-rose-400 hover:underline font-bold">Remover Imagem</button>
                  )}
                </div>
                {formImageUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 max-h-44 w-full bg-slate-900 flex items-center justify-center">
                    <img src={formImageUrl} alt="Pré-visualização" className="max-h-44 object-contain rounded-xl" />
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-white/5 space-y-3">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-emerald-400 hover:text-emerald-300">
                  <input type="checkbox" checked={formRequireAck} onChange={(e) => setFormRequireAck(e.target.checked)} className="w-4 h-4 rounded accent-emerald-500" />
                  <span>🟢 Exigir Confirmação de Leitura e Ciência dos Colaboradores</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-sky-400 hover:text-sky-300">
                  <input type="checkbox" checked={enableCopyableScript} onChange={(e) => { setEnableCopyableScript(e.target.checked); if (!e.target.checked) setFormCopyableScript(''); }} className="w-4 h-4 rounded accent-sky-500" />
                  <span>💬 Incluir Bloco de Roteiro de Atendimento</span>
                </label>
                {enableCopyableScript && (
                  <textarea rows={3} value={formCopyableScript} onChange={(e) => setFormCopyableScript(e.target.value)} placeholder="Roteiro..." className="w-full p-3.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-sans text-slate-200 outline-none leading-relaxed custom-scrollbar" />
                )}
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-white/10">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-sky-500/20 cursor-pointer disabled:opacity-50">
                  {isSaving ? 'Salvando...' : 'Publicar Conteúdo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TELEPROMPTER GAVETA LATERAL FLUTUANTE */}
      {teleprompterArticle && (
        <div className="fixed inset-0 z-[110] flex justify-end bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:w-[480px] h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col p-6 space-y-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <PushPin size={20} className="text-sky-400" />
                <h3 className="text-base font-bold text-white">Modo Teleprompter</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1 border border-slate-700">
                  <button 
                    type="button" 
                    onClick={() => setTeleprompterFontSize(prev => Math.max(12, prev - 2))}
                    className="p-1 rounded text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700"
                    title="Diminuir Fonte"
                  >
                    A-
                  </button>
                  <span className="text-xs font-bold text-slate-400 px-1">{teleprompterFontSize}px</span>
                  <button 
                    type="button" 
                    onClick={() => setTeleprompterFontSize(prev => Math.min(28, prev + 2))}
                    className="p-1 rounded text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700"
                    title="Aumentar Fonte"
                  >
                    A+
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setTeleprompterArticle(null)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              <h2 className="text-lg font-black text-white">{teleprompterArticle.title}</h2>
              <div 
                className="font-sans leading-relaxed whitespace-pre-wrap text-slate-200 bg-slate-950/60 p-4 rounded-2xl border border-slate-800"
                style={{ fontSize: `${teleprompterFontSize}px` }}
              >
                {renderHighlightedScript(teleprompterArticle.copyableScript || teleprompterArticle.content)}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleCopyScript(teleprompterArticle)}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                  copiedId === teleprompterArticle.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/20'
                }`}
              >
                {copiedId === teleprompterArticle.id ? <><Check size={16} /> Copiado para a Área de Transferência</> : <><Copy size={16} /> Copiar Script Completo</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

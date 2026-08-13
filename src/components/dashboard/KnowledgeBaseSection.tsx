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
  Megaphone, 
  FileText, 
  Question, 
  Sparkle, 
  X,
  CaretLeft,
  CaretRight,
  Eye,
  CheckCircle,
  Star,
  Clock,
  ArrowLeft,
  BookmarkSimple,
  SlidersHorizontal,
  UploadSimple,
  Stack,
  FileCode,
  ShieldCheck
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

  // Artigo selecionado para leitura imersiva (Estilo Wiki Article Reader)
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Favoritos salvos por operador
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`tracker_favorites_${profile.uid}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (articleId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  // Teleprompter Flutuante Lateral
  const [teleprompterArticle, setTeleprompterArticle] = useState<KnowledgeArticle | null>(null);
  const [teleprompterFontSize, setTeleprompterFontSize] = useState<number>(16);

  // Banner de Comunicados no Topo (Slider Index)
  const [announcementIndex, setAnnouncementIndex] = useState(0);

  // Modal Image Preview
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

  // Escuta os artigos da organização em tempo real
  useEffect(() => {
    if (!profile.organizationId) return;
    const unsub = subscribeKnowledgeArticles(profile.organizationId, (data) => {
      setArticles(data);
    });
    return () => unsub();
  }, [profile.organizationId]);

  // Artigos de Comunicados & Avisos para o Banner Superior
  const urgentAnnouncements = useMemo(() => {
    return articles.filter(art => art.category === 'announcement' || art.isUrgent || art.requireAcknowledgement);
  }, [articles]);

  // Reset do índice do banner se houver mudanças nos comunicados
  useEffect(() => {
    if (announcementIndex >= urgentAnnouncements.length) {
      setAnnouncementIndex(0);
    }
  }, [urgentAnnouncements, announcementIndex]);

  // Tags populares extraídas
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    articles.forEach(art => {
      if (art.tags && Array.isArray(art.tags)) {
        art.tags.forEach(t => set.add(t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`));
      }
    });
    return Array.from(set).slice(0, 10);
  }, [articles]);

  // Filtragem inteligente de artigos
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

  // Paginação dos artigos (máximo 7 por página)
  const ITEMS_PER_PAGE = 7;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset da página atual ao alterar os filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, selectedTag]);

  const totalPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE) || 1;

  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredArticles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredArticles, currentPage]);

  // Contagem de categorias para a Sidebar
  const categoryCounts = useMemo(() => {
    return {
      all: articles.length,
      favorites: favorites.length,
      announcement: articles.filter(a => a.category === 'announcement').length,
      script: articles.filter(a => a.category === 'script').length,
      policy: articles.filter(a => a.category === 'policy').length,
      faq: articles.filter(a => a.category === 'faq').length,
      general: articles.filter(a => a.category === 'general').length,
    };
  }, [articles, favorites]);

  // Artigo atualmente aberto no Leitor
  const activeArticle = useMemo(() => {
    if (!selectedArticleId) return null;
    return articles.find(a => a.id === selectedArticleId) || null;
  }, [articles, selectedArticleId]);

  const handleAcknowledgeArticle = async (articleId: string) => {
    try {
      await acknowledgeKnowledgeArticle(profile.organizationId || 'sandbox-test', articleId, profile.uid);
      if (showToast) showToast('Confirmação de leitura e ciência registrada!', 'success');
    } catch (err) {
      console.error('Erro ao registrar ciência:', err);
      if (showToast) showToast('Erro ao registrar ciência.', 'error');
    }
  };

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

  const handleOpenEditForm = (art: KnowledgeArticle, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const handleDeleteArticle = async (articleId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir este artigo/script?')) return;
    try {
      await deleteKnowledgeArticle(profile.organizationId || 'sandbox-test', articleId);
      if (selectedArticleId === articleId) {
        setSelectedArticleId(null);
      }
      if (showToast) showToast('Artigo excluído com sucesso.', 'info');
    } catch (e) {
      console.error('Erro ao excluir artigo:', e);
      if (showToast) showToast('Erro ao excluir artigo.', 'error');
    }
  };

  const renderHighlightedScript = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\[[^\]]+\])/g);
    return parts.map((part, idx) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        return (
          <span 
            key={idx} 
            className="inline-block px-2 py-0.5 my-0.5 rounded-md text-[11px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const getCategoryBadge = (cat: KnowledgeCategory) => {
    switch (cat) {
      case 'script':
        return <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 font-bold text-[10px] flex items-center gap-1"><FileCode size={12} /> Script</span>;
      case 'announcement':
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold text-[10px] flex items-center gap-1"><Megaphone size={12} /> Comunicado</span>;
      case 'policy':
        return <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 font-bold text-[10px] flex items-center gap-1"><ShieldCheck size={12} /> Política</span>;
      case 'faq':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] flex items-center gap-1"><Question size={12} /> FAQ</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30 font-bold text-[10px] flex items-center gap-1"><FileText size={12} /> Geral</span>;
    }
  };

  const currentAnnouncement = urgentAnnouncements[announcementIndex] || null;

  return (
    <div className="space-y-5">
      {/* BANNER SUPERIOR DE COMUNICADOS & AVISOS IMPORTANTES */}
      {urgentAnnouncements.length > 0 && currentAnnouncement && (
        <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-slate-950 p-5 shadow-xl shadow-amber-500/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 flex-1">
              <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
                <Megaphone size={24} weight="duotone" className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-extrabold text-[10px] uppercase tracking-wider border border-amber-500/30">
                    🚨 Comunicado da Diretoria
                  </span>
                  {currentAnnouncement.requireAcknowledgement && !currentAnnouncement.acknowledgements?.[profile.uid] && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 font-extrabold text-[10px] animate-pulse border border-rose-500/30">
                      Ciente Pendente
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 font-medium">
                    {new Date(currentAnnouncement.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <h3 className="text-base font-black text-white tracking-tight">
                  {currentAnnouncement.title}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-medium">
                  {currentAnnouncement.content}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
              {currentAnnouncement.requireAcknowledgement && (
                currentAnnouncement.acknowledgements?.[profile.uid] ? (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle size={15} weight="bold" />
                    <span>Ciente Confirmado</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAcknowledgeArticle(currentAnnouncement.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle size={15} weight="bold" />
                    <span>Confirmar Ciência</span>
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => setSelectedArticleId(currentAnnouncement.id)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Ler Artigo Completo
              </button>

              {urgentAnnouncements.length > 1 && (
                <div className="flex items-center gap-1 pl-2 border-l border-white/10">
                  <button
                    type="button"
                    onClick={() => setAnnouncementIndex(prev => (prev === 0 ? urgentAnnouncements.length - 1 : prev - 1))}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Comunicado Anterior"
                  >
                    <CaretLeft size={14} />
                  </button>
                  <span className="text-[10px] font-extrabold text-slate-400 px-1">
                    {announcementIndex + 1}/{urgentAnnouncements.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAnnouncementIndex(prev => (prev === urgentAnnouncements.length - 1 ? 0 : prev + 1))}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Próximo Comunicado"
                  >
                    <CaretRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BARRA DE FERRAMENTAS SUPERIOR (BUSCA & AÇÕES WIKI) */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isDark ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-md shadow-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-inner shrink-0">
              <BookOpen size={22} weight="duotone" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2.5">
                <span>Wiki Corporativa & Procedimentos</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-400 font-black border border-sky-500/30">
                  {articles.length} {articles.length === 1 ? 'procedimento' : 'procedimentos'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">Acervo centralizado de roteiros, diretrizes operacionais e manuais.</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar procedimentos na Wiki..."
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
                <span className="hidden sm:inline">Novo Conteúdo</span>
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Fechar Wiki"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Nuvem de Tags Clicáveis */}
        {availableTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 mt-3 border-t border-white/5 text-xs">
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

      {/* CORPO DA WIKI (LAYOUT NOTION EN 2 COLUNAS: SIDEBAR + CONTEÚDO PRINCIPAL) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SIDEBAR ESQUERDA (NAVEGAÇÃO POR CATEGORIAS & FILTROS DA WIKI - FIXA NA TELA) */}
        <div className={`lg:col-span-3 lg:sticky lg:top-4 self-start rounded-2xl border p-4 space-y-4 ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between px-2 pb-2 border-b border-white/5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Stack size={14} className="text-sky-400" />
              <span>Navegação Wiki</span>
            </span>
            {(selectedCategory !== 'all' || searchQuery || selectedTag) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setSelectedTag(null);
                }}
                className="text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>

          <nav className="space-y-1">
            {[
              { id: 'all', label: 'Todos os Artigos', icon: <BookOpen size={16} />, count: categoryCounts.all },
              { id: 'favorites', label: 'Meus Favoritos', icon: <Star size={16} />, count: categoryCounts.favorites },
              { id: 'announcement', label: 'Comunicados & Avisos', icon: <Megaphone size={16} />, count: categoryCounts.announcement },
              { id: 'script', label: 'Scripts de Atendimento', icon: <FileCode size={16} />, count: categoryCounts.script },
              { id: 'policy', label: 'Políticas & Normas', icon: <ShieldCheck size={16} />, count: categoryCounts.policy },
              { id: 'faq', label: 'Perguntas Frequentes', icon: <Question size={16} />, count: categoryCounts.faq },
              { id: 'general', label: 'Gerais & Manuais', icon: <FileText size={16} />, count: categoryCounts.general }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id as any);
                  setSelectedArticleId(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={selectedCategory === cat.id ? 'text-white' : 'text-slate-400'}>
                    {cat.icon}
                  </span>
                  <span>{cat.label}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                  selectedCategory === cat.id 
                    ? 'bg-white/20 text-white' 
                    : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* ÁREA PRINCIPAL DIREITA (LEITOR DE ARTIGO OU LISTA SUMÁRIO DE WIKI) */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* MODO A: LEITOR DE ARTIGO IMERSIVO SELECIONADO */}
          {activeArticle ? (
            <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${
              isDark ? 'bg-slate-900/90 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-md'
            }`}>
              {/* Barra de Navegação de Retorno do Leitor */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedArticleId(null)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  <span>Voltar para o Sumário</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(activeArticle.id)}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      favorites.includes(activeArticle.id) 
                        ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20' 
                        : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'
                    }`}
                    title={favorites.includes(activeArticle.id) ? 'Remover dos Favoritos' : 'Favoritar Artigo'}
                  >
                    <Star size={18} weight={favorites.includes(activeArticle.id) ? 'fill' : 'regular'} />
                  </button>

                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(activeArticle)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-sky-400 transition-colors cursor-pointer"
                        title="Editar Artigo"
                      >
                        <PencilSimple size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteArticle(activeArticle.id)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                        title="Excluir Artigo"
                      >
                        <Trash size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Cabeçalho do Artigo */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {getCategoryBadge(activeArticle.category)}
                  {activeArticle.isUrgent && <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold text-[10px] animate-pulse">🚨 Urgente</span>}
                  {activeArticle.isPinned && <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-bold text-[10px]">📌 Fixado</span>}
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1 ml-2">
                    <Clock size={14} className="text-slate-500" />
                    <span>{Math.max(1, Math.ceil((activeArticle.content.length + (activeArticle.copyableScript?.length || 0)) / 400))} min de leitura</span>
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug">
                  {activeArticle.title}
                </h1>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5">
                  <span>Publicado por <strong className="text-slate-200">{activeArticle.createdByName}</strong> em {new Date(activeArticle.createdAt).toLocaleDateString('pt-BR')}</span>
                  {activeArticle.tags && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {activeArticle.tags.map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-white/5 text-slate-400 text-[10px] font-semibold border border-white/5">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Imagem do Artigo */}
              {activeArticle.imageUrl && (
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => setPreviewModalImage(activeArticle.imageUrl || null)}
                  className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-950/50 cursor-pointer group"
                >
                  <img 
                    src={activeArticle.imageUrl} 
                    alt={activeArticle.title} 
                    className="w-full max-h-96 object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs">
                    <Eye size={18} />
                    <span>Clique para Ampliar Imagem</span>
                  </div>
                </div>
              )}

              {/* Conteúdo Texto Principal */}
              <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal whitespace-pre-wrap pt-2">
                {activeArticle.content}
              </div>

              {/* BLOCO DE SCRIPT DE ATENDIMENTO DE CÓPIA EM 1-CLIQUE */}
              {activeArticle.copyableScript && (
                <div className="p-5 rounded-2xl border border-sky-500/30 bg-sky-950/20 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-sky-500/20 pb-3">
                    <span className="text-xs font-black text-sky-400 flex items-center gap-2">
                      <FileCode size={16} />
                      <span>Roteiro de Atendimento / Script Copiável</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTeleprompterArticle(activeArticle)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                      >
                        <PushPin size={14} />
                        <span>Abrir Teleprompter</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyScript(activeArticle)}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          copiedId === activeArticle.id 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20'
                        }`}
                      >
                        {copiedId === activeArticle.id ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar Script</>}
                      </button>
                    </div>
                  </div>

                  <div className="font-sans text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-all font-medium text-slate-200 bg-slate-950/80 p-4 rounded-xl border border-white/10">
                    {renderHighlightedScript(activeArticle.copyableScript)}
                  </div>
                </div>
              )}

              {/* BLOCO DE CONFIRMAÇÃO DE LEITURA & CIÊNCIA */}
              {activeArticle.requireAcknowledgement && (
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-200">
                      <CheckCircle size={18} className={activeArticle.acknowledgements?.[profile.uid] ? 'text-emerald-400' : 'text-amber-400'} />
                      <span>Confirmação de Ciência & Leitura Obrigatória</span>
                    </div>

                    {activeArticle.acknowledgements?.[profile.uid] ? (
                      <span className="text-[11px] font-black px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        🟢 Ciência Registrada em {new Date(activeArticle.acknowledgements[profile.uid]).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAcknowledgeArticle(activeArticle.id)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle size={16} weight="bold" />
                        <span>Confirmar Minha Ciência</span>
                      </button>
                    )}
                  </div>

                  {canManage && activeArticle.acknowledgements && (
                    <p className="text-xs text-slate-400 font-semibold pt-2 border-t border-white/5">
                      📊 <strong>Relatório de Adesão:</strong> {Object.keys(activeArticle.acknowledgements).length} membro(s) da equipe confirmaram leitura deste documento.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (

            /* MODO B: LISTA SUMÁRIO DE ARTIGOS WIKI (WIKI HUB ROW VIEW COM PAGINAÇÃO DE MÁXIMO 7 ITENS) */
            <div className="space-y-4">
              {filteredArticles.length === 0 ? (
                <div className="py-20 text-center text-slate-500 space-y-3 bg-slate-900/30 rounded-3xl border border-white/5">
                  <BookOpen size={48} className="mx-auto opacity-20" />
                  <p className="text-xs font-semibold">Nenhum procedimento encontrado para o filtro selecionado.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginatedArticles.map(art => {
                      const readingTimeMin = Math.max(1, Math.ceil(((art.content?.length || 0) + (art.copyableScript?.length || 0)) / 400));
                      const isUnreadUrgent = art.requireAcknowledgement && !art.acknowledgements?.[profile.uid];

                      return (
                        <div
                          key={art.id}
                          onClick={() => setSelectedArticleId(art.id)}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                            art.isUrgent
                              ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                              : art.isPinned
                              ? 'bg-sky-950/20 border-sky-500/30 hover:border-sky-500/50'
                              : isDark ? 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                          }`}
                        >
                          <div className="space-y-1.5 flex-1 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isUnreadUrgent && <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] animate-pulse">🟢 Novo</span>}
                              {art.isPinned && <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 font-bold text-[10px]">📌 Fixado</span>}
                              {getCategoryBadge(art.category)}
                              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 ml-1">
                                <Clock size={12} className="text-slate-500" />
                                <span>{readingTimeMin} min</span>
                              </span>
                            </div>

                            <h3 className="text-sm sm:text-base font-black text-white group-hover:text-sky-400 transition-colors">
                              {art.title}
                            </h3>

                            <p className="text-xs text-slate-400 line-clamp-1 font-medium">
                              {art.content}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                            <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
                              {new Date(art.createdAt).toLocaleDateString('pt-BR')}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => toggleFavorite(art.id, e)}
                              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                                favorites.includes(art.id) 
                                  ? 'text-amber-400 bg-amber-400/10' 
                                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/10'
                              }`}
                              title={favorites.includes(art.id) ? 'Remover dos Favoritos' : 'Marcar como Favorito'}
                            >
                              <Star size={16} weight={favorites.includes(art.id) ? 'fill' : 'regular'} />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedArticleId(art.id);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-white/5 group-hover:bg-sky-500 text-slate-300 group-hover:text-white text-xs font-bold transition-all"
                            >
                              Ler Artigo
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* CONTROLES DE PAGINAÇÃO DAS WIKIS (MÁXIMO DE 7 ITENS POR PÁGINA) */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
                      <span className="text-xs text-slate-400 font-semibold">
                        Exibindo <strong className="text-slate-200">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> a <strong className="text-slate-200">{Math.min(currentPage * ITEMS_PER_PAGE, filteredArticles.length)}</strong> de <strong className="text-slate-200">{filteredArticles.length}</strong> procedimentos
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          title="Página Anterior"
                        >
                          <CaretLeft size={16} />
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              currentPage === page
                                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {page}
                          </button>
                        ))}

                        <button
                          type="button"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          title="Próxima Página"
                        >
                          <CaretRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL IMAGE PREVIEW */}
      {previewModalImage && (
        <div 
          role="dialog"
          aria-modal="true"
          tabIndex={0}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 outline-none" 
          onClick={() => setPreviewModalImage(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setPreviewModalImage(null); }}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <img src={previewModalImage} alt="Visualização expandida" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
            <button 
              type="button"
              onClick={() => setPreviewModalImage(null)} 
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 text-white hover:bg-rose-500 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* FORMULÁRIO MODAL DE CRIAÇÃO / EDIÇÃO DE ARTIGOS DA WIKI */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar ${
            isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <Sparkle size={20} className="text-sky-400" />
                <span>{editingArticleId ? 'Editar Conteúdo Wiki' : 'Publicar Novo Conteúdo Wiki'}</span>
              </h3>
              <button type="button" onClick={() => setIsFormOpen(false)} className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveArticle} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Título do Artigo</label>
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
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Conteúdo / Descrição do Procedimento</label>
                <textarea rows={4} value={formContent} onChange={(e) => setFormContent(e.target.value)} className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-medium outline-none text-white custom-scrollbar" required />
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
                  <span>🟢 Exigir Confirmação de Leitura e Ciência da Equipe</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-sky-400 hover:text-sky-300">
                  <input type="checkbox" checked={enableCopyableScript} onChange={(e) => { setEnableCopyableScript(e.target.checked); if (!e.target.checked) setFormCopyableScript(''); }} className="w-4 h-4 rounded accent-sky-500" />
                  <span>💬 Incluir Bloco de Roteiro de Atendimento (Script Copiável)</span>
                </label>
                {enableCopyableScript && (
                  <textarea rows={3} value={formCopyableScript} onChange={(e) => setFormCopyableScript(e.target.value)} placeholder="Roteiro com variáveis ex: [NOME_DO_CLIENTE]..." className="w-full p-3.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-sans text-slate-200 outline-none leading-relaxed custom-scrollbar" />
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

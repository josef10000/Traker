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
  Eye
} from '@phosphor-icons/react';
import { KnowledgeArticle, KnowledgeCategory, UserProfile } from '../../types';
import { 
  subscribeKnowledgeArticles, 
  saveKnowledgeArticle, 
  deleteKnowledgeArticle 
} from '../../lib/knowledgeBaseService';
import { uploadImage } from '../../lib/imageUpload';
import { notifyAnnouncementPublished } from '../../lib/notifications';
import { auth } from '../../lib/firebase';

interface KnowledgeBaseSectionProps {
  profile: UserProfile;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  theme?: 'light' | 'dark';
}

export const KnowledgeBaseSection: React.FC<KnowledgeBaseSectionProps> = ({
  profile,
  showToast,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const canManage = profile.role === 'supervisor' || profile.role === 'manager' || profile.role === 'coordinator' || profile.role === 'super_admin' || profile.role === 'monitor';

  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
  const [isSaving, setIsSaving] = useState(false);

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
  }, [selectedCategory, searchQuery]);

  // Filtragem inteligente por categoria e palavra-chave
  const filteredArticles = useMemo(() => {
    return articles.filter(art => {
      const matchesCat = selectedCategory === 'all' || art.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCat;

      const matchesQuery = 
        art.title.toLowerCase().includes(q) ||
        art.content.toLowerCase().includes(q) ||
        (art.copyableScript && art.copyableScript.toLowerCase().includes(q)) ||
        (art.tags && art.tags.some(t => t.toLowerCase().includes(q)));

      return matchesCat && matchesQuery;
    });
  }, [articles, selectedCategory, searchQuery]);

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
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <BookOpen size={24} weight="duotone" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Base de Conhecimento & Roteiros</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-400 font-extrabold border border-sky-500/30">
                  {filteredArticles.length} {filteredArticles.length === 1 ? 'item' : 'itens'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">Guias operacionais, roteiros de fala de alta conversão e comunicados.</p>
            </div>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={handleOpenNewForm}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus size={16} weight="bold" />
              <span>Novo Artigo / Script</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'script', label: '💬 Scripts' },
              { id: 'announcement', label: '🚨 Comunicados' },
              { id: 'policy', label: '📜 Políticas' },
              { id: 'faq', label: '❓ FAQ' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : isDark ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por termo ou tag..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold outline-none border transition-all ${
                isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-sky-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sky-500'
              }`}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredArticles.length === 0 ? (
          <div className="md:col-span-2 py-20 text-center text-slate-500 space-y-4 bg-slate-900/30 rounded-3xl border border-white/5">
            <BookOpen size={56} className="mx-auto opacity-20" />
            <p className="text-sm font-semibold">Nenhum script ou artigo encontrado para o filtro atual.</p>
          </div>
        ) : (
          paginatedArticles.map(art => (
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
                    {art.isPinned && <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-400 font-bold text-[10px]">📌 Fixado</span>}
                    {art.isUrgent && <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 font-bold text-[10px] animate-pulse">🚨 Urgente</span>}
                    {getCategoryBadge(art.category)}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => handleOpenEditForm(art)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"><PencilSimple size={15} /></button>
                      <button type="button" onClick={() => handleDeleteArticle(art.id)} className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"><Trash size={15} /></button>
                    </div>
                  )}
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
                      <span className="text-xs font-bold tracking-tight text-sky-400">Roteiro de Atendimento</span>
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
                    <div className="font-sans text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap select-all font-medium opacity-95">
                      {art.copyableScript}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                <div className="flex items-center gap-1.5">
                  {art.tags?.map((tag, idx) => <span key={idx} className="px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5">#{tag}</span>)}
                </div>
                <span>Por <strong className="text-slate-300">{art.createdByName}</strong> • {new Date(art.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          ))
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
    </div>
  );
};

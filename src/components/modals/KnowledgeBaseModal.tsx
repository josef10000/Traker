import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  MagnifyingGlass, 
  BookOpen, 
  PushPin, 
  WarningCircle, 
  Copy, 
  Check, 
  Plus, 
  Trash, 
  PencilSimple, 
  Tag, 
  Megaphone, 
  FileText, 
  Question, 
  ChatTeardropText,
  Sparkle,
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
  const isDark = theme === 'dark';
  const isManagerOrSupervisor = profile.role === 'supervisor' || profile.role === 'manager' || profile.role === 'coordinator' || profile.role === 'super_admin' || profile.role === 'monitor';

  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Paginação: 6 itens por página
  const ITEMS_PER_PAGE = 6;
  const [currentPage, setCurrentPage] = useState(1);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  // Estados do Formulário de Criação/Edição (Para supervisores/gestores/monitores)
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

  // Escuta em tempo real os artigos da base de conhecimento da organização
  useEffect(() => {
    if (!isOpen || !profile.organizationId) return;
    const unsub = subscribeKnowledgeArticles(profile.organizationId, (data) => {
      setArticles(data);
    });
    return () => unsub();
  }, [isOpen, profile.organizationId]);

  // Reset da página se filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // Filtragem inteligente por Categoria e Busca por Texto
  const filteredArticles = useMemo(() => {
    return articles.filter(art => {
      const matchesCategory = selectedCategory === 'all' || art.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const matchesText = 
        art.title.toLowerCase().includes(q) ||
        art.content.toLowerCase().includes(q) ||
        (art.copyableScript && art.copyableScript.toLowerCase().includes(q)) ||
        (art.tags && art.tags.some(t => t.toLowerCase().includes(q)));

      return matchesCategory && matchesText;
    });
  }, [articles, selectedCategory, searchQuery]);

  // Cálculo da Paginação (6 por página)
  const totalPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE) || 1;

  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredArticles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredArticles, currentPage]);

  if (!isOpen) return null;

  const handleCopyScript = (art: KnowledgeArticle) => {
    const textToCopy = art.copyableScript || art.content;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(art.id);
    if (showToast) showToast('Script copiado para a área de transferência!', 'success');
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
      if (showToast) showToast('Erro ao carregar imagem.', 'error');
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

      // Notifica todos os colaboradores se for um comunicado ou for urgente
      if (formCategory === 'announcement' || formIsUrgent) {
        await notifyAnnouncementPublished(
          profile.organizationId || 'sandbox-test',
          formTitle.trim(),
          articleId,
          profile.uid,
          !auth.currentUser
        );
      }

      if (showToast) {
        showToast(editingArticleId ? 'Artigo atualizado com sucesso!' : 'Novo artigo publicado na Base de Conhecimento!', 'success');
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error('Erro ao salvar artigo:', err);
      if (showToast) showToast('Erro ao publicar artigo.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteArticle = async (artId: string) => {
    if (!confirm('Deseja realmente excluir este artigo da Base de Conhecimento?')) return;
    try {
      await deleteKnowledgeArticle(profile.organizationId || 'sandbox-test', artId);
      if (showToast) showToast('Artigo excluído.', 'info');
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Erro ao excluir artigo.', 'error');
    }
  };

  const getCategoryBadge = (cat: KnowledgeCategory) => {
    switch (cat) {
      case 'script':
        return <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold">💬 Script</span>;
      case 'announcement':
        return <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">🚨 Comunicado</span>;
      case 'policy':
        return <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">📜 Política</span>;
      case 'faq':
        return <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">❓ FAQ</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">📋 Geral</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
        isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Cabeçalho do Modal */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <BookOpen size={22} weight="duotone" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>Base de Conhecimento & Roteiros</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-400 font-extrabold border border-sky-500/30">
                  {filteredArticles.length} {filteredArticles.length === 1 ? 'item' : 'itens'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">Consulte guias operacionais, scripts e orientações da equipe.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isManagerOrSupervisor && !isFormOpen && (
              <button
                type="button"
                onClick={handleOpenNewForm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all cursor-pointer"
              >
                <Plus size={15} weight="bold" />
                <span className="hidden sm:inline">Novo Conteúdo</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Formulário de Criação/Edição */}
        {isFormOpen ? (
          <form onSubmit={handleSaveArticle} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Sparkle size={18} className="text-sky-400" />
                <span>{editingArticleId ? 'Editar Artigo / Script' : 'Novo Artigo / Script'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-xs text-slate-400 hover:text-white font-bold"
              >
                Voltar à lista
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Título</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Script de negociação PIX com Isenção de Juros"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-bold outline-none focus:border-sky-500 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Categoria</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as KnowledgeCategory)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-bold outline-none focus:border-sky-500 text-white cursor-pointer"
                >
                  <option value="script">💬 Script de Negociação</option>
                  <option value="announcement">🚨 Comunicado Urgente</option>
                  <option value="policy">📜 Política / Regra Operacional</option>
                  <option value="faq">❓ FAQ / Dúvidas Frequentes</option>
                  <option value="general">📋 Geral</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Descrição / Instruções Principais</label>
              <textarea
                rows={3}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Descreva a orientação técnica ou contexto para a equipe..."
                className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-medium outline-none focus:border-sky-500 text-white custom-scrollbar"
                required
              />
            </div>

            {/* Upload Local de Imagem Ilustrativa (Mesmo mecanismo de foto de perfil) */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-wider text-sky-400">
                📷 Imagem Ilustrativa do Artigo (Upload de Arquivo)
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold cursor-pointer transition-all">
                  <UploadSimple size={15} />
                  <span>Selecionar Imagem...</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageFileChange} 
                    className="hidden" 
                  />
                </label>
                {formImageUrl && (
                  <button
                    type="button"
                    onClick={() => setFormImageUrl(undefined)}
                    className="text-xs text-rose-400 hover:underline font-bold"
                  >
                    Remover Imagem
                  </button>
                )}
              </div>
              {formImageUrl && (
                <div className="relative rounded-xl overflow-hidden border border-white/10 max-h-40 w-full bg-slate-900 flex items-center justify-center">
                  <img src={formImageUrl} alt="Pré-visualização" className="max-h-40 object-contain rounded-xl" />
                </div>
              )}
            </div>

            {/* Checkbox para Ativar / Desativar Bloco de Script Próprio para Copiar */}
            <div className="pt-2 border-t border-white/5 space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-sky-400 hover:text-sky-300">
                <input
                  type="checkbox"
                  checked={enableCopyableScript}
                  onChange={(e) => {
                    setEnableCopyableScript(e.target.checked);
                    if (!e.target.checked) setFormCopyableScript('');
                  }}
                  className="w-4 h-4 rounded accent-sky-500"
                />
                <span>💬 Incluir Bloco de Roteiro Sugerido de Atendimento</span>
              </label>

              {enableCopyableScript && (
                <div className="animate-fadeIn space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-sky-300">
                    Texto do Roteiro Sugerido (Fácil leitura e cópia para o operador)
                  </label>
                  <textarea
                    rows={3}
                    value={formCopyableScript}
                    onChange={(e) => setFormCopyableScript(e.target.value)}
                    placeholder="Mensagem exata de negociação em formato de roteiro limpo..."
                    className="w-full p-3.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-sans text-slate-200 outline-none focus:border-sky-500 leading-relaxed custom-scrollbar"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Tags (separadas por vírgula)</label>
                <input
                  type="text"
                  value={formTagsStr}
                  onChange={(e) => setFormTagsStr(e.target.value)}
                  placeholder="ex: pix, desconto, atraso"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-semibold outline-none focus:border-sky-500 text-white"
                />
              </div>

              <div className="flex items-center gap-6 md:col-span-2 pt-4">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="w-4 h-4 rounded accent-sky-500"
                  />
                  <span>📌 Fixar no Topo da Base</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-rose-400 hover:text-rose-300">
                  <input
                    type="checkbox"
                    checked={formIsUrgent}
                    onChange={(e) => setFormIsUrgent(e.target.checked)}
                    className="w-4 h-4 rounded accent-rose-500"
                  />
                  <span>🚨 Alerta Urgente da Operação</span>
                </label>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-sky-500/20 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : (editingArticleId ? 'Salvar Alterações' : 'Publicar Conteúdo')}
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Filtros e Busca por Texto */}
            <div className="p-4 border-b border-white/10 bg-slate-950/20 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Categorias */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'script', label: '💬 Scripts' },
                    { id: 'announcement', label: '🚨 Comunicados' },
                    { id: 'policy', label: '📜 Regras' },
                    { id: 'faq', label: '❓ FAQ' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        selectedCategory === cat.id
                          ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                          : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Campo de Busca Rápida */}
                <div className="relative w-full sm:w-72">
                  <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar script, tag, palavra-chave..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-medium outline-none focus:border-sky-500 text-white"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Lista de Artigos e Scripts (Paginação: 6 por página) */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
              {filteredArticles.length === 0 ? (
                <div className="py-16 text-center text-slate-500 space-y-3">
                  <BookOpen size={48} className="mx-auto opacity-30" />
                  <p className="text-sm font-semibold">Nenhum script ou artigo encontrado para os filtros selecionados.</p>
                </div>
              ) : (
                paginatedArticles.map(art => (
                  <div 
                    key={art.id}
                    className={`p-5 rounded-2xl border transition-all relative group ${
                      art.isUrgent
                        ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-500/5'
                        : art.isPinned
                        ? 'bg-sky-950/20 border-sky-500/30 shadow-lg shadow-sky-500/5'
                        : isDark ? 'bg-slate-950/60 border-white/5 hover:border-white/15' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {art.isPinned && (
                          <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-extrabold text-[10px] flex items-center gap-1 border border-sky-500/30">
                            <PushPin size={10} weight="fill" /> Fixado
                          </span>
                        )}
                        {art.isUrgent && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-extrabold text-[10px] flex items-center gap-1 border border-rose-500/30 animate-pulse">
                            <WarningCircle size={10} weight="fill" /> Urgente
                          </span>
                        )}
                        {getCategoryBadge(art.category)}
                        <span className="text-[10px] text-slate-400 font-medium ml-auto sm:ml-0">
                          Publicado por <strong className="text-slate-300">{art.createdByName}</strong> • {new Date(art.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      {/* Botões de Ação para Supervisores / Gestores */}
                      {isManagerOrSupervisor && (
                        <div className="flex items-center gap-1.5 self-end sm:self-auto opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(art)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"
                            title="Editar este artigo"
                          >
                            <PencilSimple size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteArticle(art.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Excluir este artigo"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="text-sm font-black tracking-tight text-white mb-2">{art.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium mb-3 whitespace-pre-wrap">{art.content}</p>

                    {/* Exibição de Imagem Anexada (se houver) */}
                    {art.imageUrl && (
                      <div 
                        role="button"
                        tabIndex={0}
                        onClick={() => setPreviewModalImage(art.imageUrl || null)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreviewModalImage(art.imageUrl || null); } }}
                        className="mb-3 relative rounded-xl overflow-hidden border border-white/10 group/img cursor-pointer bg-slate-950/50 outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <img 
                          src={art.imageUrl} 
                          alt={art.title} 
                          className="w-full max-h-56 object-cover group-hover/img:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs">
                          <Eye size={16} />
                          <span>Ampliar Imagem</span>
                        </div>
                      </div>
                    )}

                    {/* Bloco de Script Prontinho para Copiar em 1 Clique */}
                    {art.copyableScript && (
                      <div className={`p-4 rounded-xl border space-y-2.5 transition-colors ${
                        isDark 
                          ? 'bg-slate-950/70 border-white/10 text-slate-200 shadow-sm' 
                          : 'bg-slate-50 border-slate-200 text-slate-800 shadow-sm'
                      }`}>
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded-md bg-sky-500/10 text-sky-400">
                              <ChatTeardropText size={15} weight="duotone" />
                            </span>
                            <span className="text-xs font-bold tracking-tight text-sky-400">
                              Roteiro Sugerido de Atendimento
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyScript(art)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              copiedId === art.id
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-white border border-sky-500/20'
                            }`}
                          >
                            {copiedId === art.id ? (
                              <>
                                <Check size={13} weight="bold" />
                                <span>Copiado! ✓</span>
                              </>
                            ) : (
                              <>
                                <Copy size={13} />
                                <span>Copiar Roteiro</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="font-sans text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap select-all font-medium opacity-95">
                          {art.copyableScript}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {art.tags && art.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                        <Tag size={12} className="text-slate-500" />
                        {art.tags.map((tag, idx) => (
                          <span key={idx} className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Rodapé do Modal com Paginação */}
        <div className="p-4 border-t border-white/10 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          <span>
            Exibindo <strong className="text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> a <strong className="text-white">{Math.min(currentPage * ITEMS_PER_PAGE, filteredArticles.length)}</strong> de <strong className="text-white">{filteredArticles.length}</strong> itens
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <CaretLeft size={15} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentPage === page
                      ? 'bg-sky-500 text-white shadow-sm'
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
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <CaretRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Lightbox para Ampliar Imagem (Acessível via Teclado) */}
      {previewModalImage && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Visualização expandida de imagem"
          tabIndex={0}
          className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 outline-none" 
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
              aria-label="Fechar imagem"
              onClick={() => setPreviewModalImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 text-white hover:bg-rose-500 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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
  X 
} from '@phosphor-icons/react';
import { KnowledgeArticle, KnowledgeCategory, UserProfile } from '../../types';
import { 
  subscribeKnowledgeArticles, 
  saveKnowledgeArticle, 
  deleteKnowledgeArticle 
} from '../../lib/knowledgeBaseService';
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

  // Formulário Modal de Criação / Edição
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<KnowledgeCategory>('script');
  const [formContent, setFormContent] = useState('');
  const [enableCopyableScript, setEnableCopyableScript] = useState(false);
  const [formCopyableScript, setFormCopyableScript] = useState('');
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

  const handleCopyScript = (art: KnowledgeArticle) => {
    const text = art.copyableScript || art.content;
    navigator.clipboard.writeText(text);
    setCopiedId(art.id);
    if (showToast) showToast('Script copiado com sucesso!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenNewForm = () => {
    setEditingArticleId(null);
    setFormTitle('');
    setFormCategory('script');
    setFormContent('');
    setEnableCopyableScript(false);
    setFormCopyableScript('');
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
        tags: tags.length > 0 ? tags : undefined,
        isPinned: formIsPinned,
        isUrgent: formIsUrgent,
        createdByUid: profile.uid,
        createdByName: profile.displayName || profile.email.split('@')[0],
        createdByRole: profile.role
      });

      // Se for um comunicado ou for urgente, dispara notificação para todos os operadores
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
        return <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><ChatTeardropText size={12} /> Script de Negociação</span>;
      case 'announcement':
        return <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><Megaphone size={12} /> Comunicado</span>;
      case 'policy':
        return <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><FileText size={12} /> Política / Regra</span>;
      case 'faq':
        return <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><Question size={12} /> FAQ / Dúvida</span>;
      default:
        return <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-wider">Geral</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Banner de Cabeçalho */}
      <div className={`p-6 sm:p-8 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden ${
        isDark ? 'bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border-white/10 text-white' : 'bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-white border-slate-200 text-slate-900'
      }`}>
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-inner">
              <BookOpen size={28} weight="duotone" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                <span>Base de Conhecimento & Scripts</span>
                <span className="text-xs text-sky-400 px-2.5 py-0.5 bg-sky-500/10 rounded-full font-bold uppercase tracking-wider border border-sky-500/20">WIKI</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
                Central de scripts de negociação, procedimentos operacionais, quebra de objeções e comunicados em tempo real.
              </p>
            </div>
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleOpenNewForm}
            className="px-5 py-3 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition-all cursor-pointer border border-transparent self-start md:self-auto shrink-0"
          >
            <Plus size={18} weight="bold" />
            <span>Novo Conteúdo / Script</span>
          </button>
        )}
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className={`p-4 rounded-3xl border space-y-3 ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Categorias em Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
            {[
              { id: 'all', label: 'Todos os Conteúdos' },
              { id: 'script', label: '💬 Scripts de Negociação' },
              { id: 'announcement', label: '🚨 Comunicados' },
              { id: 'policy', label: '📜 Políticas & Regras' },
              { id: 'faq', label: '❓ Dúvidas / FAQ' }
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

          {/* Campo de Pesquisa Instantânea */}
          <div className="relative w-full sm:w-80">
            <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por palavra, tag ou script..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold outline-none border transition-all ${
                isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-sky-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sky-500'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid de Artigos e Scripts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredArticles.length === 0 ? (
          <div className="md:col-span-2 py-20 text-center text-slate-500 space-y-4 bg-slate-900/30 rounded-3xl border border-white/5">
            <BookOpen size={56} className="mx-auto opacity-20" />
            <p className="text-sm font-semibold">Nenhum script ou artigo encontrado para o filtro atual.</p>
          </div>
        ) : (
          filteredArticles.map(art => (
            <div
              key={art.id}
              className={`p-6 rounded-3xl border transition-all flex flex-col justify-between relative group ${
                art.isUrgent
                  ? 'bg-rose-950/20 border-rose-500/40 shadow-xl shadow-rose-500/5'
                  : art.isPinned
                  ? 'bg-sky-950/20 border-sky-500/30 shadow-xl shadow-sky-500/5'
                  : isDark ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {art.isPinned && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 font-extrabold text-[10px] flex items-center gap-1 border border-sky-500/30">
                        <PushPin size={11} weight="fill" /> Fixado
                      </span>
                    )}
                    {art.isUrgent && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 font-extrabold text-[10px] flex items-center gap-1 border border-rose-500/30 animate-pulse">
                        <WarningCircle size={11} weight="fill" /> Urgente
                      </span>
                    )}
                    {getCategoryBadge(art.category)}
                  </div>

                  {/* Edição / Exclusão para Cargos de Gestão / QA */}
                  {canManage && (
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(art)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"
                        title="Editar artigo"
                      >
                        <PencilSimple size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteArticle(art.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Excluir artigo"
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-base font-black tracking-tight text-white mb-2">{art.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-medium mb-4 whitespace-pre-wrap">{art.content}</p>

                {/* Box de Script para Copiar em 1 Clique */}
                {art.copyableScript && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-sky-500/30 font-mono text-xs text-sky-200 mb-4 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider border-b border-white/5 pb-1.5">
                      <span>📋 Script Próprio para Copiar:</span>
                      <button
                        type="button"
                        onClick={() => handleCopyScript(art)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-black transition-all cursor-pointer ${
                          copiedId === art.id
                            ? 'bg-emerald-500 text-white shadow-md'
                            : 'bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white border border-sky-500/30'
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
                            <span>Copiar Script</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed select-all">{art.copyableScript}</p>
                  </div>
                )}
              </div>

              {/* Rodapé do Card com Tags e Autor */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {art.tags && art.tags.length > 0 && (
                    <>
                      <Tag size={12} className="text-slate-500" />
                      {art.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5">
                          #{tag}
                        </span>
                      ))}
                    </>
                  )}
                </div>

                <span>Por <strong className="text-slate-300">{art.createdByName}</strong> • {new Date(art.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Publicação / Edição de Artigos */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <Sparkle size={20} className="text-sky-400" />
                <span>{editingArticleId ? 'Editar Artigo / Script' : 'Publicar Novo Artigo / Script'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
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
                    <option value="policy">📜 Política / Regra</option>
                    <option value="faq">❓ FAQ / Dúvidas</option>
                    <option value="general">📋 Geral</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Conteúdo Explicativo / Contexto</label>
                <textarea
                  rows={3}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Orientações e detalhes operacionais para os colaboradores..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-medium outline-none focus:border-sky-500 text-white custom-scrollbar"
                  required
                />
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
                  <span>💬 Incluir Bloco de Script de Negociação Próprio para Copiar em 1 Clique</span>
                </label>

                {enableCopyableScript && (
                  <div className="animate-fadeIn space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-sky-300">
                      Texto do Script Próprio (Pronto para o operador copiar)
                    </label>
                    <textarea
                      rows={3}
                      value={formCopyableScript}
                      onChange={(e) => setFormCopyableScript(e.target.value)}
                      placeholder="Mensagem exata de negociação pronta para o operador copiar em 1 clique..."
                      className="w-full p-3 rounded-xl bg-slate-950 border border-sky-500/30 text-xs font-mono text-sky-200 outline-none focus:border-sky-400 custom-scrollbar"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Tags (vírgula)</label>
                  <input
                    type="text"
                    value={formTagsStr}
                    onChange={(e) => setFormTagsStr(e.target.value)}
                    placeholder="pix, desconto, atraso"
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
          </div>
        </div>
      )}
    </div>
  );
};

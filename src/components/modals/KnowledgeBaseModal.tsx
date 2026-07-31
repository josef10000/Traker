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
  Sparkle
} from '@phosphor-icons/react';
import { KnowledgeArticle, KnowledgeCategory, UserProfile } from '../../types';
import { 
  subscribeKnowledgeArticles, 
  saveKnowledgeArticle, 
  deleteKnowledgeArticle 
} from '../../lib/knowledgeBaseService';

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

  // Estados do Formulário de Criação/Edição (Para supervisores/gestores/monitores)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<KnowledgeCategory>('script');
  const [formContent, setFormContent] = useState('');
  const [formCopyableScript, setFormCopyableScript] = useState('');
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

  if (!isOpen) return null;

  const handleCopyScript = (art: KnowledgeArticle) => {
    const textToCopy = art.copyableScript || art.content;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(art.id);
    if (showToast) showToast('Script copiado para a área de transferência!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenNewForm = () => {
    setEditingArticleId(null);
    setFormTitle('');
    setFormCategory('script');
    setFormContent('');
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

      await saveKnowledgeArticle({
        id: editingArticleId || undefined,
        organizationId: profile.organizationId || 'sandbox-test',
        title: formTitle.trim(),
        category: formCategory,
        content: formContent.trim(),
        copyableScript: formCopyableScript.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        isPinned: formIsPinned,
        isUrgent: formIsUrgent,
        createdByUid: profile.uid,
        createdByName: profile.displayName || profile.email.split('@')[0],
        createdByRole: profile.role
      });

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
    if (!confirm('Deseja realmente remover este artigo da Base de Conhecimento?')) return;
    try {
      await deleteKnowledgeArticle(profile.organizationId || 'sandbox-test', artId);
      if (showToast) showToast('Artigo removido com sucesso.', 'info');
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Erro ao remover artigo.', 'error');
    }
  };

  const getCategoryBadge = (cat: KnowledgeCategory) => {
    switch (cat) {
      case 'script':
        return <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><ChatTeardropText size={12} /> Script de Vendas</span>;
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden animate-scale-up ${
        isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Cabeçalho do Modal */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-inner">
              <BookOpen size={24} weight="duotone" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <span>Central de Conhecimento & Scripts da Operação</span>
                <span className="text-xs text-sky-400 px-2 py-0.5 bg-sky-500/10 rounded-full font-bold">WIKI</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Consulte orientações técnicas, comunicados oficiais e scripts prontos a qualquer momento.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isManagerOrSupervisor && !isFormOpen && (
              <button
                type="button"
                onClick={handleOpenNewForm}
                className="px-3.5 py-2 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
              >
                <Plus size={16} weight="bold" />
                <span>Novo Artigo / Script</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Formulário de Criação/Edição (Para Supervisores/Gestores/Monitores) */}
        {isFormOpen ? (
          <form onSubmit={handleSaveArticle} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Sparkle size={18} className="text-sky-400" />
                <span>{editingArticleId ? 'Editar Artigo da Base' : 'Publicar Novo Conteúdo na Base'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-xs text-slate-400 hover:text-white underline font-medium cursor-pointer"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Título do Artigo / Comunicado</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Script de negociação para clientes em atraso via PIX"
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
                  <option value="script">💬 Script de Vendas / Negociação</option>
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

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-sky-400 mb-1">
                Script Pronto para Copiar (Opcional - Texto pré-formatado para o operador copiar em 1 clique)
              </label>
              <textarea
                rows={3}
                value={formCopyableScript}
                onChange={(e) => setFormCopyableScript(e.target.value)}
                placeholder="Insira o texto exato da mensagem para o operador colar no WhatsApp ou ligação..."
                className="w-full p-3 rounded-xl bg-slate-950 border border-sky-500/30 text-xs font-mono text-sky-200 outline-none focus:border-sky-400 custom-scrollbar"
              />
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

            {/* Lista de Artigos e Scripts */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
              {filteredArticles.length === 0 ? (
                <div className="py-16 text-center text-slate-500 space-y-3">
                  <BookOpen size={48} className="mx-auto opacity-30" />
                  <p className="text-sm font-semibold">Nenhum script ou artigo encontrado para os filtros selecionados.</p>
                </div>
              ) : (
                filteredArticles.map(art => (
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

                    {/* Bloco de Script Prontinho para Copiar em 1 Clique */}
                    {art.copyableScript && (
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-sky-500/20 font-mono text-xs text-sky-200 relative group/script">
                        <div className="flex items-center justify-between mb-1.5 text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider border-b border-white/5 pb-1">
                          <span>📋 Script Próprio para Envio / Leitura:</span>
                          <button
                            type="button"
                            onClick={() => handleCopyScript(art)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${
                              copiedId === art.id
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white border border-sky-500/30'
                            }`}
                          >
                            {copiedId === art.id ? (
                              <>
                                <Check size={12} weight="bold" />
                                <span>Copiado! ✓</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copiar Script</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed select-all">{art.copyableScript}</p>
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

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Total na base: <strong className="text-white">{articles.length}</strong> artigos/scripts</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

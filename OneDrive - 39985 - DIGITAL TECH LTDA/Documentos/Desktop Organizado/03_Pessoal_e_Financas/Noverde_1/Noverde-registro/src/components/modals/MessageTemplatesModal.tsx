import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Plus, Trash, Pencil, ChatCircleDots, Sparkle } from '@phosphor-icons/react';
import { MessageTemplate, Agreement, UserProfile } from '../../types';
import { getTemplates, saveTemplate, deleteTemplate, interpolateTemplate } from '../../lib/messageTemplates';

interface MessageTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  agreement?: Partial<Agreement>;
  onSelectAndCopy?: (copiedText: string) => void;
}

export const MessageTemplatesModal: React.FC<MessageTemplatesModalProps> = ({
  isOpen,
  onClose,
  profile,
  agreement,
  onSelectAndCopy
}) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form de criação/edição
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState<string>('');
  const [categoryInput, setCategoryInput] = useState<'vencimento' | 'preventiva' | 'confirmacao' | 'geral'>('vencimento');
  const [contentInput, setContentInput] = useState<string>('');

  const canManage = ['supervisor', 'coordinator', 'manager', 'admin', 'super_admin'].includes(profile.role);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, profile.organizationId]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getTemplates(profile.organizationId);
      setTemplates(data);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredTemplates = templates.filter(t => 
    selectedCategory === 'all' ? true : t.category === selectedCategory
  );

  const handleCopy = (template: MessageTemplate) => {
    const textToCopy = agreement 
      ? interpolateTemplate(template.content, agreement)
      : template.content;

    navigator.clipboard.writeText(textToCopy);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);

    if (onSelectAndCopy) {
      onSelectAndCopy(textToCopy);
    }
  };

  const handleStartCreate = () => {
    setIsEditing(true);
    setEditingId(null);
    setTitleInput('');
    setCategoryInput('vencimento');
    setContentInput('');
  };

  const handleStartEdit = (template: MessageTemplate) => {
    setIsEditing(true);
    setEditingId(template.id);
    setTitleInput(template.title);
    setCategoryInput(template.category);
    setContentInput(template.content);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim() || !contentInput.trim()) return;

    try {
      await saveTemplate({
        id: editingId || undefined,
        title: titleInput.trim(),
        category: categoryInput,
        content: contentInput.trim(),
        createdBy: profile.displayName || profile.uid,
        organizationId: profile.organizationId
      });
      setIsEditing(false);
      await loadTemplates();
    } catch (err) {
      console.error('Erro ao salvar template:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este modelo de mensagem?')) return;
    try {
      await deleteTemplate(id, profile.organizationId);
      await loadTemplates();
    } catch (err) {
      console.error('Erro ao excluir template:', err);
    }
  };

  const insertVariable = (varName: string) => {
    setContentInput(prev => `${prev} {{${varName}}}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <ChatCircleDots size={24} weight="duotone" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Central de Templates de Mensagens
              </h3>
              <p className="text-xs text-slate-400">
                {agreement ? `Personalizando mensagem para: ${agreement.clientName}` : 'Selecione ou edite modelos de mensagem para WhatsApp/Chat'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulário de Criação/Edição */}
        {isEditing ? (
          <form onSubmit={handleSaveForm} className="p-5 flex flex-col gap-4 overflow-y-auto">
            <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
              <Sparkle size={16} /> {editingId ? 'Editar Template de Mensagem' : 'Novo Template de Mensagem'}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Título do Modelo</label>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="Ex: Lembrete de PIX Urgente"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Categoria</label>
                <select
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="vencimento">Vencimento no Dia</option>
                  <option value="preventiva">Cobrança Preventiva</option>
                  <option value="confirmacao">Confirmação de Acordo</option>
                  <option value="geral">Geral</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">Conteúdo do Modelo</label>
                <div className="flex gap-1.5 text-[10px]">
                  <span className="text-slate-500">Inserir variável:</span>
                  {['NOME', 'VALOR', 'VENCIMENTO', 'CPF', 'ACORDO_ID'].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-blue-600/30 text-blue-400 transition-colors"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
                rows={4}
                placeholder="Escreva a mensagem aqui..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg transition-all"
              >
                Salvar Modelo
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
            {/* Filtros e Botão Novo */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'vencimento', label: 'Vencimentos' },
                  { id: 'preventiva', label: 'Preventivos' },
                  { id: 'confirmacao', label: 'Confirmações' },
                  { id: 'geral', label: 'Geral' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {canManage && (
                <button
                  onClick={handleStartCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 text-blue-400 rounded-xl text-xs font-medium transition-all whitespace-nowrap"
                >
                  <Plus size={14} /> Novo Modelo
                </button>
              )}
            </div>

            {/* Lista de Templates */}
            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs animate-pulse">
                Carregando modelos de mensagem...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Nenhum template encontrado nesta categoria.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredTemplates.map(tpl => {
                  const previewText = agreement 
                    ? interpolateTemplate(tpl.content, agreement)
                    : tpl.content;

                  const isCopied = copiedId === tpl.id;

                  return (
                    <div
                      key={tpl.id}
                      className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{tpl.title}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                            {tpl.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {canManage && !tpl.id.startsWith('tpl_default_') && (
                            <>
                              <button
                                onClick={() => handleStartEdit(tpl)}
                                className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition-colors"
                                title="Editar Modelo"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(tpl.id)}
                                className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                                title="Excluir Modelo"
                              >
                                <Trash size={14} />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleCopy(tpl)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                              isCopied
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check size={14} /> Copiado!
                              </>
                            ) : (
                              <>
                                <Copy size={14} /> Copiar Mensagem
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                        {previewText}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Rodapé */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>Variáveis personalizam nome, valor e vencimento do cliente instantaneamente.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

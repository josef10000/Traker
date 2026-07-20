import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X } from '@phosphor-icons/react';
import { Agreement, AgreementOrigin, AgreementStatus, AgreementType, AgreementCategory, UserProfile } from '../../types';
import { formatCPF, maskCPF } from '../../utils/masks';
import { CustomSelect } from '../ui/CustomSelect';

interface AgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  editingAgreement: Agreement | null;
  currentUserProfile?: UserProfile;
}

export const AgreementModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingAgreement,
  currentUserProfile
}: AgreementModalProps) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'agreement' | 'schedule'>(
    editingAgreement?.status === AgreementStatus.SCHEDULED ? 'schedule' : 'agreement'
  );
  const [agreementType, setAgreementType] = useState<string>(editingAgreement?.type || '');
  const [agreementOrigin, setAgreementOrigin] = useState<string>(editingAgreement?.origin || '');
  const [hasEntry, setHasEntry] = useState<boolean>(editingAgreement?.hasEntry ?? false);
  const [category, setCategory] = useState<AgreementCategory>(editingAgreement?.category || AgreementCategory.FIXA);
  const [initialStatus, setInitialStatus] = useState<AgreementStatus>(
    editingAgreement?.status && editingAgreement.status !== AgreementStatus.SCHEDULED 
      ? editingAgreement.status 
      : AgreementStatus.WAITING
  );
  const [formError, setFormError] = useState<string | null>(null);

  const canEditCpf = !editingAgreement || 
    editingAgreement.operatorId === currentUserProfile?.uid || 
    currentUserProfile?.role === 'supervisor';

  const isParcelamento = agreementType === 'parcelamento';

  const normalizeValue = (val: string): number => {
    if (!val) return 0;
    let cleaned = val.replace(/[R$\s]/g, '');
    if (cleaned.includes(',') && cleaned.includes('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const finalCpf = canEditCpf ? (formData.get('cpf') as string) : (editingAgreement?.clientCpf || '');
    const notes = formData.get('notes') as string;

    if (mode === 'schedule') {
      const scheduledAt = formData.get('scheduledAt') as string;
      if (!scheduledAt) {
        setFormError('Por favor, informe a data e hora do agendamento.');
        return;
      }
      if (!notes || !notes.trim()) {
        setFormError('Por favor, insira uma observação justificando o motivo do agendamento.');
        return;
      }

      const agreementData = {
        clientName: formData.get('name') as string,
        clientCpf: finalCpf,
        origin: formData.get('origin') as AgreementOrigin,
        dueDate: scheduledAt.split('T')[0],
        value: 0,
        phone: formData.get('phone') as string,
        type: 'parcelamento' as AgreementType,
        category: 'variavel' as AgreementCategory,
        status: AgreementStatus.SCHEDULED,
        notes: notes,
        scheduledAt: scheduledAt,
        backOfficeClientIdRef: (editingAgreement as any)?.backOfficeClientIdRef || undefined
      };
      setFormError(null);
      onSubmit(agreementData);
    } else {
      const rawValue = formData.get('value') as string;
      const normalizedValue = normalizeValue(rawValue);

      // Campos de parcelamento
      const installmentCountRaw = formData.get('installmentCount') as string;
      const installmentCount = installmentCountRaw ? parseInt(installmentCountRaw, 10) : undefined;
      const rawInstallmentValue = formData.get('installmentValue') as string;
      const installmentValue = rawInstallmentValue ? normalizeValue(rawInstallmentValue) : undefined;

      const agreementData = {
        clientName: formData.get('name') as string,
        clientCpf: finalCpf,
        origin: formData.get('origin') as AgreementOrigin,
        dueDate: formData.get('dueDate') as string,
        value: normalizedValue,          // Sempre o valor que conta nas métricas
        phone: formData.get('phone') as string,
        type: formData.get('type') as AgreementType,
        category: formData.get('category') as AgreementCategory,
        status: formData.get('initialStatus') as AgreementStatus,
        notes: notes,
        // Campos de parcelamento (opcionais)
        installmentCount: isParcelamento ? installmentCount : undefined,
        hasEntry: isParcelamento ? hasEntry : undefined,
        installmentValue: isParcelamento && hasEntry ? installmentValue : undefined,
        backOfficeClientIdRef: (editingAgreement as any)?.backOfficeClientIdRef || undefined
      };
      setFormError(null);
      onSubmit(agreementData);
    }
  };

  const isEditingClosedAgreement = !!editingAgreement && !!editingAgreement.id && editingAgreement.status !== AgreementStatus.SCHEDULED;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative glass-card w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-xl shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">
              {editingAgreement ? (editingAgreement.status === AgreementStatus.SCHEDULED ? 'Atender Agendamento' : 'Editar Acordo') : 'Registrar Novo Acordo'}
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Gestão de Negociação</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="flex flex-col overflow-hidden">
          {/* Alternância de Modo */}
          <div className="px-8 py-3 bg-white/5 border-b border-white/5 flex gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setMode('agreement')}
              disabled={isEditingClosedAgreement}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                mode === 'agreement'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-white/10'
              } ${isEditingClosedAgreement ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Fechar Acordo
            </button>
            <button
              type="button"
              onClick={() => setMode('schedule')}
              disabled={isEditingClosedAgreement}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                mode === 'schedule'
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-white/10'
              } ${isEditingClosedAgreement ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Agendar Retorno
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CPF */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">CPF *</label>
                <input 
                  required
                  name="cpf"
                  type="text" 
                  placeholder="000.000.000-00" 
                  defaultValue={editingAgreement ? (canEditCpf ? editingAgreement.clientCpf : maskCPF(editingAgreement.clientCpf)) : ''}
                  disabled={!canEditCpf}
                  onChange={(e) => e.target.value = formatCPF(e.target.value)}
                  className={`w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-mono text-white backdrop-blur-sm ${!canEditCpf ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>

              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nome Completo</label>
                <input 
                  name="name"
                  type="text" 
                  defaultValue={editingAgreement?.clientName}
                  placeholder="Ex: João Silva" 
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white backdrop-blur-sm"
                />
              </div>

              {/* Telefone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Telefone/WhatsApp</label>
                <input 
                  name="phone"
                  type="tel" 
                  defaultValue={editingAgreement?.phone}
                  placeholder="(00) 00000-0000" 
                  className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-slate-200"
                />
              </div>

              {mode === 'agreement' && (
                <>
                  {/* Tipo de Acordo */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tipo de Acordo *</label>
                    <CustomSelect 
                      required={mode === 'agreement'}
                      name="type"
                      value={agreementType}
                      onChange={(val) => { setAgreementType(val); setHasEntry(false); }}
                      placeholder="Selecione o tipo..."
                      options={[
                        { value: "quitacao", label: "Quitação" },
                        { value: "parcelamento", label: "Parcelamento" },
                        { value: "parcela_atrasada", label: "Parcela Atrasada" },
                        { value: "parcela_atual", label: "Parcela Atual" },
                        { value: "antecipacao", label: "Antecipação" }
                      ]}
                    />
                  </div>

                  {/* Valor — label muda se for parcelamento com entrada */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                      {isParcelamento && hasEntry ? 'Valor da Entrada *' : 'Valor do Acordo *'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 inset-y-0 flex items-center text-slate-500 font-bold">R$</span>
                      <input 
                        required={mode === 'agreement'}
                        name="value"
                        type="text" 
                        defaultValue={editingAgreement?.value || undefined}
                        placeholder="0,00" 
                        className="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white backdrop-blur-sm"
                      />
                    </div>
                    {isParcelamento && hasEntry && (
                      <p className="text-[9px] text-amber-400 font-semibold ml-1">
                        ⚡ Este é o valor que entrará nas métricas de pagamento
                      </p>
                    )}
                  </div>

                  {/* Data de Vencimento */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                      {isParcelamento && hasEntry ? 'Data de Vencimento da Entrada *' : 'Data de Vencimento *'}
                    </label>
                    <input 
                      required={mode === 'agreement'}
                      name="dueDate"
                      type="date" 
                      defaultValue={editingAgreement?.dueDate || new Date().toISOString().split('T')[0]}
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white color-scheme-dark backdrop-blur-sm"
                    />
                  </div>

                  {/* ===== CAMPOS EXTRAS DE PARCELAMENTO ===== */}
                  {isParcelamento && (
                    <>
                      {/* Quantidade de Parcelas */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Quantidade de Parcelas *</label>
                        <input 
                          required
                          name="installmentCount"
                          type="number"
                          min={1}
                          max={360}
                          defaultValue={editingAgreement?.installmentCount || undefined}
                          placeholder="Ex: 12"
                          className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white backdrop-blur-sm"
                        />
                      </div>

                      {/* Com ou Sem Entrada */}
                      <div className="space-y-3 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Modalidade do Parcelamento</label>
                        <div className="grid grid-cols-2 gap-4">
                          <label className="relative flex flex-col cursor-pointer group">
                            <input 
                              type="radio"
                              name="hasEntryRadio"
                              checked={!hasEntry}
                              onChange={() => setHasEntry(false)}
                              className="peer hidden"
                            />
                            <div className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 peer-checked:border-sky-500/50 peer-checked:bg-sky-500/5 transition-all backdrop-blur-sm">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${!hasEntry ? 'border-sky-500' : 'border-slate-700'}`}>
                                {!hasEntry && <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />}
                              </div>
                              <div>
                                <span className={`text-xs font-bold uppercase tracking-wider ${!hasEntry ? 'text-white' : 'text-slate-400'}`}>Sem Entrada</span>
                                <p className="text-[9px] text-slate-500 mt-0.5">Valor do campo acima = 1ª parcela</p>
                              </div>
                            </div>
                          </label>

                          <label className="relative flex flex-col cursor-pointer group">
                            <input 
                              type="radio"
                              name="hasEntryRadio"
                              checked={hasEntry}
                              onChange={() => setHasEntry(true)}
                              className="peer hidden"
                            />
                            <div className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 peer-checked:border-amber-500/50 peer-checked:bg-amber-500/5 transition-all backdrop-blur-sm">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${hasEntry ? 'border-amber-500' : 'border-slate-700'}`}>
                                {hasEntry && <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
                              </div>
                              <div>
                                <span className={`text-xs font-bold uppercase tracking-wider ${hasEntry ? 'text-white' : 'text-slate-400'}`}>Com Entrada</span>
                                <p className="text-[9px] text-slate-500 mt-0.5">Define valor da entrada acima</p>
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Valor de cada Parcela (só aparece se hasEntry) */}
                      {hasEntry && (
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                            Valor de Cada Parcela <span className="text-slate-600 normal-case font-normal">(informativo — não entra nas métricas)</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 inset-y-0 flex items-center text-slate-500 font-bold">R$</span>
                            <input 
                              name="installmentValue"
                              type="text"
                              defaultValue={editingAgreement?.installmentValue || undefined}
                              placeholder="0,00"
                              className="w-full bg-slate-900/50 border border-slate-700/60 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-600 transition-all text-slate-300 backdrop-blur-sm"
                            />
                          </div>
                          <p className="text-[9px] text-slate-500 ml-1">Aparecerá no histórico do cliente: Ex: "Entrada R$ 100 + 12x R$ 300"</p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {mode === 'schedule' && (
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Data e Hora do Retorno *</label>
                  <input 
                    required={mode === 'schedule'}
                    name="scheduledAt"
                    type="datetime-local" 
                    defaultValue={editingAgreement?.scheduledAt || ''}
                    min={new Date().toISOString().substring(0, 16)}
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white color-scheme-dark backdrop-blur-sm"
                  />
                </div>
              )}
            </div>

            {/* Origem */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Origem do Atendimento *</label>
              <CustomSelect 
                required
                name="origin"
                value={agreementOrigin}
                onChange={(val) => setAgreementOrigin(val)}
                placeholder="Selecione uma origem..."
                options={[
                  { value: AgreementOrigin.SALESFORCE, label: "Salesforce" },
                  { value: AgreementOrigin.OKTOR, label: "Oktor" },
                  { value: AgreementOrigin.CALLIX, label: "Callix" },
                  { value: AgreementOrigin.WHATSAPP, label: "WhatsApp" },
                  { value: AgreementOrigin.WEBPHONE, label: "Webphone" },
                  { value: AgreementOrigin.QUITE_DIGITAL, label: "Quite Digital" }
                ]}
              />
            </div>

            {mode === 'agreement' && (
              <>
                {/* Categoria */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">O acordo é *</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="relative flex flex-col cursor-pointer group">
                      <input 
                        type="radio" 
                        name="category" 
                        value={AgreementCategory.FIXA} 
                        checked={category === AgreementCategory.FIXA} 
                        onChange={() => setCategory(AgreementCategory.FIXA)}
                        className="peer hidden" 
                      />
                      <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all backdrop-blur-sm ${
                        category === AgreementCategory.FIXA ? 'border-sky-500/50 bg-sky-500/5' : 'border-white/10 bg-white/5'
                      }`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          category === AgreementCategory.FIXA ? 'border-sky-500 bg-sky-500/10' : 'border-slate-700 bg-transparent'
                        }`}>
                          {category === AgreementCategory.FIXA && <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />}
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                          category === AgreementCategory.FIXA ? 'text-white' : 'text-slate-400'
                        }`}>Fixa</span>
                      </div>
                    </label>
                    <label className="relative flex flex-col cursor-pointer group">
                      <input 
                        type="radio" 
                        name="category" 
                        value={AgreementCategory.VARIAVEL} 
                        checked={category === AgreementCategory.VARIAVEL} 
                        onChange={() => setCategory(AgreementCategory.VARIAVEL)}
                        className="peer hidden" 
                      />
                      <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all backdrop-blur-sm ${
                        category === AgreementCategory.VARIAVEL ? 'border-sky-500/50 bg-sky-500/5' : 'border-white/10 bg-white/5'
                      }`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          category === AgreementCategory.VARIAVEL ? 'border-sky-500 bg-sky-500/10' : 'border-slate-700 bg-transparent'
                        }`}>
                          {category === AgreementCategory.VARIAVEL && <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />}
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                          category === AgreementCategory.VARIAVEL ? 'text-white' : 'text-slate-400'
                        }`}>Variável</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Status Inicial */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Status Inicial</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="relative flex flex-col cursor-pointer group">
                      <input 
                        type="radio" 
                        name="initialStatus" 
                        value={AgreementStatus.WAITING} 
                        checked={initialStatus === AgreementStatus.WAITING} 
                        onChange={() => setInitialStatus(AgreementStatus.WAITING)}
                        className="peer hidden" 
                      />
                      <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all backdrop-blur-sm ${
                        initialStatus === AgreementStatus.WAITING ? 'border-sky-500/50 bg-sky-500/5' : 'border-white/10 bg-white/5'
                      }`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          initialStatus === AgreementStatus.WAITING ? 'border-sky-500 bg-sky-500/10' : 'border-slate-700 bg-transparent'
                        }`}>
                          {initialStatus === AgreementStatus.WAITING && <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                            initialStatus === AgreementStatus.WAITING ? 'text-white' : 'text-slate-400'
                          }`}>Pendente</span>
                          <span className="text-[9px] text-slate-500 font-medium">Aguardando pagamento</span>
                        </div>
                      </div>
                    </label>
                    <label className="relative flex flex-col cursor-pointer group">
                      <input 
                        type="radio" 
                        name="initialStatus" 
                        value={AgreementStatus.PAID} 
                        checked={initialStatus === AgreementStatus.PAID} 
                        onChange={() => setInitialStatus(AgreementStatus.PAID)}
                        className="peer hidden" 
                      />
                      <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all backdrop-blur-sm ${
                        initialStatus === AgreementStatus.PAID ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-white/5'
                      }`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          initialStatus === AgreementStatus.PAID ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-transparent'
                        }`}>
                          {initialStatus === AgreementStatus.PAID && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                            initialStatus === AgreementStatus.PAID ? 'text-white' : 'text-slate-400'
                          }`}>Já Pago</span>
                          <span className="text-[9px] text-slate-500 font-medium">Registrar como efetivado</span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Observações */}
            <div className="space-y-1.5 mt-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                {mode === 'schedule' ? 'Motivo do Agendamento *' : 'Observações do Acordo / Negociação'}
              </label>
              <textarea 
                required={mode === 'schedule'}
                name="notes"
                rows={4}
                defaultValue={editingAgreement?.notes}
                placeholder={mode === 'schedule' ? "Ex: Motivo de contato; cliente solicitou ligar na parte da tarde; acordou negociar no dia 10..." : "Ex: Cliente informou que pagará após as 14h; alegou atraso no salário..."}
                className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white backdrop-blur-sm resize-none text-xs"
              />
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                <span>{formError}</span>
              </div>
            )}
          </div>

          <div className="p-8 pt-4 border-t border-white/5 bg-white/5 backdrop-blur-xl flex gap-4 shrink-0">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-xl border border-white/10 font-bold text-slate-400 hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className={`flex-1 px-6 py-4 rounded-xl font-bold transition-colors shadow-lg active:scale-95 ${
                mode === 'schedule' 
                  ? 'bg-amber-500 text-white hover:bg-amber-400 shadow-amber-500/20' 
                  : 'bg-sky-500 text-white hover:bg-sky-400 shadow-sky-500/20'
              }`}
            >
              {editingAgreement 
                ? (mode === 'schedule' ? 'Atualizar Agendamento' : 'Atualizar Acordo') 
                : (mode === 'schedule' ? 'Salvar Agendamento' : 'Salvar Acordo')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

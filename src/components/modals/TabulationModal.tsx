import React, { useState, useEffect } from 'react';
import { X, PhoneCall, Check, User, FileText, Link, Headphones, CheckCircle, Warning, UploadSimple, FileAudio, CircleNotch, Microphone, Sparkle, Info } from '@phosphor-icons/react';
import { Agreement, AttendanceReason, AttendanceRecord, UserProfile } from '../../types';
import { formatCPF } from '../../utils/masks';
import { formatAudioStreamUrl } from '../../utils/audio';
import { r2Service } from '../../lib/r2Service';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';

interface TabulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: {
    clientCpf: string;
    clientName: string;
    reasonId: string;
    reasonTitle: string;
    isNegotiation: boolean;
    isSuccess: boolean;
    audioUrl?: string;
    audioExpiresAt?: string;
    observation?: string;
    agreementId?: string;
  }) => void;
  existingAgreements: Agreement[];
  customReasons?: AttendanceReason[];
  attendanceRecords?: AttendanceRecord[];
  userTeamId?: string;
  organizationId?: string;
  theme?: 'light' | 'dark';
}

const DEFAULT_REASONS: AttendanceReason[] = [
  { id: 'reason_1', organizationId: '', title: 'Acordo Fechado / Negociação Aceita', isNegotiation: true, isSuccess: true, active: true },
  { id: 'reason_2', organizationId: '', title: 'Proposta Recusada / Sem Acordo', isNegotiation: true, isSuccess: false, active: true },
  { id: 'reason_3', organizationId: '', title: 'Dúvida de Boleto / Segunda Via', isNegotiation: false, isSuccess: false, active: true },
  { id: 'reason_4', organizationId: '', title: 'Solicitação de Saque / Informação Institucional', isNegotiation: false, isSuccess: false, active: true },
  { id: 'reason_5', organizationId: '', title: 'Caixa Postal / Sem Contato Efetivo', isNegotiation: false, isSuccess: false, active: true }
];

export const TabulationModal: React.FC<TabulationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingAgreements = [],
  customReasons = [],
  attendanceRecords = [],
  userTeamId,
  organizationId,
  theme = 'dark'
}) => {
  const [cpf, setCpf] = useState('');
  const [clientName, setClientName] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioExpiresAt, setAudioExpiresAt] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [observation, setObservation] = useState('');
  const [selectedAgreementId, setSelectedAgreementId] = useState('');

  const { isListening, isSupported, toggleListening } = useVoiceDictation({
    onResult: (text) => {
      setObservation(text);
    }
  });

  const isDark = theme === 'dark';
  const allReasons = customReasons.length > 0 ? customReasons : DEFAULT_REASONS;

  // Filtragem de motivos: Globais (sem teamId ou 'all') + Específicos do time do operador
  const reasons = React.useMemo(() => {
    return allReasons.filter(r => {
      if (!r.teamId || r.teamId === 'all') return true;
      if (userTeamId && r.teamId === userTeamId) return true;
      return false;
    });
  }, [allReasons, userTeamId]);

  // Cálculo da frequência de uso de cada motivo nos atendimentos recentes
  const usageCountMap = React.useMemo(() => {
    const counts: Record<string, number> = {};
    attendanceRecords.forEach(rec => {
      const key = rec.reasonId || rec.reasonTitle;
      if (key) {
        counts[key] = (counts[key] || 0) + 1;
      }
      if (rec.reasonTitle) {
        counts[rec.reasonTitle] = (counts[rec.reasonTitle] || 0) + 1;
      }
    });
    return counts;
  }, [attendanceRecords]);

  // Motivos ordenados por frequência de uso (mais usados primeiro nos botões rápidos)
  const quickReasons = React.useMemo(() => {
    return [...reasons].sort((a, b) => {
      const countA = usageCountMap[a.id] || usageCountMap[a.title] || 0;
      const countB = usageCountMap[b.id] || usageCountMap[b.title] || 0;
      return countB - countA;
    });
  }, [reasons, usageCountMap]);

  const [selectedReasonId, setSelectedReasonId] = useState(() => {
    return quickReasons[0]?.id || 'reason_1';
  });

  // Atualiza seleção padrão se a lista de motivos mudar
  useEffect(() => {
    if (quickReasons.length > 0 && !quickReasons.some(r => r.id === selectedReasonId)) {
      setSelectedReasonId(quickReasons[0].id);
    }
  }, [quickReasons, selectedReasonId]);

  const currentReason = reasons.find(r => r.id === selectedReasonId) || reasons[0] || DEFAULT_REASONS[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('O arquivo de áudio deve ter no máximo 15 MB.');
      return;
    }

    try {
      setIsUploading(true);
      setFileName(file.name);
      const result = await r2Service.uploadAudio(file, organizationId || 'demo');
      setAudioUrl(result.url);
      setAudioExpiresAt(result.expiresAt);
    } catch (err) {
      console.error(err);
      alert('Erro ao realizar upload do arquivo de áudio.');
    } finally {
      setIsUploading(false);
    }
  };

  // Busca automática por CPF ao digitar
  useEffect(() => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length === 11) {
      const match = existingAgreements.find(a => (a.clientCpf || '').replace(/\D/g, '') === cleanCpf);
      if (match && match.clientName) {
        setClientName(match.clientName);
        if (match.id) {
          setSelectedAgreementId(match.id);
        }
      }
    }
  }, [cpf, existingAgreements]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length > 0 && cleanCpf.length < 11) {
      alert('Por favor, informe um CPF completo com 11 dígitos ou deixe o campo em branco.');
      return;
    }

    const processedAudioUrl = formatAudioStreamUrl(audioUrl);

    onSave({
      clientCpf: cpf.trim(),
      clientName: clientName.trim() || (cpf.trim() ? 'Cliente Identificado' : 'Contato sem identificação'),
      reasonId: currentReason.id,
      reasonTitle: currentReason.title,
      isNegotiation: currentReason.isNegotiation,
      isSuccess: currentReason.isSuccess,
      audioUrl: processedAudioUrl || undefined,
      audioExpiresAt: audioExpiresAt || undefined,
      observation: observation.trim() || undefined,
      agreementId: currentReason.isSuccess ? (selectedAgreementId || undefined) : undefined
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border p-5 sm:p-6 shadow-2xl transition-all my-auto ${
          isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 border-white/10 sticky top-0 bg-slate-900/90 backdrop-blur-sm z-10 -mt-1 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <PhoneCall size={20} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Nova Tabulação de Atendimento</h3>
              <span className="text-[11px] text-slate-400 font-medium">Registro ágil de contato telefônico e WhatsApp</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 my-4">
          {/* Presets de Tabulação Rápida (1-Click Selection) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkle size={13} className="text-amber-400" />
                Tabulação Rápida (Mais Usados / 1 Clique)
              </label>
              {Object.keys(usageCountMap).length > 0 && (
                <span className="text-[10px] text-slate-400 font-medium">Ordem adaptada ao seu uso</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {quickReasons.slice(0, 6).map((r, idx) => {
                const isSelected = r.id === selectedReasonId;
                const uses = usageCountMap[r.id] || usageCountMap[r.title] || 0;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedReasonId(r.id)}
                    className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-md ring-1 ring-sky-400'
                        : isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-800/60'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-bold line-clamp-2 leading-tight">
                        {r.title.split('/')[0].trim()}
                      </span>
                      {uses > 0 && idx === 0 && (
                        <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                          Top #1
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`text-[9px] font-semibold ${r.isSuccess ? 'text-emerald-400' : r.isNegotiation ? 'text-sky-400' : 'text-slate-400'}`}>
                        {r.isSuccess ? '✓ Acordo' : r.isNegotiation ? '• Negociação' : '• Institucional'}
                      </span>
                      {r.teamId && r.teamId !== 'all' && (
                        <span className="text-[8px] font-mono text-indigo-400 bg-indigo-500/10 px-1 py-0.2 rounded">
                          Equipe
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seletor Completo de Motivo */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
              Todos os Motivos Cadastrados
            </label>
            <select
              value={selectedReasonId}
              onChange={(e) => setSelectedReasonId(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs border font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              {reasons.map(r => (
                <option key={r.id} value={r.id}>
                  {r.title} {r.isNegotiation ? '(Oportunidade Efetiva)' : '(Contato Institucional)'}
                </option>
              ))}
            </select>
          </div>

          {/* Tags Informativas da Flag */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className={`px-2.5 py-0.5 rounded-full font-bold border ${
              currentReason.isNegotiation ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {currentReason.isNegotiation ? '✓ Conta no Denominador (Negociação)' : '🚫 Excluído do Cálculo de Conversão'}
            </span>
            {currentReason.isSuccess && (
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                🎉 Acordo Gerado
              </span>
            )}
          </div>

          {/* Dados do Cliente: CPF Opcional & Nome Opcional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* CPF Opcional com Autopreenchimento */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  CPF do Cliente
                </label>
                <span className="text-[10px] text-slate-500 font-semibold">Opcional</span>
              </div>
              <input 
                type="text"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {/* Nome do Cliente (Auto-preenchido ou editável) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Nome do Cliente
                </label>
                <span className="text-[10px] text-slate-500 font-semibold">Opcional</span>
              </div>
              <input 
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome completo do cliente"
                className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
            <Info size={14} className="text-sky-400 shrink-0" />
            <span>Para atendimentos improdutivos (ex: Caixa Postal, Número Errado), não é necessário preencher CPF nem Nome.</span>
          </div>

          {/* Vínculo de Acordo se for Sucesso */}
          {currentReason.isSuccess && existingAgreements.length > 0 && (
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Vincular ao Acordo Criado
              </label>
              <select
                value={selectedAgreementId}
                onChange={(e) => setSelectedAgreementId(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="">-- Selecionar Acordo --</option>
                {existingAgreements.map(a => (
                  <option key={a.id} value={a.id}>
                    #AC-{a.id.slice(-4).toUpperCase()} • R$ {a.value.toLocaleString('pt-BR')} ({a.clientName})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Área de Gravação de Áudio (Upload Direto MP3/WAV) */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Headphones size={13} className="text-sky-400" />
              Gravação do Atendimento (Arquivo MP3/WAV)
            </label>

            <div className="relative">
              <label className={`w-full flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                isDark ? 'bg-slate-950/60 border-slate-700 hover:border-sky-500/50' : 'bg-slate-50 border-slate-300 hover:border-sky-500'
              }`}>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  {isUploading ? (
                    <CircleNotch size={18} className="animate-spin text-sky-400" />
                  ) : (
                    <UploadSimple size={18} className="text-sky-400" />
                  )}
                  <span>{fileName ? `Selecionado: ${fileName}` : 'Clique para selecionar ou arrastar áudio MP3/WAV (Máx 15MB)'}</span>
                </div>
                <input 
                  type="file" 
                  accept="audio/*,.mp3,.wav,.m4a,.ogg" 
                  onChange={handleFileUpload} 
                  disabled={isUploading}
                  className="hidden" 
                />
              </label>
            </div>

            {audioUrl.trim() && (
              <div className="mt-2 p-2.5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-1.5">
                <span className="text-[10px] font-bold text-sky-400 block">Pré-visualização do Áudio:</span>
                <audio controls src={formatAudioStreamUrl(audioUrl)} className="h-8 w-full rounded-lg bg-slate-900" />
              </div>
            )}
          </div>

          {/* Observações / Relato livre com Ditado por Voz (Web Speech API) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Observação / Relato do Atendimento
              </label>
              {isSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' 
                      : 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20'
                  }`}
                  title={isListening ? 'Clique para parar o ditado' : 'Clique para ditar por voz'}
                >
                  <Microphone size={12} className={isListening ? 'animate-bounce' : ''} />
                  <span>{isListening ? 'Ouvindo...' : 'Ditar por Voz'}</span>
                </button>
              )}
            </div>
            <textarea
              rows={2}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Descreva detalhes importantes da conversa ou clique no microfone para ditar..."
              className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 cursor-pointer transition-all"
            >
              Salvar Tabulação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

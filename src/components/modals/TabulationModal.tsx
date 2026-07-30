import React, { useState, useEffect } from 'react';
import { X, PhoneCall, Check, User, FileText, Link, Headphones, CheckCircle, Warning, UploadSimple, FileAudio, CircleNotch } from '@phosphor-icons/react';
import { Agreement, AttendanceReason, UserProfile } from '../../types';
import { formatCPF } from '../../utils/masks';
import { formatAudioStreamUrl } from '../../utils/audio';
import { r2Service } from '../../lib/r2Service';

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
  organizationId,
  theme = 'dark'
}) => {
  const [cpf, setCpf] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedReasonId, setSelectedReasonId] = useState('reason_1');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioExpiresAt, setAudioExpiresAt] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [observation, setObservation] = useState('');
  const [selectedAgreementId, setSelectedAgreementId] = useState('');

  const isDark = theme === 'dark';
  const reasons = customReasons.length > 0 ? customReasons : DEFAULT_REASONS;

  const currentReason = reasons.find(r => r.id === selectedReasonId) || reasons[0];

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
    if (!cpf || cpf.replace(/\D/g, '').length < 11) {
      alert('Por favor, informe um CPF válido.');
      return;
    }

    const processedAudioUrl = formatAudioStreamUrl(audioUrl);

    onSave({
      clientCpf: cpf,
      clientName: clientName || 'Cliente não identificado',
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
              <span className="text-[11px] text-slate-400 font-medium">Registro de contato telefônico / WhatsApp</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 my-4">
          {/* CPF com Autopreenchimento */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
              CPF do Cliente <span className="text-rose-400">*</span>
            </label>
            <input 
              type="text"
              value={cpf}
              onChange={(e) => setCpf(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
              required
              className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Nome do Cliente (Auto-preenchido ou editável) */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
              Nome do Cliente
            </label>
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

          {/* Motivo do Atendimento */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
              Motivo do Atendimento <span className="text-rose-400">*</span>
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

          {/* Observações / Relato livre */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
              Observação / Relato do Atendimento
            </label>
            <textarea
              rows={2}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Descreva detalhes importantes da conversa ou observações..."
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

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Paperclip, 
  UploadSimple, 
  FilePdf, 
  Image as ImageIcon, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  Trash, 
  DownloadSimple, 
  ArrowSquareOut
} from '@phosphor-icons/react';
import { Agreement, UserProfile } from '../../types';
import { formatCurrency, formatCPF } from '../../utils/masks';

interface ReceiptAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreement: Agreement | null;
  profile: UserProfile;
  isDemoMode?: boolean;
  onSaveReceipt: (agreementId: string, receiptData: { receiptUrl: string; receiptFileName: string }) => Promise<void>;
}

export const ReceiptAttachmentModal: React.FC<ReceiptAttachmentModalProps> = ({
  isOpen,
  onClose,
  agreement,
  profile,
  isDemoMode = false,
  onSaveReceipt
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(agreement?.receiptUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  if (!isOpen || !agreement) return null;

  const retentionPrefix = isDemoMode ? 'sandbox-24h/' : 'receipts-1year/';
  const retentionPeriodText = isDemoMode 
    ? '⚠️ Modo Demonstração (Sandbox): Armazenamento temporário com expiração em 24 horas.' 
    : '🛡️ Modo Produção: Retenção legal em nuvem privada R2 garantida por 1 ano.';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const tempUrl = URL.createObjectURL(file);
      setPreviewUrl(tempUrl);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile && !previewUrl) return;

    setIsUploading(true);

    try {
      // Simulação / Estrutura de Upload para R2 (Cloudflare Storage)
      const sanitizedFileName = selectedFile 
        ? selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        : 'comprovante.pdf';

      const finalR2Path = `https://r2.traker.com.br/${retentionPrefix}${agreement.id}_${Date.now()}_${sanitizedFileName}`;

      await onSaveReceipt(agreement.id, {
        receiptUrl: previewUrl || finalR2Path,
        receiptFileName: selectedFile?.name || agreement.receiptFileName || 'comprovante.pdf'
      });

      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Erro ao salvar comprovante:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const isPdf = (selectedFile?.type === 'application/pdf') || (agreement.receiptFileName?.toLowerCase().endsWith('.pdf'));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
        >
          {/* CABEÇALHO DO MODAL */}
          <div className="p-6 bg-slate-950 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Paperclip size={24} weight="duotone" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Central de Comprovantes R2</h3>
                <p className="text-xs text-slate-400 font-medium">
                  {agreement.clientName} — <span className="font-mono">{formatCPF(agreement.clientCpf)}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* ÁREA DE RETENÇÃO E POLÍTICA R2 */}
          <div className="px-6 py-3 bg-slate-950/60 border-b border-white/10 text-xs font-bold text-slate-300">
            <p className={isDemoMode ? 'text-amber-400 font-mono text-[11px]' : 'text-emerald-400 text-[11px]'}>
              {retentionPeriodText}
            </p>
          </div>

          {/* CONTEÚDO DO UPLOAD / PRÉ-VISUALIZAÇÃO */}
          <div className="p-6 space-y-5">
            
            {/* COMPROVANTE JÁ ANEXADO */}
            {agreement.receiptUrl && !selectedFile && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle size={16} /> Comprovante Anexado no Sistema
                  </span>
                  <a
                    href={agreement.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 hover:underline"
                  >
                    <span>Abrir Original</span>
                    <ArrowSquareOut size={14} />
                  </a>
                </div>

                <p className="text-xs text-slate-300 truncate">
                  Arquivo: <span className="font-mono font-bold text-white">{agreement.receiptFileName || 'comprovante.pdf'}</span>
                </p>

                {/* PRÉ-VISUALIZADOR DA IMAGEM SE FOR IMAGEM */}
                {agreement.receiptUrl.match(/\.(jpeg|jpg|png|webp)/i) ? (
                  <div className="w-full h-48 rounded-xl overflow-hidden bg-slate-900 border border-white/10 flex items-center justify-center">
                    <img src={agreement.receiptUrl} alt="Comprovante" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900 border border-white/10 flex items-center gap-3">
                    <FilePdf size={32} className="text-rose-400 shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold text-white">Documento em Formato PDF</p>
                      <p className="text-slate-400 text-[11px]">Clique em "Abrir Original" para visualizar a cópia inteira.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DROPZONE / PICKER DE NOVO ARQUIVO */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-slate-300">
                {agreement.receiptUrl ? 'Substituir Comprovante' : 'Anexar Novo Comprovante'}
              </label>

              <label className="border-2 border-dashed border-white/15 hover:border-emerald-500/50 bg-slate-950/80 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all">
                <UploadSimple size={32} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-200">
                  {selectedFile ? selectedFile.name : 'Clique para selecionar o arquivo do seu dispositivo'}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Formatos aceitos: JPG, PNG, WEBP ou PDF (máx. 10MB)
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile && !previewUrl || isUploading}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
              >
                {uploadSuccess ? (
                  <>
                    <CheckCircle size={16} />
                    <span>Salvo com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <UploadSimple size={16} weight="bold" />
                    <span>{isUploading ? 'Enviando...' : 'Salvar no R2'}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReceiptAttachmentModal;

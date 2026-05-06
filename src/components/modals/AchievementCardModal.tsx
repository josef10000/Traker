import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Trophy, Star, Target, Zap, Loader2 } from 'lucide-react';

interface AchievementCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  amountPaid: number;
  goalPercentage: number;
  agreementsCount: number;
  ticketAverage: number;
  periodLabel: string;
  themeColor?: string; // e.g. '#0ea5e9'
}

export const AchievementCardModal = ({
  isOpen,
  onClose,
  userName,
  amountPaid,
  goalPercentage,
  agreementsCount,
  ticketAverage,
  periodLabel,
  themeColor = '#0ea5e9'
}: AchievementCardModalProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getAchievementTitle = () => {
    if (goalPercentage >= 150) return 'Lenda da Recuperação 👑';
    if (goalPercentage >= 120) return 'Performance Épica 🚀';
    if (goalPercentage >= 100) return 'Meta Batida! 🎯';
    if (goalPercentage >= 80) return 'Quase Lá! 🔥';
    return 'Construindo Resultado 📈';
  };

  const handleDownload = async () => {
    if (!cardRef.current || !(window as any).html2canvas) return;
    
    try {
      setIsGenerating(true);
      
      // Delay para garantir estabilidade do DOM e animações
      await new Promise(resolve => setTimeout(resolve, 600));

      const canvas = await (window as any).html2canvas(cardRef.current, {
        scale: 2, 
        backgroundColor: '#020617', 
        useCORS: true,
        logging: false,
        onclone: (clonedDoc: Document) => {
          const textElements = clonedDoc.querySelectorAll('.bg-clip-text');
          textElements.forEach((el: any) => {
            el.style.backgroundClip = 'none';
            el.style.webkitBackgroundClip = 'none';
            el.style.color = 'white';
            el.style.backgroundImage = 'none';
          });

          // Remover blurs e oklch (cores modernas não suportadas pelo html2canvas)
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el: any) => {
            const style = window.getComputedStyle(el);
            
            // Corrigir oklch nas propriedades comuns
            const properties = ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'];
            properties.forEach(prop => {
              const val = (el.style as any)[prop] || style.getPropertyValue(prop);
              if (val && val.includes('oklch')) {
                // Se for oklch, tentamos simplificar para uma cor sólida ou remover
                // O ideal seria converter, mas como o html2canvas trava, vamos forçar cores seguras
                if (prop === 'color') el.style.color = 'white';
                if (prop === 'backgroundColor') el.style.backgroundColor = style.backgroundColor.includes('oklch') ? '#0f172a' : style.backgroundColor;
                if (prop === 'borderColor') el.style.borderColor = 'rgba(255,255,255,0.1)';
              }
            });

            if (style.backdropFilter !== 'none' || (style as any).webkitBackdropFilter !== 'none') {
              el.style.backdropFilter = 'none';
              (el.style as any).webkitBackdropFilter = 'none';
              el.style.backgroundColor = 'rgba(15, 23, 42, 0.9)'; 
            }
          });
        }
      });

      // Se chegamos aqui, o canvas foi gerado. Vamos tentar converter para imagem.
      // Removendo o parâmetro de qualidade do PNG (que não existe na spec e pode ser ignorado ou causar erro em browsers antigos)
      const image = canvas.toDataURL('image/png');
      
      const link = document.createElement('a');
      link.href = image;
      link.download = `noverde-conquista-${userName.split(' ')[0] || 'user'}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Html2Canvas Error Details:', error);
      alert('Erro técnico ao gerar a imagem. Tente baixar em outro navegador ou verifique as permissões de download.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-start p-4 sm:p-8 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
          />
          
          <div className="relative w-full max-w-sm flex flex-col items-center py-4 sm:py-10">
            
            {/* Download Action Area */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex justify-between items-center mb-6"
            >
              <h2 className="text-white font-bold text-lg">Compartilhar Vitória</h2>
              <button 
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-slate-300 hover:text-white"
              >
                <X size={20} />
              </button>
            </motion.div>

            {/* The actual card to capture */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              ref={cardRef}
              className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              style={{
                background: `linear-gradient(145deg, #020617 0%, #0f172a 100%)`,
                border: `1px solid rgba(255,255,255,0.1)`
              }}
            >
              {/* Decorative Background Elements */}
              <div 
                className="absolute -top-32 -left-32 w-64 h-64 rounded-full blur-3xl opacity-30"
                style={{ backgroundColor: themeColor }}
              />
              <div 
                className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-20"
                style={{ backgroundColor: themeColor }}
              />

              {/* Card Header */}
              <div className="p-3 pb-0 text-center relative z-10 flex flex-col items-center mt-1">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg mb-2"
                  style={{ background: `linear-gradient(135deg, ${themeColor} 0%, rgba(255,255,255,0.1) 100%)` }}
                >
                  <Trophy size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight leading-none mb-0.5">
                  {getAchievementTitle()}
                </h3>
                <p className="text-sm text-slate-300 font-medium">
                  {userName}
                </p>
                <div className="mt-2 inline-block px-3 py-1 rounded-full bg-white/10 border border-white/5 backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-300">{periodLabel}</p>
                </div>
              </div>

              {/* Main Metric */}
              <div className="flex-1 flex flex-col justify-center items-center px-6 relative z-10">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Total Recuperado</p>
                <h1 
                  className="text-5xl font-black text-transparent bg-clip-text text-center tracking-tighter"
                  style={{ backgroundImage: `linear-gradient(to right, #fff, ${themeColor})` }}
                >
                  {formatCurrency(amountPaid)}
                </h1>
                
                <div className="mt-2 w-full max-w-[180px] flex flex-col items-center">
                  <div className="flex justify-between w-full text-xs font-bold text-slate-300 mb-2">
                    <span>Meta</span>
                    <span style={{ color: goalPercentage >= 100 ? '#10b981' : themeColor }}>
                      {goalPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${Math.min(goalPercentage, 100)}%`,
                        backgroundColor: goalPercentage >= 100 ? '#10b981' : themeColor,
                        boxShadow: `0 0 10px ${goalPercentage >= 100 ? '#10b981' : themeColor}`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Secondary Stats Footer */}
              <div className="p-3 relative z-10 grid grid-cols-2 gap-2 mt-auto mb-1">
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5 text-center flex flex-col items-center justify-center">
                  <Star size={16} className="text-amber-400 mb-2" />
                  <p className="text-2xl font-black text-white leading-none">{agreementsCount}</p>
                  <p className="text-[9px] uppercase font-bold text-slate-400 mt-1">Acordos Feitos</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5 text-center flex flex-col items-center justify-center">
                  <Target size={16} className="text-indigo-400 mb-2" />
                  <p className="text-xl font-black text-white leading-none">{formatCurrency(ticketAverage)}</p>
                  <p className="text-[9px] uppercase font-bold text-slate-400 mt-1">Ticket Médio</p>
                </div>
              </div>
              
              {/* Watermark */}
              <div className="absolute bottom-4 w-full text-center opacity-30 z-0">
                <span className="text-[8px] uppercase tracking-widest font-black text-white">
                  Gerado no RNV Gestão
                </span>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 w-full flex gap-3"
            >
              <button 
                onClick={handleDownload}
                disabled={isGenerating}
                className="flex-1 py-4 px-6 bg-primary hover:bg-sky-400 text-white font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isGenerating ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <Download size={20} />
                    Baixar Imagem
                  </>
                )}
              </button>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

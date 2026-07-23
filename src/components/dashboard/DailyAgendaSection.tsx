import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Phone, Play, Copy, Calendar, CircleNotch as Loader2 } from '@phosphor-icons/react';
import { Agreement, UserProfile } from '../../types';
import { CustomSelect } from '../ui/CustomSelect';

interface DailyAgendaSectionProps {
  scheduledAgreements: Agreement[];
  isLoading: boolean;
  profile: UserProfile;
  currentTeamMembers: UserProfile[];
  selectedMemberId: string;
  setSelectedMemberId: (id: string) => void;
  viewMode: 'personal' | 'team';
  onAttend: (agreement: Agreement) => void;
  onConfirmContact?: (agreement: Agreement) => void;
  onDeleteFromAgenda?: (agreement: Agreement) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  theme?: 'light' | 'dark';
}

export const DailyAgendaSection = ({
  scheduledAgreements,
  isLoading,
  profile,
  currentTeamMembers,
  selectedMemberId,
  setSelectedMemberId,
  viewMode,
  onAttend,
  onConfirmContact,
  onDeleteFromAgenda,
  showToast,
  theme = 'dark'
}: DailyAgendaSectionProps) => {
  const isSuperUser = profile.role === 'supervisor' || profile.role === 'manager' || profile.role === 'super_admin';

  // Paginação: Máximo de 4 linhas por página
  const ITEMS_PER_PAGE = 4;
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages = Math.ceil(scheduledAgreements.length / ITEMS_PER_PAGE) || 1;

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [scheduledAgreements.length, totalPages, currentPage]);

  const paginatedAgreements = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return scheduledAgreements.slice(start, start + ITEMS_PER_PAGE);
  }, [scheduledAgreements, currentPage]);

  // Copiar CPF
  const handleCopyCpf = (cpf?: string) => {
    if (!cpf) return;
    const clean = cpf.replace(/\D/g, '');
    navigator.clipboard.writeText(clean);
    showToast(`CPF ${cpf} copiado!`, 'success');
  };

  return (
    <section className={`glass-card p-6 rounded-[2rem] border space-y-4 ${
      theme === 'dark' ? 'border-white/5 bg-slate-900/10' : 'border-slate-200 bg-white shadow-sm'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
            <Calendar className="text-amber-500 dark:text-amber-400" size={20} />
          </div>
          <div>
            <h2 className={`text-base font-bold tracking-tight leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Agenda do Dia</h2>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1 block">
              Retornos e Compromissos ({scheduledAgreements.length})
            </span>
          </div>
        </div>

        {/* Dropdown de Gestão Hierárquica (Apenas se for Supervisor/Gerente na visão equipe) */}
        {isSuperUser && viewMode === 'team' && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Filtrar Agenda:</span>
            <div className="w-48">
              <CustomSelect 
                value={selectedMemberId}
                onChange={(val) => setSelectedMemberId(val)}
                placeholder="Todos os Operadores"
                options={[
                  { value: "all", label: "Todos os Operadores" },
                  ...currentTeamMembers.map(member => ({
                    value: member.uid,
                    label: member.displayName || member.email.split('@')[0]
                  }))
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
          <Loader2 className="animate-spin text-sky-500" size={20} />
          <span className="text-xs font-medium">Sincronizando agenda...</span>
        </div>
      ) : scheduledAgreements.length === 0 ? (
        <div className={`text-center py-8 text-xs italic rounded-2xl border border-dashed ${
          theme === 'dark' ? 'text-slate-500 border-white/5 bg-white/5' : 'text-slate-400 border-slate-200 bg-slate-50/50'
        }`}>
          Nenhum compromisso agendado para hoje.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto custom-scrollbar rounded-2xl border border-white/5">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 backdrop-blur-md">
              <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${
                theme === 'dark' ? 'border-white/5 bg-slate-950/80 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
              }`}>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">CPF</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Observação / Horário</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${
              theme === 'dark' ? 'divide-white/[0.02] text-slate-300' : 'divide-slate-100 text-slate-700'
            }`}>
              {paginatedAgreements.map((agreement) => {
                const formattedTime = agreement.scheduledAt 
                  ? new Date(agreement.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : 'Sem hora';

                return (
                  <tr key={agreement.id} className={`transition-colors border-b ${
                    theme === 'dark' ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'
                  }`}>
                    <td className="px-4 py-3 font-bold text-white max-w-[160px] truncate" title={agreement.clientName}>
                      {agreement.clientName || 'Cliente sem nome'}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <button
                        onClick={() => handleCopyCpf(agreement.clientCpf)}
                        className="text-xs font-mono text-slate-300 hover:text-indigo-400 font-medium cursor-pointer transition-colors"
                        title="Clique para copiar CPF"
                      >
                        {agreement.clientCpf}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-300">{agreement.phone || 'Sem tel'}</span>
                        {agreement.phone && (
                          <a
                            href={`https://wa.me/${agreement.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 p-1"
                            title="WhatsApp"
                          >
                            <Phone size={12} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[250px]">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                          <Clock size={10} />
                          {formattedTime}
                        </span>
                        <span className="text-[11px] text-slate-400 italic block truncate" title={agreement.notes}>{agreement.notes || 'Sem observação'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onConfirmContact && (
                          <button
                            onClick={() => onConfirmContact(agreement)}
                            className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[11px] font-medium rounded-lg transition-all cursor-pointer border border-slate-700 active:scale-95 flex items-center gap-1"
                            title="Confirmar que entrou em contato"
                          >
                            📞 Contatado
                          </button>
                        )}
                        <button
                          onClick={() => onAttend(agreement)}
                          className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-semibold rounded-lg transition-all cursor-pointer border border-indigo-500/30 active:scale-95 flex items-center gap-1"
                          title="Registrar Acordo"
                        >
                          🤝 Acordo
                        </button>
                        {onDeleteFromAgenda && (
                          <button
                            onClick={() => onDeleteFromAgenda(agreement)}
                            className="px-2 py-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-[11px] font-medium rounded-lg transition-all cursor-pointer border border-transparent hover:border-rose-500/20 active:scale-95 flex items-center gap-1"
                            title="Excluir da Agenda do Dia"
                          >
                            🗑️ Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Navegação por Paginação (4 itens por página) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 px-1">
          <span className="text-[11px] font-bold text-slate-400">
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, scheduledAgreements.length)} de {scheduledAgreements.length} compromisso(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 active:scale-95 cursor-pointer"
            >
              ← Anterior
            </button>
            <span className="text-xs font-black text-white px-2">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 active:scale-95 cursor-pointer"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

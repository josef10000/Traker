import React, { useState } from 'react';
import { 
  PaperPlaneTilt, 
  Plus, 
  Trash 
} from '@phosphor-icons/react';
import { UserProfile, Team, UserRole } from '../../types';
import { CustomSelect } from '../ui/CustomSelect';
import { createInvitesInBulk } from '../../lib/teams';
import { sandboxService } from '../../lib/sandboxService';

interface InvitesSectionProps {
  profile: UserProfile;
  theme: 'dark' | 'light';
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  managedTeamsData: Team[];
}

interface InviteRow {
  email: string;
  role: UserRole;
  teamId: string;
  monthlyServiceValue: number;
}

export const InvitesSection: React.FC<InvitesSectionProps> = ({
  profile,
  theme,
  showToast,
  managedTeamsData
}) => {
  const [inviteRows, setInviteRows] = useState<InviteRow[]>([
    { email: '', role: 'member', teamId: '', monthlyServiceValue: 0 }
  ]);
  const [isSending, setIsSending] = useState(false);

  const handleAddInviteRow = () => {
    setInviteRows(prev => [...prev, { email: '', role: 'member', teamId: '', monthlyServiceValue: 0 }]);
  };

  const handleRemoveInviteRow = (index: number) => {
    if (inviteRows.length === 1) return;
    setInviteRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleInviteRowChange = (index: number, field: keyof InviteRow, value: any) => {
    setInviteRows(prev => prev.map((row, idx) => {
      if (idx !== index) return row;
      const updatedRow = { ...row, [field]: value };
      
      // Se mudar a role para um cargo que não tem equipe, limpa o time
      if (field === 'role' && !['member', 'supervisor', 'backoffice'].includes(value)) {
        updatedRow.teamId = '';
      }
      return updatedRow;
    }));
  };

  const handleGenerateInvites = async () => {
    if (!profile.organizationId) return;

    const invalidRows = inviteRows.filter(row => !row.email.trim() || !row.email.includes('@'));
    if (invalidRows.length > 0) {
      showToast('Por favor, preencha todos os e-mails corretamente.', 'error');
      return;
    }

    setIsSending(true);
    try {
      if (profile.organizationId === 'sandbox-test') {
        // No Sandbox, apenas adicionar na simulação
        sandboxService.createInvitesInBulk(
          inviteRows.map(row => ({
            email: row.email.trim().toLowerCase(),
            role: row.role,
            teamId: row.teamId || null,
            monthlyServiceValue: ['member', 'backoffice', 'supervisor', 'monitor'].includes(row.role) ? row.monthlyServiceValue : undefined
          })),
          'sandbox-test',
          profile.uid
        );
        showToast('Convites simulados criados! Você pode aceitá-los na simulação.', 'success');
        setInviteRows([{ email: '', role: 'member', teamId: '', monthlyServiceValue: 0 }]);
        return;
      }

      await createInvitesInBulk(
        profile.uid,
        profile.organizationId,
        inviteRows.map(row => ({
          email: row.email.trim().toLowerCase(),
          role: row.role,
          teamId: row.teamId || null,
          monthlyServiceValue: ['member', 'backoffice', 'supervisor', 'monitor'].includes(row.role) ? row.monthlyServiceValue : undefined
        }))
      );

      showToast('Convites gerados e enviados por e-mail com sucesso!', 'success');
      setInviteRows([{ email: '', role: 'member', teamId: '', monthlyServiceValue: 0 }]);
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Erro ao gerar convites.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6 w-full max-w-4xl animate-fadeIn">
      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <PaperPlaneTilt size={22} className="text-sky-400" />
          Convidar Novos Colaboradores
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Gere links de convite dinâmicos e individuais atrelados ao e-mail corporativo com valores PJ correspondentes.
        </p>
      </div>

      <div className="space-y-4 bg-slate-950/20 p-5 border border-white/5 rounded-2xl">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
          Colaboradores a Convidar
        </div>

        <div className="space-y-3">
          {inviteRows.map((row, idx) => {
            const showTeamSelector = ['member', 'supervisor', 'backoffice'].includes(row.role);
            const showPjValue = ['member', 'backoffice', 'supervisor', 'monitor'].includes(row.role);

            return (
              <div key={idx} className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-slate-950/40 p-4 border border-slate-900 rounded-2xl relative">
                {/* E-mail */}
                <div className="flex-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="nome@empresa.com"
                    value={row.email}
                    onChange={(e) => handleInviteRowChange(idx, 'email', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-850 bg-slate-950 text-white rounded-xl text-xs outline-none focus:border-primary transition-all placeholder:text-white/10"
                  />
                </div>

                {/* Cargo */}
                <div className="w-full md:w-36">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Cargo</label>
                  <CustomSelect 
                    value={row.role}
                    onChange={(val) => handleInviteRowChange(idx, 'role', val as UserRole)}
                    className="py-2 text-xs"
                    options={[
                      { value: "member", label: "Operador" },
                      { value: "supervisor", label: "Supervisor" },
                      { value: "backoffice", label: "BackOffice" },
                      { value: "coordinator", label: "Coordenador" },
                      { value: "monitor", label: "Monitor/QA" },
                      { value: "manager", label: "Gerente" }
                    ]}
                  />
                </div>

                {/* Equipe */}
                <div className="w-full md:w-36">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Equipe</label>
                  <CustomSelect 
                    disabled={!showTeamSelector}
                    value={row.teamId || ''}
                    onChange={(val) => handleInviteRowChange(idx, 'teamId', val)}
                    className="py-2 text-xs"
                    placeholder="Sem equipe"
                    options={managedTeamsData.map(t => ({ value: t.id, label: t.name }))}
                  />
                </div>

                {/* Valor PJ Mensal */}
                <div className="w-full md:w-36">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Contratação PJ (R$)</label>
                  <input
                    type="number"
                    disabled={!showPjValue}
                    placeholder="Ex: 1500"
                    value={row.monthlyServiceValue || ''}
                    onChange={(e) => handleInviteRowChange(idx, 'monthlyServiceValue', Number(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-850 bg-slate-950 text-white rounded-xl text-xs outline-none focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all placeholder:text-white/10"
                  />
                </div>

                {/* Remover linha */}
                {inviteRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveInviteRow(idx)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer self-end md:self-center"
                  >
                    <Trash size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={handleAddInviteRow}
            className="flex items-center gap-1.5 py-2 px-4 border border-white/5 hover:bg-white/5 text-slate-300 hover:text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            <Plus size={14} />
            Adicionar Colaborador
          </button>

          <button
            type="button"
            disabled={isSending}
            onClick={handleGenerateInvites}
            className="flex items-center gap-1.5 py-2 px-5 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-800 disabled:text-slate-600 active:scale-95 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
          >
            {isSending ? 'Gerando...' : 'Gerar e Enviar Convites'}
          </button>
        </div>
      </div>
    </div>
  );
};

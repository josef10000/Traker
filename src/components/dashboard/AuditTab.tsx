import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  MagnifyingGlass as Search, 
  Funnel, 
  Copy, 
  Eye, 
  CheckCircle, 
  Pencil, 
  Trash, 
  User, 
  Clock, 
  DownloadSimple, 
  FileText
} from '@phosphor-icons/react';
import { AuditLog } from '../../lib/audit';
import { sandboxService } from '../../lib/sandboxService';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../types';
import { maskCPF } from '../../utils/masks';

interface AuditTabProps {
  profile: UserProfile;
  theme?: 'light' | 'dark';
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const AuditTab: React.FC<AuditTabProps> = ({
  profile,
  theme = 'dark',
  showToast
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filtros
  const [searchCpf, setSearchCpf] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days'>('all');

  const isSandbox = profile.organizationId === 'sandbox-test';

  // Buscar logs (do Sandbox ou do Firestore)
  useEffect(() => {
    const fetchAuditLogs = async () => {
      setLoading(true);
      try {
        if (isSandbox) {
          const sandboxLogs = sandboxService.getAuditLogs();
          setLogs(sandboxLogs);
          setLoading(false);
          return;
        }

        // Firestore real
        const q = query(
          collection(db, 'audit_logs'),
          where('organizationId', '==', profile.organizationId),
          orderBy('timestamp', 'desc'),
          limit(100)
        );

        const snap = await getDocs(q);
        const fetchedLogs: AuditLog[] = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as AuditLog));

        setLogs(fetchedLogs);
      } catch (err) {
        console.error('Erro ao buscar logs de auditoria:', err);
        showToast('Erro ao carregar os registros de auditoria.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();

    if (isSandbox) {
      const unsub = sandboxService.subscribe(() => {
        setLogs(sandboxService.getAuditLogs());
      });
      return () => unsub();
    }
  }, [profile.organizationId, isSandbox, showToast]);

  // Obter lista única de colaboradores para o filtro
  const uniqueUsers = useMemo(() => {
    const userMap = new Map<string, string>();
    logs.forEach(l => {
      if (l.userId && l.userName) {
        userMap.set(l.userId, l.userName);
      }
    });
    return Array.from(userMap.entries()).map(([id, name]) => ({ id, name }));
  }, [logs]);

  // Logs filtrados
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      // Filtro por CPF ou Nome do Cliente
      if (searchCpf.trim()) {
        const cleanSearch = searchCpf.replace(/\D/g, '').toLowerCase();
        const detailsCpf = (l.details?.cpf || '').toString().replace(/\D/g, '');
        const detailsName = (l.details?.clientName || '').toString().toLowerCase();
        const userName = (l.userName || '').toLowerCase();

        const matchCpf = cleanSearch && detailsCpf.includes(cleanSearch);
        const matchName = detailsName.includes(searchCpf.toLowerCase()) || userName.includes(searchCpf.toLowerCase());

        if (!matchCpf && !matchName) return false;
      }

      // Filtro por Ação
      if (selectedAction !== 'all' && l.action !== selectedAction) {
        return false;
      }

      // Filtro por Colaborador
      if (selectedUser !== 'all' && l.userId !== selectedUser) {
        return false;
      }

      // Filtro por Data
      if (dateFilter !== 'all') {
        const logDate = new Date(l.timestamp);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
          if (logDate < today) return false;
        } else if (dateFilter === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          const dayAfterYesterday = new Date(today);
          if (logDate < yesterday || logDate >= dayAfterYesterday) return false;
        } else if (dateFilter === '7days') {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 7);
          if (logDate < sevenDaysAgo) return false;
        }
      }

      return true;
    });
  }, [logs, searchCpf, selectedAction, selectedUser, dateFilter]);

  // Rótulos e Badges de Ação
  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'COPY_CPF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Copy size={13} weight="bold" />
            Copiou CPF
          </span>
        );
      case 'REVEAL_CPF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <Eye size={13} weight="bold" />
            Revelou CPF
          </span>
        );
      case 'CREATE_AGREEMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <FileText size={13} weight="bold" />
            Acordo Criado
          </span>
        );
      case 'UPDATE_AGREEMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Pencil size={13} weight="bold" />
            Acordo Editado
          </span>
        );
      case 'EFETIVAR_PAGAMENTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle size={13} weight="bold" />
            Pagamento Efetivado
          </span>
        );
      case 'CHECK_AGREEMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Search size={13} weight="bold" />
            Conferido no Turno
          </span>
        );
      case 'DELETE_AGREEMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <Trash size={13} weight="bold" />
            Acordo Excluído
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/15 text-slate-300 border border-slate-500/30">
            <ShieldCheck size={13} weight="bold" />
            {action}
          </span>
        );
    }
  };

  // Exportar para CSV
  const exportToCSV = () => {
    if (filteredLogs.length === 0) {
      showToast('Nenhum registro para exportar.', 'error');
      return;
    }

    const headers = ['Data/Hora', 'Colaborador', 'Acao', 'CPF', 'Cliente', 'Detalhes'];
    const rows = filteredLogs.map(l => [
      new Date(l.timestamp).toLocaleString('pt-BR'),
      l.userName || l.userEmail || 'Sistema',
      l.action,
      l.details?.cpf || '',
      l.details?.clientName || '',
      JSON.stringify(l.details || {})
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trilha_auditoria_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Relatório de auditoria baixado com sucesso!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Banner do Módulo */}
      <div className={`p-6 rounded-2xl border relative overflow-hidden backdrop-blur-md ${
        theme === 'dark' ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <ShieldCheck size={28} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">Trilha de Auditoria & Conformidade</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Acesso Gestão
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Registro histórico completo de ações de colaboradores sobre CPFs de clientes, cópias, alterações e operações.
              </p>
            </div>
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
          >
            <DownloadSimple size={16} weight="bold" />
            Exportar Auditoria (CSV)
          </button>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className={`p-5 rounded-2xl border ${
        theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Busca por CPF ou Cliente */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
              <Search size={11} /> Busca por CPF ou Cliente
            </label>
            <input
              type="text"
              value={searchCpf}
              onChange={(e) => setSearchCpf(e.target.value)}
              placeholder="Digite o CPF ou nome..."
              className="w-full bg-white/5 border border-white/10 px-3.5 py-2.5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
            />
          </div>

          {/* Filtro por Tipo de Ação */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
              <Funnel size={11} /> Tipo de Ação
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 transition-all"
            >
              <option value="all">Todas as Ações</option>
              <option value="COPY_CPF">📋 Cópia de CPF</option>
              <option value="REVEAL_CPF">👁️ Revelar CPF</option>
              <option value="CREATE_AGREEMENT">🤝 Acordo Criado</option>
              <option value="UPDATE_AGREEMENT">✏️ Acordo Editado</option>
              <option value="EFETIVAR_PAGAMENTO">🟢 Pagamento Efetivado</option>
              <option value="CHECK_AGREEMENT">🔵 Conferido no Turno</option>
              <option value="DELETE_AGREEMENT">🗑️ Acordo Excluído</option>
            </select>
          </div>

          {/* Filtro por Colaborador */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
              <User size={11} /> Colaborador
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 transition-all"
            >
              <option value="all">Todos os Colaboradores</option>
              {uniqueUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Período */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
              <Clock size={11} /> Período
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full bg-slate-900 border border-white/10 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 transition-all"
            >
              <option value="all">Todo o Histórico</option>
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="7days">Últimos 7 dias</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Logs de Auditoria */}
      <div className={`rounded-2xl border overflow-hidden backdrop-blur-md ${
        theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Exibindo {filteredLogs.length} evento(s) de auditoria
          </span>
          {isSandbox && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Modo Sandbox (Simulação Ativa)
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm font-medium">
            Carregando trilha de auditoria...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm italic">
            Nenhum evento de auditoria encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredLogs.map(log => {
              const date = new Date(log.timestamp);
              const formattedDate = date.toLocaleDateString('pt-BR');
              const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              const clientCpf = log.details?.cpf ? maskCPF(log.details.cpf) : null;
              const rawCpf = log.details?.cpf || '';

              return (
                <motion.div 
                  key={log.id || `${log.timestamp}-${log.userId}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-5 hover:bg-white/5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 shrink-0">
                      {getActionBadge(log.action)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-white">
                          {log.userName || log.userEmail || 'Sistema'}
                        </span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs font-mono text-slate-400">
                          {formattedDate} às {formattedTime}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                        {log.details?.clientName && (
                          <span className="font-semibold text-slate-200">
                            Cliente: <strong className="text-white">{log.details.clientName}</strong>
                          </span>
                        )}

                        {clientCpf && (
                          <button
                            type="button"
                            onClick={() => setSearchCpf(rawCpf)}
                            className="font-mono text-sky-400 hover:underline cursor-pointer bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20"
                            title="Clique para filtrar todo o histórico deste CPF"
                          >
                            CPF: {clientCpf}
                          </button>
                        )}
                      </div>

                      {/* Detalhes extras */}
                      {log.details?.value && (
                        <p className="text-[11px] text-emerald-400 font-bold">
                          Valor: R$ {Number(log.details.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
                      ID: {log.id?.substr(0, 16) || 'log-auto'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

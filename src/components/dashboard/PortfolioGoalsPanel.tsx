import React, { useState, useMemo } from 'react';
import { 
  Target, 
  Calculator, 
  Calendar, 
  FileCsv as FileSpreadsheet, 
  Printer, 
  TrendUp, 
  User, 
  Note, 
  PencilSimple, 
  Check, 
  X, 
  FileArrowUp 
} from '@phosphor-icons/react';
import ExcelJS from 'exceljs';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Agreement, AgreementStatus } from '../../types';
import { formatCurrency } from '../../utils/masks';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sandboxService } from '../../lib/sandboxService';

interface PortfolioGoalsPanelProps {
  profile: UserProfile;
  monthAgreements: Agreement[];
  currentTeamMembers: UserProfile[];
  selectedMonth: number;
  selectedYear: number;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const PortfolioGoalsPanel = ({
  profile,
  monthAgreements,
  currentTeamMembers,
  selectedMonth,
  selectedYear,
  showToast
}: PortfolioGoalsPanelProps) => {
  // Configurações de dias úteis e trabalhados
  const [workingDays, setWorkingDays] = useState(23);
  const [workedDays, setWorkedDays] = useState(8);

  // Estados de edição inline
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [tempPortfolio, setTempPortfolio] = useState('');
  const [tempGoal, setTempGoal] = useState('');
  const [tempObservation, setTempObservation] = useState('');

  // Filtramos apenas membros que são operadores (role === 'member')
  const operators = useMemo(() => {
    return currentTeamMembers.filter(m => m.role === 'member');
  }, [currentTeamMembers]);

  // Lógica de cálculo por operador
  const operatorStats = useMemo(() => {
    const remainingDays = Math.max(0, workingDays - workedDays);

    return operators.map(op => {
      // Valor Pago acumulado no mês
      const opAgreements = monthAgreements.filter(a => a.operatorId === op.uid && !a.isAdjustment);
      const partial = opAgreements
        .filter(a => a.status === AgreementStatus.PAID)
        .reduce((sum, a) => sum + a.value, 0);

      const totalCount = opAgreements.length;
      const paidCount = opAgreements.filter(a => a.status === AgreementStatus.PAID).length;
      const effectiveness = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

      const goal = op.monthlyGoal || 0;
      const dailyGoal = workingDays > 0 ? goal / workingDays : 0;

      // Cálculo de dispersão (desvio linear proporcional até o momento)
      // Ritmo linear esperado: (workedDays / workingDays) * goal
      const expectedToDate = workingDays > 0 ? (workedDays / workingDays) * goal : 0;
      let dispersion = 0;
      if (expectedToDate > 0) {
        dispersion = ((partial - expectedToDate) / expectedToDate) * 100;
      }

      // Projeção: (partial / workedDays) * workingDays
      const projection = workedDays > 0 ? (partial / workedDays) * workingDays : 0;

      return {
        ...op,
        goal,
        dailyGoal,
        partial,
        dispersion,
        projection,
        effectiveness,
        observation: op.observation || ''
      };
    });
  }, [operators, monthAgreements, workingDays, workedDays]);

  const portfoliosData = useMemo(() => {
    const groups: Record<string, any[]> = {};
    operatorStats.forEach(stat => {
      const key = stat.portfolio || 'Sem Carteira';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(stat);
    });
    return groups;
  }, [operatorStats]);

  // Totais Gerais Consolidados (Visão do Gestor)
  const totals = useMemo(() => {
    let totalGoal = 0;
    let totalPartial = 0;
    let totalProjection = 0;

    operatorStats.forEach(op => {
      totalGoal += op.goal;
      totalPartial += op.partial;
      totalProjection += op.projection;
    });

    const totalRemaining = Math.max(0, totalGoal - totalPartial);
    const progressPercent = totalGoal > 0 ? (totalPartial / totalGoal) * 100 : 0;

    return {
      totalGoal,
      totalPartial,
      totalRemaining,
      progressPercent,
      totalProjection
    };
  }, [operatorStats]);

  const handleEditClick = (op: typeof operatorStats[0]) => {
    setEditingUid(op.uid);
    setTempPortfolio(op.portfolio || 'Noverde Receptivo');
    setTempGoal(op.goal.toString());
    setTempObservation(op.observation || '');
  };

  const handleSave = async (uid: string) => {
    const goalVal = parseFloat(tempGoal) || 0;
    
    // Atualizar no Sandbox ou Firestore
    if (profile.organizationId === 'sandbox-test') {
      const sandboxUser = sandboxService.getUser(uid);
      if (sandboxUser) {
        sandboxService.setProfile({
          ...sandboxUser,
          portfolio: tempPortfolio,
          monthlyGoal: goalVal,
          observation: tempObservation
        });
        showToast('Meta e Carteira do Sandbox atualizadas!', 'success');
      }
    } else {
      try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
          portfolio: tempPortfolio,
          monthlyGoal: goalVal,
          observation: tempObservation
        });
        showToast('Colaborador atualizado com sucesso!', 'success');
      } catch (e) {
        console.error(e);
        showToast('Erro ao atualizar dados do operador.', 'error');
      }
    }
    setEditingUid(null);
  };

  // Exportar Excel Formatado com paleta do Tracker (Sky Blue & Slate)
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Metas & Carteiras');

      // Título
      worksheet.mergeCells('A1:J1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'TRACKER - COCKPIT DE METAS & CARTEIRAS';
      titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' } // Slate-900
      };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 40;

      // Informações da Gestão (Topo)
      worksheet.getCell('A3').value = 'Gestor:';
      worksheet.getCell('A3').font = { bold: true };
      worksheet.getCell('B3').value = profile.displayName;

      worksheet.getCell('D3').value = 'Dias Úteis:';
      worksheet.getCell('D3').font = { bold: true };
      worksheet.getCell('E3').value = workingDays;

      worksheet.getCell('G3').value = 'Dias Trabalhados:';
      worksheet.getCell('G3').font = { bold: true };
      worksheet.getCell('H3').value = workedDays;

      worksheet.getCell('J3').value = `Faltam: ${Math.max(0, workingDays - workedDays)} dias`;
      worksheet.getCell('J3').font = { italic: true };

      // Linha de Resumo Geral
      worksheet.getRow(5).values = [
        'META RECUPERAÇÃO MÊS',
        'ENTREGUE ACUMULADO',
        'FALTAM',
        '% SOBRE A META',
        'PROJEÇÃO CONSOLIDADA',
        '', '', '', '', ''
      ];
      worksheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(5).eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E293B' } // Slate-800
        };
        cell.alignment = { horizontal: 'center' };
      });

      worksheet.getRow(6).values = [
        totals.totalGoal,
        totals.totalPartial,
        totals.totalRemaining,
        `${totals.progressPercent.toFixed(1)}%`,
        totals.totalProjection,
        '', '', '', '', ''
      ];
      worksheet.getRow(6).font = { bold: true, size: 12 };
      worksheet.getRow(6).eachCell((cell, colNum) => {
        if ([1,2,3,5].includes(colNum)) {
          cell.numFmt = '"R$"#,##0.00';
        }
        cell.alignment = { horizontal: 'center' };
      });
      worksheet.getRow(6).height = 25;

      let currentRow = 8;

      // Iterar e renderizar cada carteira
      (Object.entries(portfoliosData) as [string, any[]][]).forEach(([portfolioName, ops]) => {
        // Cabeçalho da Carteira
        worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
        const groupHeader = worksheet.getCell(`A${currentRow}`);
        groupHeader.value = portfolioName.toUpperCase();
        groupHeader.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        groupHeader.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0284C7' } // Sky-600
        };
        groupHeader.alignment = { horizontal: 'left', indent: 1 };
        worksheet.getRow(currentRow).height = 24;
        currentRow++;

        // Cabeçalho de Colunas da Tabela
        const cols = [
          'Carteira', 'Nome Analista', 'Meta Recuperação', 'Meta por dia', 
          'Parcial Recebido', 'Dispersão', '% Sobre a Meta', 'Projeção', 'Efetividade', 'Observação'
        ];
        worksheet.getRow(currentRow).values = cols;
        worksheet.getRow(currentRow).font = { bold: true, size: 9, color: { argb: 'FF94A3B8' } };
        worksheet.getRow(currentRow).eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0F172A' }
          };
          cell.alignment = { horizontal: 'center' };
        });
        currentRow++;

        // Linhas de dados dos Analistas
        ops.forEach(op => {
          worksheet.getRow(currentRow).values = [
            op.portfolio || 'Sem Carteira',
            op.displayName,
            op.goal,
            op.dailyGoal,
            op.partial,
            `${op.dispersion > 0 ? '+' : ''}${op.dispersion.toFixed(0)}%`,
            `${(op.goal > 0 ? (op.partial / op.goal) * 100 : 0).toFixed(0)}%`,
            op.projection,
            `${op.effectiveness.toFixed(0)}%`,
            op.observation
          ];
          
          // Formatação numérica
          worksheet.getCell(`C${currentRow}`).numFmt = '"R$"#,##0.00';
          worksheet.getCell(`D${currentRow}`).numFmt = '"R$"#,##0.00';
          worksheet.getCell(`E${currentRow}`).numFmt = '"R$"#,##0.00';
          worksheet.getCell(`H${currentRow}`).numFmt = '"R$"#,##0.00';

          // Alinhamento
          worksheet.getRow(currentRow).eachCell((cell, colNum) => {
            cell.font = { size: 10 };
            if ([3,4,5,8].includes(colNum)) {
              cell.alignment = { horizontal: 'right' };
            } else if ([6,7,9].includes(colNum)) {
              cell.alignment = { horizontal: 'center' };
            } else {
              cell.alignment = { horizontal: 'left' };
            }
          });

          currentRow++;
        });

        currentRow += 1; // Espaço entre carteiras
      });

      // Larguras das colunas
      worksheet.columns.forEach((col) => {
        col.width = 18;
      });
      worksheet.getColumn(2).width = 25; // Nome maior
      worksheet.getColumn(10).width = 30; // Observações maiores

      // Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `tracker-cockpit-metas-${selectedMonth}-${selectedYear}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      showToast('Relatório Excel exportado com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao exportar planilha.', 'error');
    }
  };

  return (
    <div className="space-y-8 print:p-0 no-print-sections">
      {/* HEADER DA ABA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target size={24} className="text-sky-400" />
            Cockpit de Metas & Carteiras
          </h2>
          <p className="text-xs text-slate-500 mt-1">Consolidado de metas, desvios proporcionais (dispersão) e projeções por carteira.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-xl transition-all flex items-center gap-2 text-xs active:scale-95 shadow-lg"
          >
            <FileSpreadsheet size={16} className="text-emerald-400" />
            Exportar Excel
          </button>
          <button 
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl transition-all flex items-center gap-2 text-xs active:scale-95 shadow-lg shadow-sky-500/20"
          >
            <Printer size={16} />
            Imprimir Relatório
          </button>
        </div>
      </div>

      {/* CONTROLE DE DIAS ÚTEIS E GESTOR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gestor e Meta Global */}
        <div className="md:col-span-2 glass-card p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-3 bg-sky-500 rounded-full"></div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
              Resumo Geral da Liderança (Gestor)
            </h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Gestor Responsável</span>
              <span className="text-sm font-bold text-white block mt-1 truncate">{profile.displayName}</span>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Meta Consolidada</span>
              <span className="text-sm font-bold text-sky-400 block mt-1">{formatCurrency(totals.totalGoal)}</span>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Entregue (Acumulado)</span>
              <span className="text-sm font-bold text-emerald-400 block mt-1">{formatCurrency(totals.totalPartial)}</span>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Projeção Consolidada</span>
              <span className="text-sm font-bold text-amber-400 block mt-1">{formatCurrency(totals.totalProjection)}</span>
            </div>
          </div>

          {/* Barra de Progresso da Meta */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-slate-400 uppercase">Progresso da Meta Mensal</span>
              <span className="text-sky-400 font-black">{totals.progressPercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="bg-gradient-to-r from-sky-500 to-sky-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(totals.progressPercent, 100)}%` }}
              />
            </div>
            <p className="text-[9px] text-slate-500">Faltam recuperar <strong className="text-slate-400">{formatCurrency(totals.totalRemaining)}</strong> para atingir a meta consolidada.</p>
          </div>
        </div>

        {/* Inputs de Dias Úteis */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-3 bg-indigo-500 rounded-full"></div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
              Cronograma do Período (Dias)
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Dias Úteis</label>
              <input 
                type="number" 
                value={workingDays} 
                onChange={(e) => setWorkingDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-900 border border-white/5 px-3 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Dias Trabalhados</label>
              <input 
                type="number" 
                value={workedDays} 
                onChange={(e) => setWorkedDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-900 border border-white/5 px-3 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
          <div className="pt-2 text-[9px] text-slate-500 flex justify-between font-bold border-t border-white/5">
            <span>DIAS RESTANTES:</span>
            <span className="text-indigo-400 font-black">{Math.max(0, workingDays - workedDays)} DIAS</span>
          </div>
        </div>
      </div>

      {/* DETALHAMENTO DE CARTEIRAS */}
      <div className="space-y-8">
        {(Object.entries(portfoliosData) as [string, any[]][]).map(([portfolioName, ops]) => (
          <div key={portfolioName} className="glass-card rounded-3xl border border-white/5 overflow-hidden">
            {/* Header da Carteira */}
            <div className="px-6 py-4 bg-sky-500/10 border-b border-sky-500/20 flex justify-between items-center">
              <h4 className="text-xs font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                📁 Carteira: {portfolioName}
              </h4>
              <span className="text-[9px] bg-sky-500/20 px-2 py-0.5 rounded-md text-sky-400 font-black uppercase tracking-wider">
                {ops.length} {ops.length === 1 ? 'Analista' : 'Analistas'}
              </span>
            </div>

            {/* Tabela de Analistas */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-950/40 text-[9px] text-slate-500 uppercase font-black tracking-widest border-b border-white/5">
                    <th className="px-6 py-3">Carteira</th>
                    <th className="px-6 py-3">Analista</th>
                    <th className="px-6 py-3 text-right">Meta Recuperação</th>
                    <th className="px-6 py-3 text-right">Meta por Dia</th>
                    <th className="px-6 py-3 text-right">Parcial</th>
                    <th className="px-6 py-3 text-center">Dispersão</th>
                    <th className="px-6 py-3 text-center">% Meta</th>
                    <th className="px-6 py-3 text-right">Projeção</th>
                    <th className="px-6 py-3 text-center">Efetividade</th>
                    <th className="px-6 py-3">Observação</th>
                    <th className="px-6 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ops.map(op => {
                    const isEditing = editingUid === op.uid;
                    const progress = op.goal > 0 ? (op.partial / op.goal) * 100 : 0;
                    return (
                      <tr key={op.uid} className="hover:bg-white/[0.02] transition-colors leading-relaxed">
                        {/* Carteira */}
                        <td className="px-6 py-3.5 font-medium text-slate-400">
                          {isEditing ? (
                            <select 
                              value={tempPortfolio}
                              onChange={(e) => setTempPortfolio(e.target.value)}
                              className="bg-slate-900 border border-white/10 px-2 py-1 rounded text-xs text-white focus:outline-none focus:border-sky-500"
                            >
                              <option value="Noverde Receptivo">Noverde Receptivo</option>
                              <option value="Noverde Variável">Noverde Variável</option>
                              <option value="Noverde BNPL">Noverde BNPL</option>
                              <option value="Pula Parcela + Ticket Alto">Pula Parcela + Ticket Alto</option>
                              <option value="Noverde - FPD">Noverde - FPD</option>
                            </select>
                          ) : (
                            op.portfolio || 'Sem Carteira'
                          )}
                        </td>

                        {/* Nome Analista */}
                        <td className="px-6 py-3.5 font-bold text-white flex items-center gap-1.5">
                          <User size={12} className="text-slate-500" />
                          {op.displayName}
                        </td>

                        {/* Meta Recuperação */}
                        <td className="px-6 py-3.5 text-right font-semibold">
                          {isEditing ? (
                            <input 
                              type="number"
                              value={tempGoal}
                              onChange={(e) => setTempGoal(e.target.value)}
                              className="bg-slate-900 border border-white/10 px-2 py-1 rounded text-xs text-white text-right w-24 focus:outline-none focus:border-sky-500"
                            />
                          ) : (
                            formatCurrency(op.goal)
                          )}
                        </td>

                        {/* Meta por dia */}
                        <td className="px-6 py-3.5 text-right font-medium text-slate-400">
                          {formatCurrency(op.dailyGoal)}
                        </td>

                        {/* Parcial */}
                        <td className="px-6 py-3.5 text-right font-bold text-emerald-400">
                          {formatCurrency(op.partial)}
                        </td>

                        {/* Dispersão */}
                        <td className="px-6 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            op.dispersion >= 0 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                          }`}>
                            {op.dispersion > 0 ? '+' : ''}{op.dispersion.toFixed(0)}%
                          </span>
                        </td>

                        {/* % Sobre a Meta */}
                        <td className="px-6 py-3.5 text-center font-bold text-white">
                          {progress.toFixed(0)}%
                        </td>

                        {/* Projeção */}
                        <td className="px-6 py-3.5 text-right font-bold text-amber-400">
                          {formatCurrency(op.projection)}
                        </td>

                        {/* Efetividade */}
                        <td className="px-6 py-3.5 text-center font-bold text-slate-300">
                          {op.effectiveness.toFixed(0)}%
                        </td>

                        {/* Observação */}
                        <td className="px-6 py-3.5 text-slate-400 max-w-[200px] truncate">
                          {isEditing ? (
                            <input 
                              type="text"
                              value={tempObservation}
                              onChange={(e) => setTempObservation(e.target.value)}
                              placeholder="Observações (ex: Callix)"
                              className="bg-slate-900 border border-white/10 px-2 py-1 rounded text-xs text-white w-full focus:outline-none focus:border-sky-500"
                            />
                          ) : (
                            op.observation || <span className="text-slate-600 italic">Sem notas</span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-6 py-3.5 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={() => handleSave(op.uid)}
                                className="p-1 bg-emerald-500 hover:bg-emerald-400 text-white rounded-md transition-colors"
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                onClick={() => setEditingUid(null)}
                                className="p-1 bg-rose-500 hover:bg-rose-400 text-white rounded-md transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleEditClick(op)}
                              className="p-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-md transition-all active:scale-95"
                            >
                              <PencilSimple size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

import { describe, it, expect } from 'vitest';
import { calculateQaStats, calculateOpPerformance, getExpiredPdisCount } from '../lib/qaService';
import { Agreement, QaCompetence, QaEvaluation, Pdi, AgreementStatus, AgreementOrigin, AgreementType, AgreementCategory } from '../types';

describe('QA Service - calculateQaStats', () => {
  const mockCompetences: QaCompetence[] = [
    { id: 'c1', name: 'Comunicação', weight: 1, organizationId: 'org1', description: 'Desc1' },
    { id: 'c2', name: 'Sistemas', weight: 2, organizationId: 'org1', description: 'Desc2' },
  ];

  const mockEvaluations: QaEvaluation[] = [
    {
      id: 'e1',
      organizationId: 'org1',
      operatorId: 'op1',
      evaluatorId: 'sup1',
      score: 80,
      grades: { c1: 80, c2: 90 },
      feedback: 'Muito bom',
      createdAt: '2026-07-10T12:00:00Z',
      callId: 'call1',
      protocol: 'prot1',
      callLink: undefined
    },
    {
      id: 'e2',
      organizationId: 'org1',
      operatorId: 'op2',
      evaluatorId: 'sup1',
      score: 60,
      grades: { c1: 60, c2: 70 },
      feedback: 'Melhorar',
      createdAt: '2026-07-11T12:00:00Z',
      callId: 'call2',
      protocol: 'prot2',
      callLink: undefined
    }
  ];

  it('deve calcular estatísticas globais corretamente (selectedOperatorId = all)', () => {
    const stats = calculateQaStats(mockEvaluations, mockCompetences, 'all');

    expect(stats.totalEvals).toBe(2);
    expect(stats.avgScore).toBe(70); // (80 + 60) / 2
    expect(stats.worstCompetence).toBe('Comunicação'); // c1 média = 70, c2 média = 80
    expect(stats.gapsData).toHaveLength(2);
    expect(stats.gapsData[0].subject).toBe('Comunicação');
    expect(stats.gapsData[0].Operador).toBe(70); // (80 + 60) / 2
  });

  it('deve calcular estatísticas filtradas por operador (selectedOperatorId = op1)', () => {
    const stats = calculateQaStats(mockEvaluations, mockCompetences, 'op1');

    expect(stats.totalEvals).toBe(1);
    expect(stats.avgScore).toBe(80);
    expect(stats.worstCompetence).toBe('Comunicação'); // c1 = 80, c2 = 90
    expect(stats.gapsData[0].subject).toBe('Comunicação');
    expect(stats.gapsData[0].Operador).toBe(80);
    expect(stats.gapsData[0].Diferença).toBe(10); // op1 (80) - global avg (70)
  });
});

describe('QA Service - calculateOpPerformance', () => {
  const mockAgreements: Agreement[] = [
    {
      id: 'a1',
      organizationId: 'org1',
      operatorId: 'op1',
      value: 1000,
      status: AgreementStatus.PAID,
      createdAt: new Date().toISOString(),
      clientName: 'Cliente 1',
      clientCpf: '123',
      dueDate: '2026-07-15',
      origin: AgreementOrigin.CALLIX,
      type: AgreementType.QUITACAO,
      category: AgreementCategory.FIXA,
      teamId: 'team1'
    },
    {
      id: 'a2',
      organizationId: 'org1',
      operatorId: 'op1',
      value: 500,
      status: AgreementStatus.WAITING,
      createdAt: new Date().toISOString(),
      clientName: 'Cliente 2',
      clientCpf: '456',
      dueDate: '2026-07-15',
      origin: AgreementOrigin.CALLIX,
      type: AgreementType.QUITACAO,
      category: AgreementCategory.FIXA,
      teamId: 'team1'
    },
    {
      id: 'a3',
      organizationId: 'org1',
      operatorId: 'op2',
      value: 2000,
      status: AgreementStatus.PAID,
      createdAt: new Date().toISOString(),
      clientName: 'Cliente 3',
      clientCpf: '789',
      dueDate: '2026-07-15',
      origin: AgreementOrigin.CALLIX,
      type: AgreementType.QUITACAO,
      category: AgreementCategory.FIXA,
      teamId: 'team1'
    }
  ];

  it('deve retornar null se o operador selecionado for all', () => {
    const res = calculateOpPerformance(mockAgreements, 'all', {});
    expect(res).toBeNull();
  });

  it('deve calcular o faturamento do operador selecionado', () => {
    const res = calculateOpPerformance(mockAgreements, 'op1', { op1: 'present' });
    expect(res).not.toBeNull();
    expect(res?.monthVal).toBe(1500); // 1000 + 500
    expect(res?.weekVal).toBe(1500);
    expect(res?.todayStatus).toBe('present');
  });
});

describe('QA Service - getExpiredPdisCount', () => {
  const mockPdis: Pdi[] = [
    {
      id: 'p1',
      organizationId: 'org1',
      operatorId: 'op1',
      evaluatorId: 'sup1',
      competenceId: 'c1',
      competenceName: 'Comunicação',
      actionPlan: 'Plan1',
      dueDate: '2026-07-01',
      status: 'expired',
      createdAt: '2026-06-15T00:00:00Z'
    },
    {
      id: 'p2',
      organizationId: 'org1',
      operatorId: 'op1',
      evaluatorId: 'sup1',
      competenceId: 'c1',
      competenceName: 'Comunicação',
      actionPlan: 'Plan2',
      dueDate: '2026-08-01',
      status: 'pending',
      createdAt: '2026-06-15T00:00:00Z'
    }
  ];

  it('deve contar PDIs expirados', () => {
    expect(getExpiredPdisCount(mockPdis)).toBe(1);
  });
});

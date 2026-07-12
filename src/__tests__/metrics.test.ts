import { describe, it, expect } from 'vitest';
import { Agreement, AgreementStatus, AgreementOrigin, AgreementType, AgreementCategory } from '../types';
import {
  calculateProjectedMrr,
  calculateBreakRatesByDilatedDays,
  calculateBreakRateByCategory,
  calculatePrimeTimeDistribution,
  calculateHeatmap31Days,
  calculateDashboardStats,
  filterRealAgreements
} from '../lib/metrics';

// Criando mock agreements
const mockToday = new Date(2026, 6, 12, 12, 0, 0); // 12 de Julho de 2026
const todayStr = '2026-07-12';

const createMockAgreement = (overrides: Partial<Agreement> = {}): Agreement => {
  return {
    id: '1',
    clientName: 'Cliente Teste',
    clientCpf: '12345678901',
    value: 1000,
    dueDate: todayStr,
    status: AgreementStatus.WAITING,
    origin: AgreementOrigin.CALLIX,
    type: AgreementType.PARCELAMENTO,
    category: AgreementCategory.FIXA,
    operatorId: 'operator-1',
    teamId: 'team-1',
    organizationId: 'org-1',
    createdAt: new Date(2026, 6, 10, 10, 0, 0).toISOString(), // Criado em 10/07/2026
    ...overrides
  };
};

describe('Métricas & BI (lib/metrics)', () => {
  it('deve filtrar acordos reais excluindo os de ajuste', () => {
    const list = [
      createMockAgreement({ id: '1', isAdjustment: false }),
      createMockAgreement({ id: '2', isAdjustment: true }),
    ];
    const filtered = filterRealAgreements(list);
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('1');
  });

  it('deve calcular o colchão MRR projetado', () => {
    const list = [
      // Acordo parcelamento futuro (vence 15/07) - Deve contar
      createMockAgreement({
        id: '1',
        value: 1500,
        type: AgreementType.PARCELAMENTO,
        status: AgreementStatus.WAITING,
        dueDate: '2026-07-15'
      }),
      // Acordo parcelamento vencido (venceu 10/07) - Não deve contar
      createMockAgreement({
        id: '2',
        value: 2000,
        type: AgreementType.PARCELAMENTO,
        status: AgreementStatus.WAITING,
        dueDate: '2026-07-10'
      }),
      // Acordo à vista (tipo boleto/geração normal) - Não deve contar
      createMockAgreement({
        id: '3',
        value: 3000,
        type: AgreementType.QUITACAO,
        status: AgreementStatus.WAITING,
        dueDate: '2026-07-15'
      }),
      // Acordo de ajuste (não real) - Não deve contar
      createMockAgreement({
        id: '4',
        value: 4000,
        type: AgreementType.PARCELAMENTO,
        status: AgreementStatus.WAITING,
        dueDate: '2026-07-15',
        isAdjustment: true
      }),
    ];

    const mrr = calculateProjectedMrr(list, new Date(2026, 6, 12));
    expect(mrr).toBe(1500);
  });

  it('deve calcular taxa de quebra de dilação por faixa de dias', () => {
    const list = [
      // Dilação: 2 dias (10/07 a 12/07). Status WAITING. Não quebrado.
      createMockAgreement({
        id: '1',
        createdAt: new Date(2026, 6, 10).toISOString(),
        dueDate: '2026-07-12',
        status: AgreementStatus.WAITING
      }),
      // Dilação: 2 dias (10/07 a 12/07). Status BROKEN. Quebrado.
      createMockAgreement({
        id: '2',
        createdAt: new Date(2026, 6, 10).toISOString(),
        dueDate: '2026-07-12',
        status: AgreementStatus.BROKEN
      }),
    ];

    const rates = calculateBreakRatesByDilatedDays(list);
    // Para '1-3 dias', temos 1 quebrado de 2 totais -> 50%
    expect(rates['1-3 dias']).toBe(50);
  });

  it('deve calcular taxa de quebra por categoria (fixa/variavel)', () => {
    const list = [
      createMockAgreement({ category: AgreementCategory.FIXA, status: AgreementStatus.BROKEN }),
      createMockAgreement({ category: AgreementCategory.FIXA, status: AgreementStatus.PAID }),
      createMockAgreement({ category: AgreementCategory.VARIAVEL, status: AgreementStatus.BROKEN }),
    ];

    const rates = calculateBreakRateByCategory(list);
    // Fixa: 1 de 2 quebrado -> 50%
    // Variavel: 1 de 1 quebrado -> 100%
    expect(rates.fixa).toBe(50);
    expect(rates.variavel).toBe(100);
  });

  it('deve calcular a distribuição de liquidez horário nobre', () => {
    const list = [
      createMockAgreement({
        status: AgreementStatus.PAID,
        value: 1200,
        createdAt: new Date(2026, 6, 12, 10, 30, 0).toISOString() // 10h
      }),
      createMockAgreement({
        status: AgreementStatus.PAID,
        value: 800,
        createdAt: new Date(2026, 6, 12, 10, 45, 0).toISOString() // 10h
      }),
      createMockAgreement({
        status: AgreementStatus.WAITING,
        value: 5000,
        createdAt: new Date(2026, 6, 12, 11, 0, 0).toISOString()
      })
    ];

    const dist = calculatePrimeTimeDistribution(list);
    expect(dist[10]).toBe(2000);
    expect(dist[11]).toBeUndefined();
  });

  it('deve consolidar o cálculo do dashboard completo', () => {
    const list = [
      createMockAgreement({ value: 1000, status: AgreementStatus.PAID }),
      createMockAgreement({ value: 2000, status: AgreementStatus.WAITING }),
    ];

    const stats = calculateDashboardStats(list, list, 5000, 6, 2026, mockToday);
    expect(stats.totalProjected).toBe(3000);
    expect(stats.totalPaid).toBe(1000);
    expect(stats.remainingToGoal).toBe(4000);
  });
});

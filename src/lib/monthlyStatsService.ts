/**
 * monthlyStatsService.ts — Camada de Materialização e Cache Inteligente de Estatísticas
 * 
 * Evita o processamento cliente de 100.000+ documentos, servindo
 * estatísticas pré-agregadas com cache local em camadas e TTL.
 */

import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import { Agreement, AgreementStatus, MonthlyAggregatedStats } from '../types';
import { firestoreMetrics } from './firestoreMetrics';

const STATS_COLLECTION = 'monthly_stats';
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos de frescor garantido

interface CachedStatsEntry {
  stats: MonthlyAggregatedStats;
  cachedAt: number;
  expiresAt: number;
}

// Cache em memória
const memoryStatsCache = new Map<string, CachedStatsEntry>();

function getCacheKey(orgId: string, year: number, month: number): string {
  return `${orgId}_${year}_${month}`;
}

/**
 * Computa a visão materializada completa a partir de uma lista de acordos.
 */
export function computeMonthlyAggregatedStats(
  agreements: Agreement[],
  orgId: string,
  year: number,
  month: number
): MonthlyAggregatedStats {
  const real = agreements.filter(a => !a.isAdjustment);
  
  let totalProjected = 0;
  let totalPaid = 0;
  let totalBroken = 0;
  let paidCount = 0;
  let brokenCount = 0;
  let waitingCount = 0;
  let projectedMrr = 0;

  const byTeam: Record<string, { totalProjected: number; totalPaid: number; count: number; paidCount: number }> = {};
  const byOrigin: Record<string, { totalValue: number; paidValue: number; count: number; paidCount: number }> = {};

  const today = new Date();

  real.forEach(a => {
    const val = a.value || 0;
    totalProjected += val;

    const st = (a.status || '').toString().toLowerCase();
    const isPaid = st === 'pago' || st === 'paid' || st === 'quitado';
    const isBroken = st === 'quebrado' || st === 'broken' || st === 'cancelado';
    const isWaiting = st === 'waiting' || st === 'pendente' || (!isPaid && !isBroken);

    if (isPaid) {
      totalPaid += val;
      paidCount++;
    } else if (isBroken) {
      totalBroken += val;
      brokenCount++;
    } else if (isWaiting) {
      waitingCount++;
      if (a.type === 'parcelamento' && new Date(a.dueDate) >= today) {
        projectedMrr += val;
      }
    }

    // Agrupamento por Equipe
    const teamKey = a.teamId || 'no_team';
    if (!byTeam[teamKey]) {
      byTeam[teamKey] = { totalProjected: 0, totalPaid: 0, count: 0, paidCount: 0 };
    }
    byTeam[teamKey].totalProjected += val;
    byTeam[teamKey].count++;
    if (isPaid) {
      byTeam[teamKey].totalPaid += val;
      byTeam[teamKey].paidCount++;
    }

    // Agrupamento por Canal de Origem
    const origKey = a.origin || 'outros';
    if (!byOrigin[origKey]) {
      byOrigin[origKey] = { totalValue: 0, paidValue: 0, count: 0, paidCount: 0 };
    }
    byOrigin[origKey].totalValue += val;
    byOrigin[origKey].count++;
    if (isPaid) {
      byOrigin[origKey].paidValue += val;
      byOrigin[origKey].paidCount++;
    }
  });

  const totalAgreements = real.length;
  const effectivenessRate = totalProjected > 0 ? Math.round((totalPaid / totalProjected) * 100) : 0;
  const ticketAverage = totalAgreements > 0 ? Math.round(totalProjected / totalAgreements) : 0;

  return {
    id: getCacheKey(orgId, year, month),
    organizationId: orgId,
    year,
    month,
    totalProjected,
    totalPaid,
    totalBroken,
    totalAgreements,
    paidCount,
    brokenCount,
    waitingCount,
    ticketAverage,
    effectivenessRate,
    projectedMrr,
    byTeam,
    byOrigin,
    lastUpdated: new Date().toISOString(),
    version: 1
  };
}

/**
 * Consulta estatísticas com estratégia Stale-While-Revalidate e cache com TTL.
 */
export async function getFreshMonthlyStats(
  orgId: string,
  year: number,
  month: number,
  fallbackAgreements?: Agreement[]
): Promise<MonthlyAggregatedStats> {
  const cacheKey = getCacheKey(orgId, year, month);
  const now = Date.now();

  // 1. Verificação de Cache em Memória
  const memEntry = memoryStatsCache.get(cacheKey);
  if (memEntry && now < memEntry.expiresAt) {
    firestoreMetrics.recordRead('dashboard', 1, true, 2);
    return memEntry.stats;
  }

  // 2. Verificação de Cache no LocalStorage
  try {
    const rawStorage = localStorage.getItem(`tracker_stats_cache_${cacheKey}`);
    if (rawStorage) {
      const parsed: CachedStatsEntry = JSON.parse(rawStorage);
      if (now < parsed.expiresAt) {
        memoryStatsCache.set(cacheKey, parsed);
        firestoreMetrics.recordRead('dashboard', 1, true, 5);
        return parsed.stats;
      }
    }
  } catch {
    // Ignora erro de parsing
  }

  // 3. Consulta ao Firestore (ou Fallback Sandbox)
  const startTime = Date.now();
  try {
    if (db) {
      const statsRef = doc(db, STATS_COLLECTION, cacheKey);
      const snapshot = await getDoc(statsRef);
      const durationMs = Date.now() - startTime;

      if (snapshot.exists()) {
        const data = snapshot.data() as MonthlyAggregatedStats;
        firestoreMetrics.recordRead('dashboard', 1, false, durationMs);
        setCache(cacheKey, data);
        return data;
      }
    }
  } catch (err) {
    console.warn('Falha na consulta ao Firestore monthly_stats, usando fallback:', err);
  }

  // 4. Se não existe no Firestore, calcula a partir dos dados locais e salva a visão materializada
  const computed = computeMonthlyAggregatedStats(fallbackAgreements || [], orgId, year, month);
  setCache(cacheKey, computed);

  // Persiste no Firestore em background para próximas consultas
  if (db && fallbackAgreements && fallbackAgreements.length > 0) {
    try {
      const statsRef = doc(db, STATS_COLLECTION, cacheKey);
      await setDoc(statsRef, computed, { merge: true });
      firestoreMetrics.recordWrite('dashboard', 1);
    } catch {
      // Ignora falha de write em sandbox
    }
  }

  return computed;
}

/**
 * Salva no cache em memória e no localStorage.
 */
function setCache(cacheKey: string, stats: MonthlyAggregatedStats): void {
  const now = Date.now();
  const entry: CachedStatsEntry = {
    stats,
    cachedAt: now,
    expiresAt: now + CACHE_TTL_MS
  };
  memoryStatsCache.set(cacheKey, entry);
  try {
    localStorage.setItem(`tracker_stats_cache_${cacheKey}`, JSON.stringify(entry));
  } catch {
    // LocalStorage cheio ou bloqueado
  }
}

/**
 * Invalida o cache local para forçar releitura limpa.
 */
export function invalidateMonthlyStatsCache(orgId: string, year: number, month: number): void {
  const cacheKey = getCacheKey(orgId, year, month);
  memoryStatsCache.delete(cacheKey);
  try {
    localStorage.removeItem(`tracker_stats_cache_${cacheKey}`);
  } catch {
    // Ignora erro
  }
}

/**
 * Atualiza atomicamente os totais do mês ao registrar um novo acordo ou baixa.
 */
export async function updateMonthlyStatsDelta(
  orgId: string,
  year: number,
  month: number,
  delta: {
    projectedDelta?: number;
    paidDelta?: number;
    brokenDelta?: number;
    countDelta?: number;
    paidCountDelta?: number;
  }
): Promise<void> {
  const cacheKey = getCacheKey(orgId, year, month);
  invalidateMonthlyStatsCache(orgId, year, month);

  if (!db) return;

  try {
    const statsRef = doc(db, STATS_COLLECTION, cacheKey);
    const updates: Record<string, any> = {
      lastUpdated: new Date().toISOString()
    };

    if (delta.projectedDelta) updates.totalProjected = increment(delta.projectedDelta);
    if (delta.paidDelta) updates.totalPaid = increment(delta.paidDelta);
    if (delta.brokenDelta) updates.totalBroken = increment(delta.brokenDelta);
    if (delta.countDelta) updates.totalAgreements = increment(delta.countDelta);
    if (delta.paidCountDelta) updates.paidCount = increment(delta.paidCountDelta);

    await updateDoc(statsRef, updates);
    firestoreMetrics.recordWrite('agreements', 1);
  } catch (err) {
    console.warn('Erro ao atualizar estatísticas atômicas:', err);
  }
}

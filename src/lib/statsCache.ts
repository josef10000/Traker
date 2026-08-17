/**
 * statsCache.ts — Serviço de cache compartilhado de estatísticas mensais.
 *
 * Arquitetura: "Freshness Gate"
 * ─────────────────────────────
 * Em vez de armazenar as estatísticas completas, o documento de cache
 * funciona como um "portão de frescor": ele registra QUANDO as stats
 * foram calculadas pela última vez e SE algum acordo foi escrito desde então.
 *
 * Se o cache está fresco → o operador usa dados do IndexedDB local (0 leituras no servidor)
 * Se o cache está stale  → o operador busca do servidor e atualiza o cache
 *
 * Collection: monthlyStats
 * Document ID: {orgId}_{teamId}_{YYYY-MM}
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { firestoreMetrics } from './firestoreMetrics';

// ─── Interface do documento de cache ────────────────────────────────────────

interface StatsCacheDoc {
  /** ISO timestamp da última computação bem-sucedida */
  computedAt: string;
  /** ISO timestamp da última escrita de acordo (null = nenhuma escrita desde a computação) */
  staleAt: string | null;
  /** YYYY-MM-DD do "hoje" quando as stats foram computadas */
  forDate: string;
  /** UID do operador que computou (para debugging) */
  computedBy: string;
}

// Cache local de frescor em memória (TTL: 90 segundos)
// Evita consultar o Firestore repetidamente a cada mudança de filtro/render
const localFreshnessCache = new Map<string, { isFresh: boolean; expiresAt: number }>();
const FRESHNESS_TTL_MS = 90 * 1000;

// ─── Funções auxiliares ─────────────────────────────────────────────────────

/**
 * Gera o ID do documento de cache para um time + mês.
 * Formato: "{orgId}_{teamId}_{YYYY-MM}"
 */
export function getStatsCacheId(orgId: string, teamId: string, month: number, year: number): string {
  return `${orgId}_${teamId}_${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD.
 */
function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Funções públicas ───────────────────────────────────────────────────────

/**
 * Verifica se o cache de TODOS os times indicados está fresco.
 * Retorna true somente se TODOS estão frescos.
 *
 * Utiliza cache local em memória (90s TTL) para economizar 100% de leituras Firestore
 * em navegações rápidas pelo painel.
 */
export async function areStatsCachesFresh(
  orgId: string,
  teamIds: string[],
  month: number,
  year: number
): Promise<boolean> {
  if (!orgId || teamIds.length === 0) return false;

  const now = Date.now();
  const today = getTodayStr();

  // Verifica se todos os times já estão com frescor garantido em cache local recente
  const allCachedFresh = teamIds.every(teamId => {
    const cacheId = getStatsCacheId(orgId, teamId, month, year);
    const entry = localFreshnessCache.get(cacheId);
    return entry && entry.isFresh && now < entry.expiresAt;
  });

  if (allCachedFresh) {
    firestoreMetrics.recordRead('stats_freshness', teamIds.length, true, 1);
    return true;
  }

  try {
    const startTime = Date.now();
    const results = await Promise.all(
      teamIds.map(async (teamId) => {
        const cacheId = getStatsCacheId(orgId, teamId, month, year);
        const cacheRef = doc(db, 'monthlyStats', cacheId);
        const snap = await getDoc(cacheRef);

        if (!snap.exists()) {
          localFreshnessCache.set(cacheId, { isFresh: false, expiresAt: now + FRESHNESS_TTL_MS });
          return false;
        }

        const data = snap.data() as StatsCacheDoc;

        // Regra 1: computedAt deve existir
        if (!data.computedAt) {
          localFreshnessCache.set(cacheId, { isFresh: false, expiresAt: now + FRESHNESS_TTL_MS });
          return false;
        }

        // Regra 2: deve ter sido computado hoje
        if (data.forDate !== today) {
          localFreshnessCache.set(cacheId, { isFresh: false, expiresAt: now + FRESHNESS_TTL_MS });
          return false;
        }

        // Regra 3: não pode ter sido invalidado
        if (data.staleAt) {
          const staleTime = new Date(data.staleAt).getTime();
          const computeTime = new Date(data.computedAt).getTime();
          if (staleTime >= computeTime) {
            localFreshnessCache.set(cacheId, { isFresh: false, expiresAt: now + FRESHNESS_TTL_MS });
            return false;
          }
        }

        localFreshnessCache.set(cacheId, { isFresh: true, expiresAt: now + FRESHNESS_TTL_MS });
        return true;
      })
    );

    const isAllFresh = results.every(Boolean);
    const duration = Date.now() - startTime;
    firestoreMetrics.recordRead('stats_freshness', teamIds.length, false, duration);

    return isAllFresh;
  } catch (error) {
    console.error('[statsCache] Erro ao verificar frescor:', error);
    return false; // Em caso de erro, assume stale (seguro)
  }
}

/**
 * Salva/atualiza o cache de stats após uma busca bem-sucedida do servidor.
 * Marca computedAt = agora, staleAt = null, forDate = hoje.
 *
 * Custo: 1 escrita Firestore por time (setDoc com merge).
 */
export async function saveStatsCache(
  orgId: string,
  teamIds: string[],
  month: number,
  year: number,
  userId: string
): Promise<void> {
  const today = getTodayStr();
  const now = new Date().toISOString();

  try {
    await Promise.all(
      teamIds.map(async (teamId) => {
        const cacheId = getStatsCacheId(orgId, teamId, month, year);
        const cacheRef = doc(db, 'monthlyStats', cacheId);
        await setDoc(cacheRef, {
          computedAt: now,
          staleAt: null,
          forDate: today,
          computedBy: userId,
        } satisfies StatsCacheDoc);
        localFreshnessCache.set(cacheId, { isFresh: true, expiresAt: Date.now() + FRESHNESS_TTL_MS });
      })
    );
    firestoreMetrics.recordWrite('stats_freshness', teamIds.length);
  } catch (error) {
    // Falha ao salvar cache não deve impedir o fluxo principal
    console.error('[statsCache] Erro ao salvar cache:', error);
  }
}

/**
 * Marca o cache de stats como stale para os times afetados.
 * Chamado após qualquer escrita/edição/exclusão de acordo.
 *
 * IMPORTANTE: Esta função é fire-and-forget. Erros são logados mas não propagados.
 * Nunca deve bloquear ou atrasar a operação principal do usuário.
 *
 * Custo: 1 escrita Firestore por time (setDoc com merge).
 */
export async function markStatsStale(
  orgId: string,
  teamIds: string[],
  month: number,
  year: number
): Promise<void> {
  if (!orgId || teamIds.length === 0) return;

  const now = new Date().toISOString();

  try {
    await Promise.all(
      teamIds.map(async (teamId) => {
        const cacheId = getStatsCacheId(orgId, teamId, month, year);
        localFreshnessCache.delete(cacheId); // Invalida cache local imediatamente
        const cacheRef = doc(db, 'monthlyStats', cacheId);
        // merge: true garante que o documento é criado se não existir
        await setDoc(cacheRef, { staleAt: now }, { merge: true });
      })
    );
    firestoreMetrics.recordWrite('stats_freshness', teamIds.length);
  } catch (error) {
    console.error('[statsCache] Erro ao marcar stale:', error);
  }
}

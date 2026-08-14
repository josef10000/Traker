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
 * Regras de frescor:
 * 1. O documento existe
 * 2. computedAt está preenchido
 * 3. forDate === hoje (KPIs time-relative mudam a cada dia)
 * 4. staleAt é null OU staleAt < computedAt (nenhum acordo escrito desde o cálculo)
 *
 * Custo: 1 leitura Firestore por time (getDoc).
 */
export async function areStatsCachesFresh(
  orgId: string,
  teamIds: string[],
  month: number,
  year: number
): Promise<boolean> {
  if (!orgId || teamIds.length === 0) return false;

  const today = getTodayStr();

  try {
    const results = await Promise.all(
      teamIds.map(async (teamId) => {
        const cacheId = getStatsCacheId(orgId, teamId, month, year);
        const cacheRef = doc(db, 'monthlyStats', cacheId);
        const snap = await getDoc(cacheRef);

        if (!snap.exists()) return false;

        const data = snap.data() as StatsCacheDoc;

        // Regra 1: computedAt deve existir
        if (!data.computedAt) return false;

        // Regra 2: deve ter sido computado hoje
        if (data.forDate !== today) return false;

        // Regra 3: não pode ter sido invalidado
        if (data.staleAt) {
          const staleTime = new Date(data.staleAt).getTime();
          const computeTime = new Date(data.computedAt).getTime();
          if (staleTime >= computeTime) return false;
        }

        return true;
      })
    );

    return results.every(Boolean);
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
      })
    );
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
        const cacheRef = doc(db, 'monthlyStats', cacheId);
        // merge: true garante que o documento é criado se não existir
        await setDoc(cacheRef, { staleAt: now }, { merge: true });
      })
    );
  } catch (error) {
    console.error('[statsCache] Erro ao marcar stale:', error);
  }
}

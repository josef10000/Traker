/**
 * firestoreMetrics.ts — Módulo de Telemetria e FinOps do Firestore
 * 
 * Instrumenta em tempo real:
 * - Leituras estimadas e gravações no banco de dados;
 * - Taxa de Cache Hit vs. Cache Miss;
 * - Consumo desagregado por Tela/Módulo;
 * - Tempo médio de resposta das queries (latência).
 */

export interface ScreenMetric {
  reads: number;
  writes: number;
  cacheHits: number;
  cacheMisses: number;
  queryTimes: number[];
  avgTimeMs: number;
}

export interface FirestoreTelemetryData {
  totalReads: number;
  totalWrites: number;
  totalCacheHits: number;
  totalCacheMisses: number;
  cacheHitRatePercent: number;
  estimatedCostUsd: number;
  estimatedSavingsUsd: number;
  screens: Record<string, ScreenMetric>;
  sessionStartedAt: string;
  lastEventAt: string;
}

type TelemetryListener = (data: FirestoreTelemetryData) => void;

class FirestoreMetricsTracker {
  private static instance: FirestoreMetricsTracker;

  private totalReads = 0;
  private totalWrites = 0;
  private totalCacheHits = 0;
  private totalCacheMisses = 0;
  private screens: Record<string, ScreenMetric> = {};
  private sessionStartedAt = new Date().toISOString();
  private lastEventAt = new Date().toISOString();
  private listeners: Set<TelemetryListener> = new Set();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): FirestoreMetricsTracker {
    if (!FirestoreMetricsTracker.instance) {
      FirestoreMetricsTracker.instance = new FirestoreMetricsTracker();
    }
    return FirestoreMetricsTracker.instance;
  }

  private getScreenMetric(screenName: string): ScreenMetric {
    if (!this.screens[screenName]) {
      this.screens[screenName] = {
        reads: 0,
        writes: 0,
        cacheHits: 0,
        cacheMisses: 0,
        queryTimes: [],
        avgTimeMs: 0
      };
    }
    return this.screens[screenName];
  }

  /**
   * Registra leituras no Firestore ou atendimento via Cache.
   */
  public recordRead(screenName = 'general', count = 1, fromCache = false, durationMs?: number): void {
    const screen = this.getScreenMetric(screenName);

    if (fromCache) {
      this.totalCacheHits += count;
      screen.cacheHits += count;
    } else {
      this.totalReads += count;
      this.totalCacheMisses += count;
      screen.reads += count;
      screen.cacheMisses += count;
    }

    if (typeof durationMs === 'number' && durationMs >= 0) {
      screen.queryTimes.push(durationMs);
      if (screen.queryTimes.length > 50) screen.queryTimes.shift(); // Mantém últimas 50
      screen.avgTimeMs = Math.round(
        screen.queryTimes.reduce((a, b) => a + b, 0) / screen.queryTimes.length
      );
    }

    this.lastEventAt = new Date().toISOString();
    this.persistAndNotify();
  }

  /**
   * Registra gravações (writes) no Firestore.
   */
  public recordWrite(screenName = 'general', count = 1): void {
    const screen = this.getScreenMetric(screenName);
    this.totalWrites += count;
    screen.writes += count;
    this.lastEventAt = new Date().toISOString();
    this.persistAndNotify();
  }

  /**
   * Obtém o snapshot consolidado de métricas.
   */
  public getMetrics(): FirestoreTelemetryData {
    const totalAttempts = this.totalCacheHits + this.totalCacheMisses;
    const cacheHitRatePercent = totalAttempts > 0 
      ? Math.round((this.totalCacheHits / totalAttempts) * 1000) / 10 
      : 100;

    // Custo estimado padrão Firestore ($0.06 por 100k reads, $0.18 por 100k writes)
    const estimatedCostUsd = (this.totalReads * 0.0000006) + (this.totalWrites * 0.0000018);
    const estimatedSavingsUsd = (this.totalCacheHits * 0.0000006);

    return {
      totalReads: this.totalReads,
      totalWrites: this.totalWrites,
      totalCacheHits: this.totalCacheHits,
      totalCacheMisses: this.totalCacheMisses,
      cacheHitRatePercent,
      estimatedCostUsd,
      estimatedSavingsUsd,
      screens: { ...this.screens },
      sessionStartedAt: this.sessionStartedAt,
      lastEventAt: this.lastEventAt
    };
  }

  /**
   * Reseta as métricas da sessão local.
   */
  public resetMetrics(): void {
    this.totalReads = 0;
    this.totalWrites = 0;
    this.totalCacheHits = 0;
    this.totalCacheMisses = 0;
    this.screens = {};
    this.sessionStartedAt = new Date().toISOString();
    this.lastEventAt = new Date().toISOString();
    this.persistAndNotify();
  }

  /**
   * Adiciona listener reativo.
   */
  public subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    listener(this.getMetrics());
    return () => this.listeners.delete(listener);
  }

  private persistAndNotify(): void {
    try {
      localStorage.setItem('tracker_firestore_telemetry', JSON.stringify({
        totalReads: this.totalReads,
        totalWrites: this.totalWrites,
        totalCacheHits: this.totalCacheHits,
        totalCacheMisses: this.totalCacheMisses,
        screens: this.screens,
        sessionStartedAt: this.sessionStartedAt,
        lastEventAt: this.lastEventAt
      }));
    } catch {
      // Ignora erro de storage
    }

    const data = this.getMetrics();
    this.listeners.forEach(l => l(data));
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('tracker_firestore_telemetry');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.totalReads = parsed.totalReads || 0;
        this.totalWrites = parsed.totalWrites || 0;
        this.totalCacheHits = parsed.totalCacheHits || 0;
        this.totalCacheMisses = parsed.totalCacheMisses || 0;
        this.screens = parsed.screens || {};
        this.sessionStartedAt = parsed.sessionStartedAt || new Date().toISOString();
        this.lastEventAt = parsed.lastEventAt || new Date().toISOString();
      }
    } catch {
      // Começa com métricas zeradas
    }
  }
}

export const firestoreMetrics = FirestoreMetricsTracker.getInstance();

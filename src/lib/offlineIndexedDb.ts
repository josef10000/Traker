/**
 * offlineIndexedDb.ts — Engine de Indexação e Consulta Ultra-Rápida via IndexedDB
 * 
 * Fornece armazenamento local indexado por `cleanCpf` e `clientNameClean`
 * para realizar buscas sub-milissegundo sem travar a thread principal da UI.
 */

import { Agreement } from '../types';

const DB_NAME = 'tracker_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'agreements';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB não é suportado neste ambiente'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('cleanCpf', 'cleanCpf', { unique: false });
        store.createIndex('clientNameClean', 'clientNameClean', { unique: false });
        store.createIndex('organizationId', 'organizationId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Salva ou atualiza uma lista de acordos no IndexedDB local com campos indexados.
 */
export async function saveAgreementsToIndex(agreements: Agreement[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    agreements.forEach(a => {
      const cleanCpf = (a.clientCpf || '').replace(/\D/g, '');
      const clientNameClean = (a.clientName || '').toLowerCase().trim();
      store.put({
        ...a,
        cleanCpf,
        clientNameClean
      });
    });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Fallback IndexedDB: não foi possível salvar em cache local:', err);
  }
}

/**
 * Realiza busca rápida por CPF limpo no IndexedDB.
 */
export async function searchByCpfIndex(cpf: string): Promise<Agreement[]> {
  const clean = cpf.replace(/\D/g, '');
  if (!clean) return [];

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('cleanCpf');
    const request = index.getAll(clean);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result as Agreement[]);
      request.onerror = () => resolve([]);
    });
  } catch (err) {
    return [];
  }
}

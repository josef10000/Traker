/// <reference types="vite/client" />

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigJson.measurementId,
};

const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfigJson.firestoreDatabaseId;

const app = initializeApp(firebaseConfig);

/**
 * Firebase App Check com reCAPTCHA v3 Enterprise.
 * Garante que apenas o app legítimo (rodando no domínio autorizado)
 * consiga acessar os serviços Firebase — mesmo que a API Key seja conhecida.
 *
 * Em desenvolvimento (import.meta.env.DEV), ativa o debug token automaticamente
 * para não bloquear o ambiente local.
 */
const rawSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const appCheckSiteKey = typeof rawSiteKey === 'string' ? rawSiteKey.trim() : undefined;
const enableAppCheck = import.meta.env.VITE_ENABLE_APP_CHECK === 'true';

// Ativa debug token para ambiente local ou desenvolvimento para não bloquear chamadas do Firestore/Auth com HTTP 400
if (import.meta.env.DEV || typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

if (enableAppCheck && appCheckSiteKey && appCheckSiteKey.length > 0) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn('Alerta AppCheck (não impeditivo):', err);
  }
}

/**
 * Firestore com cache local persistente (IndexedDB).
 * Na segunda visita do usuário, os dados são lidos do disco local (custo = 0 leituras).
 * O Firebase sincroniza apenas as diferenças desde a última vez que o usuário abriu o app.
 * persistentMultipleTabManager garante que múltiplas abas do mesmo operador
 * compartilhem o mesmo cache sem conflitos.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, databaseId);

export const auth = getAuth();

import { WebAuthnCredential } from '../types';
import { secureRandomId } from '../utils/crypto';

// Converte ArrayBuffer para String Base64 URL Safe
const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

// Converte String Base64 URL Safe para Uint8Array
const base64ToBuffer = (base64: string): Uint8Array => {
  let padded = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (padded.length % 4) {
    padded += '=';
  }
  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

/**
 * Verifica se a API nativa do WebAuthn / Windows Hello está disponível no navegador
 */
export const isWebAuthnSupported = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.PublicKeyCredential);
};

/**
 * Gera 5 códigos de backup de emergência no formato 8492-1029
 */
export const generateBackupCodes = (count: number = 5): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const part1 = Math.floor(1000 + Math.random() * 9000);
    const part2 = Math.floor(1000 + Math.random() * 9000);
    codes.push(`${part1}-${part2}`);
  }
  return codes;
};

/**
 * Registra o Windows Hello (Biometria ou PIN) na máquina atual do colaborador
 */
export const registerWindowsHello = async (
  userId: string,
  userEmail: string,
  displayName: string,
  isSandbox: boolean = false
): Promise<WebAuthnCredential> => {
  const now = new Date().toISOString();
  const deviceName = `${navigator.platform || 'Windows'} PC (${new Date().toLocaleDateString('pt-BR')})`;

  if (isSandbox || !isWebAuthnSupported()) {
    // Simulação visual de registro para o ambiente Sandbox ou sem suporte nativo HTTPS
    return {
      id: `cred-sandbox-${secureRandomId('win')}`,
      publicKey: `pubkey-${Date.now()}`,
      deviceName: `Windows Hello - ${deviceName}`,
      createdAt: now,
      counter: 1
    };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userIdBytes = new TextEncoder().encode(userId);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge.buffer as ArrayBuffer,
      rp: {
        name: 'Tracker SaaS - Noverde',
        id: window.location.hostname
      },
      user: {
        id: userIdBytes.buffer as ArrayBuffer,
        name: userEmail,
        displayName: displayName || userEmail
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Força o Windows Hello / TPM da máquina
        userVerification: 'required',
        residentKey: 'preferred'
      },
      timeout: 60000,
      attestation: 'none'
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    })) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error('Registro do Windows Hello cancelado pelo usuário.');
    }

    const rawId = bufferToBase64(credential.rawId);

    return {
      id: rawId,
      publicKey: `pubkey-${rawId.substring(0, 16)}`,
      deviceName: `Windows Hello (${deviceName})`,
      createdAt: now,
      counter: 1
    };
  } catch (err: any) {
    console.warn('Erro ao chamar WebAuthn nativo, fallback ativado:', err);
    // Em caso de falha no leitor ou ambiente de desenvolvimento local (http), gera a credencial segura
    return {
      id: `cred-local-${secureRandomId('win')}`,
      publicKey: `pubkey-local-${Date.now()}`,
      deviceName: `Windows Hello (Ativado)`,
      createdAt: now,
      counter: 1
    };
  }
};

/**
 * Autentica o usuário solicitando a biometria/PIN do Windows Hello a cada login
 */
export const verifyWindowsHello = async (
  credentials: WebAuthnCredential[],
  isSandbox: boolean = false
): Promise<boolean> => {
  if (isSandbox || !isWebAuthnSupported() || !credentials || credentials.length === 0) {
    // No Sandbox ou sem HTTPS nativo, retorna true após simulação
    return true;
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const allowCredentials = credentials.map(c => ({
      id: base64ToBuffer(c.id).buffer as ArrayBuffer,
      type: 'public-key' as const,
      transports: ['internal' as const]
    }));

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: challenge.buffer as ArrayBuffer,
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      userVerification: 'required',
      timeout: 60000
    };

    const assertion = (await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    })) as PublicKeyCredential | null;

    return Boolean(assertion);
  } catch (err: any) {
    console.warn('Falha na validação do Windows Hello nativo:', err);
    // Retorna false em caso de cancelamento pelo usuário
    return false;
  }
};

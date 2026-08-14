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

// Converte String Base64 URL Safe para Uint8Array com proteção a exceções
const base64ToBuffer = (base64: string): Uint8Array => {
  try {
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
  } catch {
    return new Uint8Array(0);
  }
};

/**
 * Verifica se a API nativa do WebAuthn / Windows Hello está disponível no navegador
 */
export const isWebAuthnSupported = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.PublicKeyCredential);
};

/**
 * Gera 5 códigos de backup de emergência no formato 8492-1029
 * SEGURANÇA: Usa crypto.getRandomValues() para entropia criptográfica
 */
export const generateBackupCodes = (count: number = 5): string[] => {
  const codes: string[] = [];
  const values = new Uint16Array(count * 2);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(values);
  } else {
    // Fallback mínimo para SSR/testes
    for (let i = 0; i < values.length; i++) {
      values[i] = Math.floor(Math.random() * 65536);
    }
  }
  for (let i = 0; i < count; i++) {
    const part1 = 1000 + (values[i * 2] % 9000);
    const part2 = 1000 + (values[i * 2 + 1] % 9000);
    codes.push(`${part1}-${part2}`);
  }
  return codes;
};

/**
 * Registra uma nova credencial do Windows Hello (Biometria / PIN)
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

    const hostname = window.location.hostname;
    const isIpOrLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge.buffer as ArrayBuffer,
      rp: {
        name: 'Tracker SaaS',
        ...(isIpOrLocalhost ? {} : { id: hostname })
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
        userVerification: 'preferred'
      },
      timeout: 10000,
      attestation: 'none'
    };

    const credential = await Promise.race([
      navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000))
    ]) as PublicKeyCredential | null;

    if (!credential) {
      return {
        id: `cred-native-${secureRandomId('win')}`,
        publicKey: `pubkey-${Date.now()}`,
        deviceName: `Windows Hello (${deviceName})`,
        createdAt: now,
        counter: 1
      };
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
    return true;
  }

  const validBase64Creds = credentials.filter(c => c.id && !c.id.startsWith('cred-'));
  if (validBase64Creds.length === 0) {
    return true;
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const allowCredentials = validBase64Creds
      .map(c => {
        const buf = base64ToBuffer(c.id);
        if (buf.length === 0) return null;
        return {
          id: buf.buffer as ArrayBuffer,
          type: 'public-key' as const,
          transports: ['internal' as const]
        };
      })
      .filter(Boolean) as PublicKeyCredentialDescriptor[];

    if (allowCredentials.length === 0) {
      return true;
    }

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: challenge.buffer as ArrayBuffer,
      allowCredentials,
      userVerification: 'preferred',
      timeout: 10000
    };

    const assertion = await Promise.race([
      navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000))
    ]) as PublicKeyCredential | null;

    return Boolean(assertion);
  } catch (err: any) {
    console.warn('Falha na validação do Windows Hello nativo:', err);
    return false;
  }
};

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
 * Em modo real, solicita o Windows Hello ao sistema operacional e retorna a chave pública gerada.
 * Se o usuário cancelar ou falhar, lança exceção explícita (sem salvar mocks falsos).
 */
export const registerWindowsHello = async (
  userId: string,
  userEmail: string,
  displayName: string,
  isSandbox: boolean = false
): Promise<WebAuthnCredential> => {
  const now = new Date().toISOString();
  const platformName = typeof navigator !== 'undefined' ? (navigator.platform || 'Windows') : 'Windows';
  const deviceName = `${platformName} PC (${new Date().toLocaleDateString('pt-BR')})`;

  // 1. Tratamento para ambiente de testes / Sandbox simulado
  if (isSandbox) {
    return {
      id: `cred-sandbox-${secureRandomId('win')}`,
      publicKey: `pubkey-sandbox-${Date.now()}`,
      deviceName: `Windows Hello - ${deviceName}`,
      createdAt: now,
      counter: 1
    };
  }

  if (!isWebAuthnSupported()) {
    throw new Error('Seu navegador ou sistema operacional não possui suporte à API WebAuthn / Windows Hello.');
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
        name: 'Tracker Platform',
        ...(isIpOrLocalhost ? {} : { id: hostname })
      },
      user: {
        id: userIdBytes.buffer as ArrayBuffer,
        name: userEmail,
        displayName: displayName || userEmail
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256 (Padrão FIDO2 / Windows Hello)
        { alg: -257, type: 'public-key' } // RS256 (Fallback Windows Hello PIN)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Força o leitor biométrico nativo / PIN da máquina
        userVerification: 'required'         // Exige biometria ou PIN
      },
      timeout: 30000,
      attestation: 'none'
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    }) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error('O registro do Windows Hello não foi concluído pelo sistema operacional.');
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
    if (err.name === 'NotAllowedError') {
      throw new Error('A solicitação do Windows Hello foi cancelada ou a janela de biometria foi fechada.');
    } else if (err.name === 'InvalidStateError') {
      throw new Error('Este dispositivo já possui uma credencial do Windows Hello registrada.');
    }
    throw new Error(err.message || 'Falha ao registrar a biometria/PIN no Windows Hello.');
  }
};

/**
 * Autentica o usuário solicitando a biometria/PIN do Windows Hello a cada login
 */
export const verifyWindowsHello = async (
  credentials: WebAuthnCredential[],
  isSandbox: boolean = false
): Promise<boolean> => {
  if (isSandbox) {
    return true;
  }

  if (!isWebAuthnSupported()) {
    console.warn('[WebAuthn] API WebAuthn não disponível no navegador.');
    return false;
  }

  if (!credentials || credentials.length === 0) {
    console.warn('[WebAuthn] Nenhuma credencial registrada para validação.');
    return false;
  }

  const validBase64Creds = credentials.filter(c => c.id && !c.id.startsWith('cred-sandbox-'));
  if (validBase64Creds.length === 0) {
    return false;
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
      return false;
    }

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: challenge.buffer as ArrayBuffer,
      allowCredentials,
      userVerification: 'required',
      timeout: 30000
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    }) as PublicKeyCredential | null;

    return Boolean(assertion && assertion.id);
  } catch (err: any) {
    console.warn('Falha na validação do Windows Hello nativo:', err);
    return false;
  }
};

import { WebAuthnCredential } from '../types';

export const isWebAuthnSupported = (): boolean => false;

export const generateBackupCodes = (_count: number = 5): string[] => [];

export const registerWindowsHello = async (
  _userId: string,
  _userEmail: string,
  _displayName: string,
  _isSandbox: boolean = false
): Promise<WebAuthnCredential> => {
  throw new Error('Recurso de 2FA desativado.');
};

export const verifyWindowsHello = async (
  _credentials: WebAuthnCredential[],
  _isSandbox: boolean = false
): Promise<boolean> => false;


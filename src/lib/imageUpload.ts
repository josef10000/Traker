/**
 * Utilitário de Processamento e Upload de Imagens/Prints
 * Suporta Cloudflare R2 (com as chaves configuradas em VITE_R2_*)
 * e fallback automático leve para ambiente Sandbox / Demo.
 */

export interface UploadOptions {
  maxWidth?: number;
  quality?: number;
  folder?: string;
  isSandbox?: boolean;
  retentionHours?: number; // ex: 24 para Sandbox
  retentionDays?: number;  // ex: 365 para Base de Conhecimento
  allowFallback?: boolean; // Se false, exige upload no R2
}

/**
 * Compacta e ajusta o tamanho da imagem no navegador
 */
export async function compressImage(
  input: File | Blob | string,
  maxWidth = 1600,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Não foi possível inicializar o contexto 2D do Canvas.'));
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Tenta exportar para webp, se não suportado faz fallback para jpeg
      try {
        const webpData = canvas.toDataURL('image/webp', quality);
        if (webpData.startsWith('data:image/webp')) {
          return resolve(webpData);
        }
      } catch (e) {
        console.warn('Exportação WebP não disponível, usando JPEG:', e);
      }

      const jpegData = canvas.toDataURL('image/jpeg', quality);
      resolve(jpegData);
    };

    img.onerror = () => reject(new Error('Falha ao carregar a imagem para processamento.'));

    if (typeof input === 'string') {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error('Falha na leitura do arquivo de imagem.'));
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler o arquivo selecionado.'));
      reader.readAsDataURL(input);
    }
  });
}

/**
 * Converte dataUrl de imagem para Blob em memória sem fazer requisição fetch (evita erro de CSP)
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/webp';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

import { secureRandomId } from '../utils/crypto';

/**
 * Faz o upload direto para o Cloudflare R2 com controle de retenção por metadados e prefixos:
 * - Sandbox / Testes: Pasta 'sandbox-24h/' com expiração de 24 horas (TTL: 86400s)
 * - Base de Conhecimento: Pasta 'kb-1year/' com expiração de 365 dias (TTL: 31536000s)
 */
export async function uploadImage(
  input: File | Blob | string,
  options: UploadOptions = {}
): Promise<string> {
  const { 
    maxWidth = 1600, 
    quality = 0.85, 
    folder, 
    isSandbox = false, 
    retentionHours, 
    retentionDays,
    allowFallback = true
  } = options;

  // 1. Determina a regra de retenção e pasta do Cloudflare R2
  let targetFolder = folder;
  let ttlSeconds = 86400; // Padrão: 24 horas
  let retentionType = '24h';

  if (isSandbox || retentionHours === 24 || folder === 'sandbox-24h') {
    targetFolder = 'sandbox-24h';
    ttlSeconds = 86400; // 24 horas
    retentionType = '24h';
  } else if (retentionDays === 365 || folder === 'kb-articles' || folder === 'kb-1year') {
    targetFolder = 'kb-1year';
    ttlSeconds = 31536000; // 365 dias (1 ano)
    retentionType = '1year';
  } else {
    targetFolder = targetFolder || 'attachments';
  }

  // Calcula a data exata de expiração ISO
  const expiresAtDate = new Date(Date.now() + ttlSeconds * 1000);
  const expiresAtISO = expiresAtDate.toISOString();

  // 2. Compacta a imagem para formato WebP ultra-leve
  const compressedDataUrl = await compressImage(input, maxWidth, quality);

  const uploadEndpoint = import.meta.env.VITE_R2_UPLOAD_ENDPOINT;
  // SEGURANCA: Credenciais de storage (ACCESS_KEY_ID, SECRET_ACCESS_KEY) NUNCA devem estar
  // no frontend. Use VITE_R2_UPLOAD_ENDPOINT apontando para um endpoint serverless (Cloudflare Worker
  // ou Vercel Function) que assina e executa o upload no servidor.
  if (uploadEndpoint) {
    try {
      const filename = `${targetFolder}/${secureRandomId('file')}.webp`;
      const blob = dataUrlToBlob(compressedDataUrl);
      const uploadResponse = await fetch(`${uploadEndpoint}?key=${encodeURIComponent(filename)}&expiresAt=${encodeURIComponent(expiresAtISO)}&ttl=${ttlSeconds}&retention=${retentionType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/webp' },
        body: blob,
      });

      if (uploadResponse.ok) {
        const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL || '';
        const cleanPublicBaseUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
        return cleanPublicBaseUrl ? `${cleanPublicBaseUrl}/${filename}` : uploadEndpoint;
      }
    } catch (error) {
      console.warn('Alerta R2: Falha ao enviar para o Cloudflare R2:', error);
      if (!allowFallback) {
        throw new Error('Falha no upload para o Cloudflare R2. Verifique a conexao ou as credenciais.');
      }
    }
  }

  // Em ambiente local sem credenciais R2 configuradas, se o fallback for permitido, retorna a string compactada WebP
  return compressedDataUrl;
}


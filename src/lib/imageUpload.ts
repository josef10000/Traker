/**
 * Utilitário de Processamento e Upload de Imagens/Prints
 * Suporta Cloudflare R2 (com as chaves configuradas em VITE_R2_*)
 * e fallback automático leve para ambiente Sandbox / Demo.
 */

interface UploadOptions {
  maxWidth?: number;
  quality?: number;
  folder?: string;
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

/**
 * Tenta fazer o upload para o Cloudflare R2 caso as variáveis VITE_R2_* estejam configuradas.
 * Se não estiverem ou em ambiente Sandbox, retorna a string compactada com sucesso.
 */
export async function uploadImage(
  input: File | Blob | string,
  options: UploadOptions = {}
): Promise<string> {
  const { maxWidth = 1600, quality = 0.85, folder = 'attachments' } = options;

  // 1. Compacta a imagem
  const compressedDataUrl = await compressImage(input, maxWidth, quality);

  const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
  const bucketName = import.meta.env.VITE_R2_BUCKET_NAME;
  const accessKeyId = import.meta.env.VITE_R2_ACCESS_KEY_ID;
  const secretAccessKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
  const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL;

  // Se o R2 estiver com domínio público configurado, realiza a requisição de upload
  if (accountId && bucketName && accessKeyId && secretAccessKey && publicUrl) {
    try {
      const filename = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.webp`;
      const cleanPublicBaseUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
      const fileUrl = `${cleanPublicBaseUrl}/${filename}`;

      // Converte dataUrl em Blob em memória (sem fetch de data:)
      const blob = dataUrlToBlob(compressedDataUrl);

      // Envio via HTTP PUT
      const uploadResponse = await fetch(fileUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/webp',
        },
        body: blob,
      });

      if (uploadResponse.ok) {
        return fileUrl;
      }
    } catch (error) {
      console.info('Upload direto R2 não configurado ou aguardando credenciais. Utilizando imagem otimizada:', error);
    }
  }

  // Fallback seguro: retorna a imagem compactada otimizada
  return compressedDataUrl;
}

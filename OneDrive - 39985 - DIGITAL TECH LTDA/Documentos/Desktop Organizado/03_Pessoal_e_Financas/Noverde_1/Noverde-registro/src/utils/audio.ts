/**
 * Utilitário para formatar URLs de áudio armazenadas em nuvem (SharePoint, OneDrive, Google Drive, Dropbox)
 * para URLs de transmissão direta (direct media stream) aceitas pelo elemento <audio src="..." /> do HTML5.
 */
export const formatAudioStreamUrl = (url?: string): string => {
  if (!url) return '';
  const trimmed = url.trim();

  // 1. SharePoint / OneDrive: Adiciona &download=1 para forçar o envio do arquivo MP3 bruto
  if (
    trimmed.includes('sharepoint.com') ||
    trimmed.includes('onedrive.live.com') ||
    trimmed.includes('1drv.ms')
  ) {
    if (trimmed.includes('download=1')) return trimmed;
    return trimmed.includes('?') ? `${trimmed}&download=1` : `${trimmed}?download=1`;
  }

  // 2. Google Drive: Converte link de visualização /file/d/ID/view para export/download direto
  if (trimmed.includes('drive.google.com/file/d/')) {
    const matches = trimmed.match(/\/file\/d\/([^\/]+)/);
    if (matches && matches[1]) {
      return `https://drive.google.com/uc?export=download&id=${matches[1]}`;
    }
  }

  // 3. Dropbox: Substitui o parâmetro dl=0 por raw=1
  if (trimmed.includes('dropbox.com')) {
    if (trimmed.includes('raw=1')) return trimmed;
    if (trimmed.includes('dl=0')) return trimmed.replace('dl=0', 'raw=1');
    return trimmed.includes('?') ? `${trimmed}&raw=1` : `${trimmed}?raw=1`;
  }

  return trimmed;
};

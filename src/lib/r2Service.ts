/**
 * Serviço de Integração com Cloudflare R2 (com Fallback automático em memória para o Modo Sandbox)
 */

export interface R2UploadResult {
  url: string;
  key: string;
  expiresAt: string;
}

export const r2Service = {
  /**
   * Upload de arquivo de áudio para o Cloudflare R2 ou Data URL em memória no Sandbox
   */
  async uploadAudio(file: File, organizationId: string, isSandboxMode: boolean = false): Promise<R2UploadResult> {
    const r2Endpoint = import.meta.env.VITE_CLOUDFLARE_R2_ENDPOINT;

    // Se estiver em modo Sandbox ou sem endpoint configurado, utiliza Data URL Base64 temporário em memória (Expira em 1 dia)
    if (!r2Endpoint || isSandboxMode) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileKey = `sandbox_audio_${Date.now()}_${safeName}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 1 dia (24h)

      return {
        url: dataUrl,
        key: fileKey,
        expiresAt
      };
    }

    // No modo Produção com o Cloudflare R2 configurado (Expira em 6 meses / 180 dias)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileKey = `audio_tabulations/${organizationId}/${Date.now()}_${safeName}`;
    const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(); // 6 meses (180 dias)

    const formData = new FormData();
    formData.append('file', file);
    formData.append('key', fileKey);
    formData.append('expiresAt', expiresAt);

    const response = await fetch(r2Endpoint, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Falha ao enviar arquivo para o Cloudflare R2.');
    }

    const data = await response.json();
    const publicUrl = import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_URL || '';
    
    return {
      url: data.url || `${publicUrl}/${fileKey}`,
      key: fileKey,
      expiresAt: data.expiresAt || expiresAt
    };
  }
};

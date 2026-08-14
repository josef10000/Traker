import { describe, it, expect } from 'vitest';
import { formatAudioStreamUrl } from './audio';

describe('formatAudioStreamUrl', () => {
  it('deve retornar string vazia se a URL não for fornecida', () => {
    expect(formatAudioStreamUrl('')).toBe('');
    expect(formatAudioStreamUrl(undefined)).toBe('');
  });

  it('deve converter URLs do SharePoint/OneDrive adicionando &download=1', () => {
    const sharepointUrl = 'https://tenant-my.sharepoint.com/:u:/g/personal/operador_teste_company/IQAeqvJe-ZeBQ61SPFVZvo1hAb-Mh8-uMvGNHVMEMIdFuC0?e=2gKBWM';
    const expected = `${sharepointUrl}&download=1`;
    expect(formatAudioStreamUrl(sharepointUrl)).toBe(expected);
  });

  it('não deve duplicar &download=1 se a URL do SharePoint já contiver o parâmetro', () => {
    const sharepointUrl = 'https://tenant.sharepoint.com/file.mp3?download=1';
    expect(formatAudioStreamUrl(sharepointUrl)).toBe(sharepointUrl);
  });

  it('deve converter URLs do Google Drive para uc?export=download', () => {
    const gdriveUrl = 'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I/view?usp=sharing';
    const expected = 'https://drive.google.com/uc?export=download&id=1A2B3C4D5E6F7G8H9I';
    expect(formatAudioStreamUrl(gdriveUrl)).toBe(expected);
  });

  it('deve converter URLs do Dropbox trocando dl=0 por raw=1', () => {
    const dropboxUrl = 'https://www.dropbox.com/s/xyz123/gravacao.mp3?dl=0';
    const expected = 'https://www.dropbox.com/s/xyz123/gravacao.mp3?raw=1';
    expect(formatAudioStreamUrl(dropboxUrl)).toBe(expected);
  });

  it('deve manter URLs diretas de áudio inalteradas', () => {
    const mp3Url = 'https://exemplo.com/audio/gravacao.mp3';
    expect(formatAudioStreamUrl(mp3Url)).toBe(mp3Url);
  });
});

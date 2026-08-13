/**
 * Web Audio API Sound Synthesizer
 * Gera efeitos sonoros em tempo real sem dependência de arquivos MP3/WAV externos.
 */

let audioCtx: AudioContext | null = null;
let suspendTimeout: any = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  // Agendar suspensão após 15 segundos para economizar RAM e recursos de hardware
  if (suspendTimeout) clearTimeout(suspendTimeout);
  suspendTimeout = setTimeout(() => {
    if (audioCtx && audioCtx.state === 'running') {
      audioCtx.suspend().catch(() => {});
    }
  }, 15000);

  return audioCtx;
};

/**
 * Toca o efeito sonoro sintetizado de acordo com o estilo e volume selecionados
 * @param style 'coin' | 'laser' | 'marimba' | 'silent'
 * @param volumePercent 0 a 100
 */
export const playDealSound = (
  style: 'coin' | 'laser' | 'marimba' | 'silent' = 'coin',
  volumePercent: number = 80
) => {
  if (style === 'silent' || volumePercent <= 0) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const masterGain = ctx.createGain();
    const gainValue = Math.max(0, Math.min(1, volumePercent / 100)) * 0.3; // Max amplitude 0.3 para evitar distorção
    masterGain.gain.setValueAtTime(gainValue, ctx.currentTime);
    masterGain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (style === 'coin') {
      // Efeito Moeda de Ouro (Chime Duplo B6 -> E7)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();

      osc1.type = 'sine';
      osc2.type = 'sine';

      // Nota 1 (B6: ~1975Hz)
      osc1.frequency.setValueAtTime(1975.53, now);
      // Nota 2 (E7: ~2637Hz)
      osc2.frequency.setValueAtTime(2637.02, now + 0.08);

      const noteGain1 = ctx.createGain();
      const noteGain2 = ctx.createGain();

      noteGain1.gain.setValueAtTime(1, now);
      noteGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      noteGain2.gain.setValueAtTime(0, now);
      noteGain2.gain.setValueAtTime(1, now + 0.08);
      noteGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(noteGain1);
      noteGain1.connect(masterGain);

      osc2.connect(noteGain2);
      noteGain2.connect(masterGain);

      osc1.start(now);
      osc1.stop(now + 0.25);

      osc2.start(now + 0.08);
      osc2.stop(now + 0.45);

    } else if (style === 'laser') {
      // Efeito Sci-Fi Laser (Frequência varrendo de 400Hz a 1400Hz)
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';

      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.2);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);

      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0.8, now);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.25);

    } else if (style === 'marimba') {
      // Efeito Marimba Suave (Acorde C5 - E5 - G5 com harmônicos redondos)
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.setValueAtTime(0.7, now + idx * 0.04);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.35);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.35);
      });
    }
  } catch (err) {
    console.warn('Erro ao reproduzir áudio sintetizado:', err);
  }
};

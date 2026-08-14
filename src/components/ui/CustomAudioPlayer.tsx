import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SpeakerHigh, SpeakerSimpleSlash, Clock, Waveform } from '@phosphor-icons/react';
import { formatAudioStreamUrl } from '../../utils/audio';

interface CustomAudioPlayerProps {
  src: string;
  theme?: 'light' | 'dark';
  expiresAt?: string;
  compact?: boolean;
  title?: string;
}

export const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({
  src,
  theme = 'dark',
  expiresAt,
  compact = false,
  title
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isDark = theme === 'dark';
  const isExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;

  const audioStreamUrl = formatAudioStreamUrl(src);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current || isExpired) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error("Erro ao tocar áudio:", err));
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
    setIsLoading(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (isExpired) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold">
        <Clock size={12} />
        <span>Áudio Expirado</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 p-2 rounded-2xl border transition-all shadow-sm ${
      compact ? 'w-48' : 'w-full max-w-xs'
    } ${
      isDark ? 'bg-slate-950/70 border-white/10 text-white' : 'bg-slate-900 border-slate-800 text-white'
    }`}>
      <audio
        ref={audioRef}
        src={audioStreamUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />

      {title && (
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 px-1">
          <span className="truncate flex items-center gap-1">
            <Waveform size={11} className="text-sky-400" /> {title}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Botão Play / Pause */}
        <button
          type="button"
          onClick={togglePlay}
          disabled={isLoading && !audioRef.current}
          className="w-8 h-8 rounded-xl bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          title={isPlaying ? 'Pausar' : 'Reproduzir'}
        >
          {isPlaying ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" className="ml-0.5" />}
        </button>

        {/* Timeline & Temporizador */}
        <div className="flex-1 space-y-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 hover:accent-sky-300"
          />
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Botão Mute */}
        <button
          type="button"
          onClick={toggleMute}
          className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          title={isMuted ? 'Ativar som' : 'Mudar para mudo'}
        >
          {isMuted ? <SpeakerSimpleSlash size={14} /> : <SpeakerHigh size={14} />}
        </button>
      </div>

      {expiresAt && (
        <div className="flex items-center gap-1 px-1 text-[9px] font-medium text-amber-400/80">
          <Clock size={10} />
          <span>Expira em: {new Date(expiresAt).toLocaleDateString('pt-BR')}</span>
        </div>
      )}
    </div>
  );
};

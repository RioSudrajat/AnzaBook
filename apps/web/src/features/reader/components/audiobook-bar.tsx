import { useEffect, useRef, useState } from "react";
import {
  FastForward,
  Headphones,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type AudiobookBarProps = {
  audioUrl: string | null;
  totalDurationSeconds: number;
  activeParagraphIndex: number;
  totalParagraphs: number;
  onParagraphChange: (index: number) => void;
  onClose?: () => void;
};

const PLAYBACK_SPEEDS = [0.75, 1.0, 1.25, 1.5, 2.0];

export function AudiobookBar({
  audioUrl,
  totalDurationSeconds,
  activeParagraphIndex,
  totalParagraphs,
  onParagraphChange,
  onClose,
}: AudiobookBarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // If no audio URL, simulate playback across totalDurationSeconds
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && (!audioUrl || !audioRef.current)) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1 * playbackSpeed;
          if (next >= totalDurationSeconds) {
            setIsPlaying(false);
            return 0;
          }
          // Sync paragraph progression
          if (totalParagraphs > 0) {
            const ratio = next / Math.max(1, totalDurationSeconds);
            const targetIndex = Math.min(
              totalParagraphs - 1,
              Math.floor(ratio * totalParagraphs),
            );
            if (targetIndex !== activeParagraphIndex) {
              onParagraphChange(targetIndex);
            }
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    isPlaying,
    audioUrl,
    playbackSpeed,
    totalDurationSeconds,
    totalParagraphs,
    activeParagraphIndex,
    onParagraphChange,
  ]);

  const togglePlay = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
    if (totalParagraphs > 0 && totalDurationSeconds > 0) {
      const ratio = val / totalDurationSeconds;
      const targetIndex = Math.min(
        totalParagraphs - 1,
        Math.floor(ratio * totalParagraphs),
      );
      onParagraphChange(targetIndex);
    }
  };

  const cycleSpeed = () => {
    const nextIdx =
      (PLAYBACK_SPEEDS.indexOf(playbackSpeed) + 1) % PLAYBACK_SPEEDS.length;
    const speed = PLAYBACK_SPEEDS[nextIdx];
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-3 sm:gap-6 py-2 px-3 sm:px-4 text-foreground">
      {/* Native Audio Element if URL available */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Left: Indicator & Chapter Sync */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="size-8 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center shrink-0">
          <Headphones className="size-4" />
        </div>
        <div className="hidden sm:block min-w-0">
          <div className="text-xs font-serif font-bold text-foreground truncate">
            Sinkronisasi Audio & Naskah
          </div>
          <div className="text-[10px] font-mono text-muted-foreground truncate">
            Paragraf {activeParagraphIndex + 1} dari {totalParagraphs}
          </div>
        </div>
      </div>

      {/* Center: Controls & Scrubber */}
      <div className="flex-1 max-w-md flex flex-col items-center gap-1">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = Math.max(0, currentTime - 10);
              setCurrentTime(next);
              if (audioRef.current) audioRef.current.currentTime = next;
            }}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Mundur 10 Detik"
          >
            <RotateCcw className="size-3.5" />
          </Button>

          <Button
            onClick={togglePlay}
            size="sm"
            className="h-8 w-8 rounded-full p-0 bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-xs hover:brightness-110"
            aria-label={isPlaying ? "Jeda Audio" : "Putar Audio"}
          >
            {isPlaying ? (
              <Pause className="size-4 fill-current" />
            ) : (
              <Play className="size-4 fill-current ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = Math.min(totalDurationSeconds, currentTime + 10);
              setCurrentTime(next);
              if (audioRef.current) audioRef.current.currentTime = next;
            }}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Maju 10 Detik"
          >
            <FastForward className="size-3.5" />
          </Button>
        </div>

        <div className="w-full flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span className="w-9 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={totalDurationSeconds || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
            aria-label="Progres Audio"
          />
          <span className="w-9">{formatTime(totalDurationSeconds)}</span>
        </div>
      </div>

      {/* Right: Speed, Mute & Close */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={cycleSpeed}
          className="h-7 px-2 text-[11px] font-mono font-bold"
          title="Kecepatan Pemutaran"
        >
          {playbackSpeed}x
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsMuted(!isMuted);
            if (audioRef.current) audioRef.current.muted = !isMuted;
          }}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hidden sm:flex"
          title={isMuted ? "Bunyikan" : "Bisukan"}
        >
          {isMuted ? (
            <VolumeX className="size-3.5" />
          ) : (
            <Volume2 className="size-3.5" />
          )}
        </Button>

        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-full ml-1"
            title="Tutup Bilah Audio"
            aria-label="Tutup Bilah Audio"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { EnhancedAudioPlayer } from "./EnhancedAudioPlayer";
import { generateMusicUrl } from "@/lib/storage-utils";
import { Loader2 } from "lucide-react";

interface AudioPlayerWithUrlProps {
  filePath: string;
  title: string;
  className?: string;
  onDurationChange?: (duration: number) => void;
}

export function AudioPlayerWithUrl({ filePath, title, className, onDurationChange }: AudioPlayerWithUrlProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadAudioUrl() {
      if (!filePath) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const url = await generateMusicUrl(filePath);
        if (url) {
          setAudioUrl(url);
          setError(false);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Failed to generate audio URL:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadAudioUrl();
  }, [filePath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Loading audio...</span>
      </div>
    );
  }

  if (error || !audioUrl) {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground">
        <span className="text-sm">Audio unavailable</span>
      </div>
    );
  }

  return <EnhancedAudioPlayer src={audioUrl} title={title} className={className} onDurationChange={onDurationChange} />;
}
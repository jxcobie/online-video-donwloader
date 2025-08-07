// @/hooks/useVideoDownloader.ts
import { useState } from 'react';
import type { VideoInfo, DownloadRequest, DownloadResponse } from '@/types/video';

interface UseVideoDownloaderReturn {
  videoInfo: VideoInfo | null;
  isLoading: boolean;
  error: string | null;
  getVideoInfo: (url: string) => Promise<void>;
  downloadVideo: (request: DownloadRequest) => Promise<string | null>;
}

export const useVideoDownloader = (): UseVideoDownloaderReturn => {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getVideoInfo = async (url: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/video-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (result.success) {
        setVideoInfo(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch video info');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadVideo = async (request: DownloadRequest): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const result: DownloadResponse = await response.json();

      if (result.success && result.data) {
        return result.data.downloadUrl;
      } else {
        setError(result.error || 'Download failed');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    videoInfo,
    isLoading,
    error,
    getVideoInfo,
    downloadVideo,
  };
};
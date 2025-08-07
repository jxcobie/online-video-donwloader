// src/components/VideoDownloader.tsx
"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Download } from "lucide-react";

interface VideoFormat {
  format_id: string;
  format_note: string;
  ext: string;
  resolution: string;
  filesize: number | null;
  url: string;
  acodec: string;
  vcodec: string;
  fps?: number;
  tbr?: number;
  abr?: number;
  width?: number;
  height?: number;
}

interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  uploader: string;
  formats: VideoFormat[];
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Helper function to parse resolution and get numeric value for sorting
const getResolutionValue = (resolution: string): number => {
  if (!resolution || resolution === 'audio only') return 0;

  // Handle different resolution formats: "720x1366 (720p)", "570x1080 (480p)", "720p", etc.
  let match = resolution.match(/\((\d+)p\)/); // Look for (720p) pattern first
  if (match) {
    return parseInt(match[1]);
  }

  // Then try to extract height from width x height format
  match = resolution.match(/(\d+)x(\d+)/);
  if (match) {
    return parseInt(match[2]); // Use height for sorting
  }

  // Finally try standalone numbers
  match = resolution.match(/(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }

  return 0;
};

// More lenient video format validation
const isValidVideoFormat = (format: VideoFormat): boolean => {
  return (
    format.vcodec &&
    format.vcodec !== 'none' &&
    format.vcodec !== 'unknown' &&
    format.resolution &&
    format.resolution !== 'audio only' &&
    format.url &&
    format.ext &&
    ['mp4', 'webm', 'mkv', 'avi', 'flv'].includes(format.ext.toLowerCase())
  );
};

// Audio format validation
const isValidAudioFormat = (format: VideoFormat): boolean => {
  return (
    format.acodec &&
    format.acodec !== 'none' &&
    format.acodec !== 'unknown' &&
    format.url &&
    (format.resolution === 'audio only' || !format.vcodec || format.vcodec === 'none')
  );
};

export default function VideoDownloader() {
  const [url, setUrl] = useState<string>("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [selectedQuality, setSelectedQuality] = useState<string>("");
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [downloadedFileInfo, setDownloadedFileInfo] = useState<{filename: string, filesize: number} | null>(null);

  const handleFetchInfo = async () => {
    if (!url) {
      toast.error("Please enter a video URL.");
      return;
    }

    setLoading("fetching");
    setVideoInfo(null);
    setSelectedFormat("");
    setSelectedQuality("");
    setDownloadLink(null);
    setDownloadedFileInfo(null);

    try {
      const response = await fetch('/api/video-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();
      if (result.success) {
        setVideoInfo(result.data);
        toast.success("Video information fetched successfully!");
      } else {
        toast.error(result.error || "Failed to fetch video information.");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("An error occurred while fetching video information.");
    } finally {
      setLoading(null);
    }
  };

  const handleDownload = async () => {
    if (!url || !selectedQuality) {
      toast.error("Please select a quality to download.");
      return;
    }

    setLoading("downloading");
    setDownloadLink(null);
    setDownloadedFileInfo(null);

    // Enhanced progress bar component
    const ProgressToast = ({ percent, eta, speed }: { percent: number, eta?: string, speed?: number }) => (
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-medium">Downloading...</span>
          <span className="text-sm font-mono">{percent.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{eta ? `ETA: ${eta}` : ''}</span>
          <span>{speed ? `${formatBytes(speed)}/s` : ''}</span>
        </div>
      </div>
    );

    const toastId = toast.loading(
      <ProgressToast percent={0} />,
      { closeButton: true, duration: Infinity }
    );

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          formatId: selectedQuality,
          ext: selectedFormat
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start download process");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.substring(6);
              const data = JSON.parse(jsonStr);

              if (data.type === 'progress') {
                toast.loading(
                  <ProgressToast
                    percent={data.percent}
                    eta={data.eta}
                    speed={data.speed}
                  />,
                  { id: toastId }
                );
              } else if (data.type === 'done' && data.success) {
                toast.success(
                  <div className="flex flex-col">
                    <span className="font-medium">Download completed!</span>
                    <span className="text-sm text-muted-foreground">{data.filename}</span>
                  </div>,
                  { id: toastId, duration: 8000 }
                );
                setDownloadLink(data.downloadUrl);
                setDownloadedFileInfo({
                  filename: data.filename,
                  filesize: data.filesize
                });
                setLoading(null);
                reader.cancel();
                return;
              } else if (data.type === 'error') {
                throw new Error(data.message || 'Download failed');
              }
            } catch (parseError) {
              console.error("Failed to parse SSE message:", line, parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error(
        error instanceof Error ? error.message : "Download failed",
        { id: toastId }
      );
      setLoading(null);
    }
  };

  const formatOptions = useMemo(() => {
    if (!videoInfo) return [];

    const videoFormats = videoInfo.formats.filter(isValidVideoFormat);
    const audioFormats = videoInfo.formats.filter(isValidAudioFormat);
    const availableFormats = new Set<string>();

    // Add video formats
    videoFormats.forEach(f => {
      if (f.ext) availableFormats.add(f.ext);
    });

    // Always add MP3 option if there are any formats available (we can extract audio)
    if (videoInfo.formats.length > 0) {
      availableFormats.add('mp3');
    }

    return Array.from(availableFormats).sort();
  }, [videoInfo]);

  const qualityOptions = useMemo(() => {
    if (!videoInfo || !selectedFormat) return [];

    if (selectedFormat === 'mp3') {
      return [{
        format_id: 'bestaudio',
        label: 'Audio Only (~192kbps)',
        resolution: 'audio only'
      }];
    }

    // Get all video formats for the selected extension
    const validFormats = videoInfo.formats.filter(f =>
      isValidVideoFormat(f) && f.ext === selectedFormat
    );

    // Create a map to group by resolution and keep the best quality for each
    const formatMap = new Map<string, VideoFormat>();

    validFormats.forEach(f => {
      const key = f.resolution;
      const existing = formatMap.get(key);

      if (!existing) {
        formatMap.set(key, f);
      } else {
        // Prefer formats with filesize info, then higher bitrate
        const hasFilesize = f.filesize !== null && f.filesize > 0;
        const existingHasFilesize = existing.filesize !== null && existing.filesize > 0;

        if (hasFilesize && !existingHasFilesize) {
          formatMap.set(key, f);
        } else if (hasFilesize === existingHasFilesize) {
          // Both have or don't have filesize, compare by bitrate
          const fBitrate = f.tbr || 0;
          const existingBitrate = existing.tbr || 0;
          if (fBitrate > existingBitrate) {
            formatMap.set(key, f);
          }
        }
      }
    });

    const options = Array.from(formatMap.values())
      .map(f => {
        // Create better labels for quality options
        let sizeInfo = 'Size N/A';
        if (f.filesize && f.filesize > 0) {
          sizeInfo = formatBytes(f.filesize);
        } else if (f.tbr) {
          sizeInfo = `~${f.tbr.toFixed(0)}kbps`;
        }

        let qualityLabel = f.resolution;
        if (f.format_note) {
          qualityLabel += ` (${f.format_note})`;
        }

        return {
          format_id: f.format_id,
          label: `${qualityLabel} - ${sizeInfo}`,
          resolution: f.resolution,
          filesize: f.filesize
        };
      })
      .sort((a, b) => {
        const aRes = getResolutionValue(a.resolution);
        const bRes = getResolutionValue(b.resolution);
        return bRes - aRes; // Sort by resolution descending
      });

    // Add a "Best Quality" option at the top for convenience
    if (options.length > 0) {
      options.unshift({
        format_id: 'best',
        label: `Best Available Quality (${selectedFormat.toUpperCase()})`,
        resolution: 'best available'
      });
    }

    return options;
  }, [videoInfo, selectedFormat]);

  return (
    <div className="w-full max-w-2xl flex flex-col gap-6">
      {/* Input and Fetch Button */}
      <div className="flex gap-2 w-full">
        <Input
          type="text"
          placeholder="https://www.youtube.com/watch?v=... or any supported video URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-grow"
          disabled={!!loading}
        />
        <Button onClick={handleFetchInfo} disabled={!url || !!loading}>
          {loading === "fetching" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Fetch"
          )}
        </Button>
      </div>

      {/* Video Info and Download Options Card */}
      {videoInfo && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start gap-4">
            <img
              src={videoInfo.thumbnail}
              alt={videoInfo.title}
              width={160}
              height={90}
              className="rounded-lg aspect-video object-cover"
            />
            <div className="flex flex-col">
              <CardTitle className="text-lg leading-tight">
                {videoInfo.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {videoInfo.uploader}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {videoInfo.formats.length} formats available
              </p>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Format</label>
              <Select
                onValueChange={(v) => {
                  setSelectedFormat(v);
                  setSelectedQuality("");
                }}
                value={selectedFormat}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {formatOptions.map(f => (
                    <SelectItem key={f} value={f}>
                      {f.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Quality</label>
              <Select
                onValueChange={setSelectedQuality}
                value={selectedQuality}
                disabled={!selectedFormat}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  {qualityOptions.map(q => (
                    <SelectItem key={q.format_id} value={q.format_id}>
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="self-end pt-5 sm:pt-0">
              <Button
                onClick={handleDownload}
                disabled={!selectedQuality || !!loading}
                className="w-full sm:w-auto"
              >
                {loading === 'downloading' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Download Link Area */}
      {downloadLink && downloadedFileInfo && (
        <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
            Your file is ready!
          </h3>
          <p className="text-sm text-green-600 dark:text-green-300 mb-4">
            {downloadedFileInfo.filename}
          </p>
          <a
            href={downloadLink}
            download
            className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-md"
          >
            <Download className="mr-2 h-5 w-5" />
            Download ({formatBytes(downloadedFileInfo.filesize)})
          </a>
        </div>
      )}
    </div>
  );
}
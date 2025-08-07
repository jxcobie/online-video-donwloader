// @/types/video.ts
export interface VideoInfo {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  formats: VideoFormat[];
  uploader: string;
  upload_date: string;
}

export interface VideoFormat {
  format_id: string;
  format_note: string;
  ext: string;
  resolution: string;
  filesize?: number;
  url: string;
}

export interface DownloadRequest {
  url: string;
  format?: string;
  quality?: 'best' | 'worst' | string;
}

export interface DownloadResponse {
  success: boolean;
  data?: {
    downloadUrl: string;
    filename: string;
    filesize?: number;
  };
  error?: string;
}
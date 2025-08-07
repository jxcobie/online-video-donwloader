
import sys
import json
import os
import traceback
sys.path.insert(0, r'D:\\D\\work\\ORGANIZED WORK\\WEB PORTFOLIO\\Pages\\YoutubeMP4\\youtube-mp4\\yt_dlp')

try:
    from yt_dlp import YoutubeDL

    # Define constants from the request
    TARGET_URL = 'https://www.youtube.com/watch?v=nK9d09fFSyc'
    FORMAT_ID = '694'
    TARGET_EXT = 'mp4'
    IS_AUDIO_ONLY = False

    # Base configuration
    ydl_opts = {
        'outtmpl': r'D:\\D\\work\\ORGANIZED WORK\\WEB PORTFOLIO\\Pages\\YoutubeMP4\\youtube-mp4\\public\\downloads\\1754558358888_%(title)s.%(ext)s',
        'noplaylist': True,
        'restrictfilenames': True,
        'retries': 5,
        'fragment_retries': 5,
        'extract_flat': False,
        'ignoreerrors': False,
        'no_warnings': True,
        'writesubtitles': False,
        'writeautomaticsub': False,
    }

    if IS_AUDIO_ONLY:
        # Enhanced audio extraction
        print("Setting up audio extraction...", file=sys.stderr)

        # Try multiple format preferences for audio
        format_selectors = [
            'bestaudio[ext=m4a]/bestaudio[ext=aac]',
            'bestaudio[abr>=128]',
            'bestaudio',
            'best[height<=480]/best',
        ]
        ydl_opts['format'] = '/'.join(format_selectors)

        # Post-processing for MP3
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
            'nopostoverwrites': False,
        }]

        # Enhanced FFmpeg arguments for MP3
        ydl_opts['postprocessor_args'] = {
            'ffmpeg': [
                '-c:a', 'libmp3lame',
                '-q:a', '2',  # VBR quality 2 (~190kbps)
                '-b:a', '192k',  # Fallback CBR
                '-ar', '44100',  # Sample rate
                '-ac', '2',  # Stereo
                '-f', 'mp3',
                '-id3v2_version', '3',
                '-write_id3v1', '1',
                '-avoid_negative_ts', 'make_zero',
                '-fflags', '+bitexact',
                '-map_metadata', '0',
            ]
        }

        ydl_opts['prefer_ffmpeg'] = True
        ydl_opts['keepvideo'] = False

    else:
        # VIDEO DOWNLOAD WITH PROPER AUDIO MERGING
        print(f"Setting up video download for format: {TARGET_EXT}", file=sys.stderr)

        if FORMAT_ID == 'best':
            if TARGET_EXT == 'mp4':
                # For MP4, ensure we get both video and audio and merge them
                ydl_opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[ext=mp4]/best'
                ydl_opts['merge_output_format'] = 'mp4'
            else:
                # For other formats, try to get the best in that format
                ydl_opts['format'] = f'best[ext={TARGET_EXT}]/best'
        else:
            # Specific format ID requested
            if TARGET_EXT == 'mp4':
                # For MP4, always try to merge video and audio
                ydl_opts['format'] = f'{FORMAT_ID}+bestaudio[ext=m4a]/{FORMAT_ID}+bestaudio/bestvideo[format_id={FORMAT_ID}]+bestaudio/best[format_id={FORMAT_ID}]/{FORMAT_ID}'
                ydl_opts['merge_output_format'] = 'mp4'
            else:
                # For other video formats
                ydl_opts['format'] = f'{FORMAT_ID}+bestaudio/best[format_id={FORMAT_ID}]/{FORMAT_ID}/best[ext={TARGET_EXT}]/best'
                if FORMAT_ID != 'best':
                    ydl_opts['merge_output_format'] = TARGET_EXT

        # Post-processing for video to ensure proper encoding
        if TARGET_EXT == 'mp4':
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegVideoConvertor',
                'preferedformat': 'mp4',
            }]

            # FFmpeg arguments for proper MP4 encoding
            ydl_opts['postprocessor_args'] = {
                'ffmpeg': [
                    '-c:v', 'libx264',  # Video codec
                    '-c:a', 'aac',      # Audio codec
                    '-b:a', '128k',     # Audio bitrate
                    '-ar', '44100',     # Audio sample rate
                    '-ac', '2',         # Stereo audio
                    '-preset', 'fast',  # Encoding preset
                    '-crf', '23',       # Quality (lower = better)
                    '-movflags', '+faststart',  # Web optimization
                    '-avoid_negative_ts', 'make_zero',
                    '-fflags', '+bitexact',
                ]
            }

    final_filepath = None
    download_started = False

    def progress_hook(d):
        global download_started
        if d['status'] == 'downloading':
            download_started = True
            progress_str = d.get('_percent_str', '0.0%').strip().replace('%', '')
            try:
                progress = float(progress_str)
                progress_update = {
                    "type": "progress",
                    "percent": progress,
                    "eta": d.get('eta'),
                    "speed": d.get('speed')
                }
                print(json.dumps(progress_update), file=sys.stderr)
                sys.stderr.flush()
            except ValueError:
                pass
        elif d['status'] == 'finished':
            global final_filepath
            final_filepath = d['filename']
            print(f"Download finished: {final_filepath}", file=sys.stderr)

    ydl_opts['progress_hooks'] = [progress_hook]

    # Create YoutubeDL instance and attempt download
    with YoutubeDL(ydl_opts) as ydl:
        try:
            # Get video info first
            print("Extracting video information...", file=sys.stderr)
            info = ydl.extract_info(TARGET_URL, download=False)

            if not info:
                raise Exception("Could not extract video information")

            print(f"Video title: {info.get('title', 'Unknown')}", file=sys.stderr)

            # Show available formats for debugging
            available_formats = []
            for f in info.get('formats', []):
                if f.get('format_id'):
                    format_info = {
                        'id': f.get('format_id'),
                        'ext': f.get('ext'),
                        'resolution': f.get('resolution') or f'{f.get("width", "?")}x{f.get("height", "?")}',
                        'vcodec': f.get('vcodec'),
                        'acodec': f.get('acodec'),
                        'filesize': f.get('filesize')
                    }
                    available_formats.append(format_info)

            print(f"Available formats: {available_formats[:10]}", file=sys.stderr)  # Show first 10

            # For video downloads, check for audio availability
            if not IS_AUDIO_ONLY:
                has_audio_formats = any(f.get('acodec') not in ['none', None] for f in info.get('formats', []))
                print(f"Audio formats available: {has_audio_formats}", file=sys.stderr)

                if not has_audio_formats and TARGET_EXT == 'mp4':
                    print("Warning: No dedicated audio formats found, using video-only format", file=sys.stderr)

            # Attempt download
            print("Starting download...", file=sys.stderr)
            ydl.download([TARGET_URL])

        except Exception as download_error:
            print(f"Primary download failed: {str(download_error)}", file=sys.stderr)

            # Fallback strategy
            if not download_started:
                print("Attempting fallback download strategy...", file=sys.stderr)

                # Create a simplified fallback configuration
                fallback_opts = {
                    'outtmpl': r'D:\\D\\work\\ORGANIZED WORK\\WEB PORTFOLIO\\Pages\\YoutubeMP4\\youtube-mp4\\public\\downloads\\1754558358888_%(title)s.%(ext)s',
                    'noplaylist': True,
                    'restrictfilenames': True,
                    'progress_hooks': [progress_hook],
                }

                if IS_AUDIO_ONLY:
                    fallback_opts['format'] = 'bestaudio/best'
                    fallback_opts['postprocessors'] = [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': '128',
                    }]
                else:
                    # For video, try simpler format selection
                    if TARGET_EXT == 'mp4':
                        fallback_opts['format'] = 'best[ext=mp4]/best'
                    else:
                        fallback_opts['format'] = f'best[ext={TARGET_EXT}]/best'

                with YoutubeDL(fallback_opts) as fallback_ydl:
                    fallback_ydl.download([TARGET_URL])
            else:
                raise download_error

    # Handle file location after download
    if final_filepath:
        # Check if file exists at the reported location
        if not os.path.exists(final_filepath):
            # For audio conversion, the extension changes
            if IS_AUDIO_ONLY:
                base, _ = os.path.splitext(final_filepath)
                final_filepath = base + '.mp3'

            # If still not found, search the downloads directory
            if not os.path.exists(final_filepath):
                downloads_dir = r'D:\\D\\work\\ORGANIZED WORK\\WEB PORTFOLIO\\Pages\\YoutubeMP4\\youtube-mp4\\public\\downloads'
                files = os.listdir(downloads_dir)

                # Find the most recent file with our timestamp
                matching_files = [f for f in files if f.startswith('1754558358888_')]
                if matching_files:
                    # Sort by modification time and take the most recent
                    matching_files.sort(key=lambda x: os.path.getmtime(os.path.join(downloads_dir, x)), reverse=True)
                    final_filepath = os.path.join(downloads_dir, matching_files[0])
                    print(f"Found file via directory search: {final_filepath}", file=sys.stderr)

        if os.path.exists(final_filepath):
            filename = os.path.basename(final_filepath)
            filesize = os.path.getsize(final_filepath)

            print(f"Successfully processed file: {filename} ({filesize} bytes)", file=sys.stderr)

            result = {
                'success': True,
                'filename': filename,
                'filesize': filesize,
                'downloadUrl': f'/api/serve-file/{filename}'
            }
            print(json.dumps(result))
        else:
            error_result = {
                'success': False,
                'error': f'Download completed but file not found. Searched: {final_filepath}'
            }
            print(json.dumps(error_result))
    else:
        error_result = {
            'success': False,
            'error': 'No file was downloaded - the video may not be available or the format is not supported'
        }
        print(json.dumps(error_result))

except Exception as e:
    error_result = {
        'success': False,
        'error': f'Download failed: {str(e)}'
    }
    print(json.dumps(error_result))
    sys.exit(1)

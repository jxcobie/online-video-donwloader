import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { url }: { url: string } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const ytDlpPath = path.join(process.cwd(), 'yt_dlp');
    const pythonScript = `
import sys
import json
import os
sys.path.insert(0, r'${ytDlpPath.replace(/\\/g, '\\\\')}')

try:
    from yt_dlp import YoutubeDL

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'format_sort': ['res', 'ext:mp4:m4a', 'proto'],
    }

    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info('${url}', download=False)

        # Format the output
        result = {
            'id': info.get('id', ''),
            'title': info.get('title', ''),
            'duration': info.get('duration', 0),
            'thumbnail': info.get('thumbnail', ''),
            'uploader': info.get('uploader', ''),
            'upload_date': info.get('upload_date', ''),
            'formats': []
        }

        if 'formats' in info and info['formats']:
            seen_formats = set()

            for fmt in info['formats']:
                if not fmt.get('url'):
                    continue

                # Create a unique key for this format to avoid duplicates
                format_key = (
                    fmt.get('format_id', ''),
                    fmt.get('ext', ''),
                    fmt.get('resolution', ''),
                    fmt.get('vcodec', ''),
                    fmt.get('acodec', '')
                )

                if format_key in seen_formats:
                    continue
                seen_formats.add(format_key)

                # Get format properties
                vcodec = fmt.get('vcodec', 'none')
                acodec = fmt.get('acodec', 'none')
                ext = fmt.get('ext', '')
                resolution = fmt.get('resolution', '')
                width = fmt.get('width')
                height = fmt.get('height')

                # Create better resolution string for YouTube Shorts and regular videos
                if width and height:
                    if height >= 1080:
                        quality_label = f"{width}x{height} (1080p+)"
                    elif height >= 720:
                        quality_label = f"{width}x{height} (720p)"
                    elif height >= 480:
                        quality_label = f"{width}x{height} (480p)"
                    elif height >= 360:
                        quality_label = f"{width}x{height} (360p)"
                    elif height >= 240:
                        quality_label = f"{width}x{height} (240p)"
                    else:
                        quality_label = f"{width}x{height} (144p)"
                elif resolution:
                    quality_label = resolution
                else:
                    quality_label = 'unknown'

                # More lenient filtering - include more formats
                should_include = False

                # Video formats
                if (vcodec and vcodec not in ['none', 'unknown'] and
                    ext in ['mp4', 'webm', 'mkv', 'avi', 'flv', 'mov', '3gp'] and
                    quality_label != 'audio only'):
                    should_include = True

                # Audio formats
                elif (acodec and acodec not in ['none', 'unknown'] and
                      (ext in ['m4a', 'mp3', 'webm', 'ogg', 'aac', 'opus', 'wav'] or
                       quality_label == 'audio only' or
                       vcodec == 'none')):
                    should_include = True

                # Also include formats that might be useful even if they don't fit above criteria
                # but have valid codecs and extensions
                elif (fmt.get('format_id') and ext and
                      (vcodec not in ['none', 'unknown', None] or acodec not in ['none', 'unknown', None])):
                    should_include = True

                if should_include:
                    # Try to get estimated filesize if not available
                    filesize = fmt.get('filesize')
                    if not filesize and fmt.get('tbr') and fmt.get('duration'):
                        # Rough estimate: bitrate * duration / 8 (convert bits to bytes)
                        estimated_size = int((fmt.get('tbr') * 1000 * fmt.get('duration', 0)) / 8)
                        filesize = estimated_size if estimated_size > 0 else None

                    format_info = {
                        'format_id': fmt.get('format_id', ''),
                        'format_note': fmt.get('format_note', ''),
                        'ext': ext,
                        'resolution': quality_label if quality_label != 'audio only' else 'audio only',
                        'filesize': filesize,
                        'url': fmt.get('url', ''),
                        'acodec': acodec,
                        'vcodec': vcodec,
                        'fps': fmt.get('fps'),
                        'tbr': fmt.get('tbr'),
                        'abr': fmt.get('abr'),
                        'width': width,
                        'height': height
                    }
                    result['formats'].append(format_info)

            # Sort formats by quality (video formats first, then audio)
            def format_sort_key(fmt):
                # Audio only formats
                if fmt['resolution'] == 'audio only' or fmt['vcodec'] == 'none':
                    return (0, fmt.get('abr', 0) or fmt.get('tbr', 0))
                else:
                    # Video formats - try to extract resolution for sorting
                    try:
                        resolution = fmt['resolution']
                        if 'x' in resolution:
                            # Format like "720x1366" - use height (second number)
                            height = int(resolution.split('x')[-1])
                        elif 'p' in resolution:
                            # Format like "720p"
                            height = int(resolution.replace('p', ''))
                        elif resolution.isdigit():
                            height = int(resolution)
                        else:
                            height = 0
                        return (1, height, fmt.get('tbr', 0))
                    except (ValueError, AttributeError):
                        return (1, 0, fmt.get('tbr', 0))

            result['formats'].sort(key=format_sort_key, reverse=True)

        # Print result to stdout
        print(json.dumps(result))

except Exception as e:
    # Print error to stdout as well (not stderr)
    error_result = {'error': str(e)}
    print(json.dumps(error_result))
    sys.exit(1)
`;

    const tempScript = path.join(process.cwd(), 'temp_extract.py');
    const fs = require('fs');
    fs.writeFileSync(tempScript, pythonScript);

    try {
      const { stdout, stderr } = await execAsync(
        `"D:/D/work/ORGANIZED WORK/WEB PORTFOLIO/Pages/YoutubeMP4/youtube-mp4/venv/Scripts/python.exe" "${tempScript}"`,
        { timeout: 30000, cwd: process.cwd() }
      );

      fs.unlinkSync(tempScript);

      console.log('Python stdout:', stdout);
      console.log('Python stderr:', stderr);

      if (!stdout || !stdout.trim()) {
        console.error('Empty stdout from Python script');
        return NextResponse.json(
          { success: false, error: 'No output from video extraction script' },
          { status: 500 }
        );
      }

      let result;
      try {
        result = JSON.parse(stdout.trim());
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw stdout:', stdout);
        return NextResponse.json(
          { success: false, error: 'Invalid response from video extraction script' },
          { status: 500 }
        );
      }

      if (result.error) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data: result });

    } catch (execError: any) {
      if (fs.existsSync(tempScript)) {
        fs.unlinkSync(tempScript);
      }

      console.error('Execution error:', execError);

      if (execError.killed && execError.signal === 'SIGTERM') {
        return NextResponse.json(
          { success: false, error: 'Request timeout - the video URL may be invalid or unavailable' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: false, error: `Script execution failed: ${execError.message}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Video info error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
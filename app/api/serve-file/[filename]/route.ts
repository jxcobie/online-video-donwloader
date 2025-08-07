// app/api/serve-file/[filename]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs'; // Use standard fs for createReadStream
import { stat } from 'fs/promises'; // Use fs/promises for async stat
import mime from 'mime-types'; // Needed for content type detection

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;
  if (!filename) {
    return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
  }

  try {
    const downloadsDir = path.join(process.cwd(), 'public', 'downloads');
    const filePath = path.join(downloadsDir, filename);

    // Use stat to check file existence and get size
    const fileStat = await stat(filePath);

    // Create a readable stream from the file
    const fileStream = fs.createReadStream(filePath);

    // Determine the content type from the filename
    const contentType = mime.lookup(filename) || 'application/octet-stream';

    // Create the Next.js Response with the file stream and headers
    const response = new NextResponse(fileStream as any, { // Type assertion as ReadableStream is compatible
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStat.size.toString(),
        'Content-Disposition': `attachment; filename="${filename}"`, // Forces browser to download
      },
    });

    return response;

  } catch (error) {
    console.error(`Error serving file ${filename}:`, error);
    // Return 404 if file not found (stat throws error) or other issues
    return NextResponse.json({ error: 'File not found or inaccessible.' }, { status: 404 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import {
  renderSingleFrameServer as renderSingleFrame,
  renderAllFramesServer as renderAllFrames,
  renderCharacterTurnaroundsServer as renderCharacterTurnarounds
} from '@/lib/render/serverFrameRenderer';
import { generateImageViaServerCli } from '@/lib/render/serverCliGenerator';
import { getIPById } from '@/lib/db/fileDb.server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { frame, frames, ipId, stylePreset, characterIP, type, providerId, mode, referenceImageUrl, prompt, width, height } = body;

    // Direct image generation using Antigravity CLI Engine (agy -p)
    if (type === 'direct_prompt' || prompt) {
      const promptText = prompt || (frame ? frame.visualPrompt : 'Cute character');
      const count = body.count ? parseInt(body.count, 10) : 1;
      const refImg = referenceImageUrl || body.referenceImage || undefined;
      const result = await generateImageViaServerCli(promptText, {
        width: width || 600,
        height: height || 800,
        count,
        referenceImageUrl: refImg
      });
      return NextResponse.json(result);
    }

    // Support character turnaround rendering
    if (type === 'turnarounds' || characterIP) {
      const ipToRender = characterIP || (ipId ? getIPById(ipId) : null);
      if (ipToRender) {
        const turnarounds = await renderCharacterTurnarounds(ipToRender);
        return NextResponse.json({ success: true, ...turnarounds });
      }
    }

    let ipProfile;
    if (ipId) {
      ipProfile = getIPById(ipId);
    }

    if (frame) {
      const rendered = await renderSingleFrame(frame, ipProfile, stylePreset, mode, referenceImageUrl);
      return NextResponse.json({ success: true, frame: rendered });
    }

    if (frames && Array.isArray(frames)) {
      const renderedList = await renderAllFrames(frames, ipProfile, stylePreset, mode);
      return NextResponse.json({ success: true, frames: renderedList });
    }

    return NextResponse.json({ success: false, error: 'Invalid render request' }, { status: 400 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

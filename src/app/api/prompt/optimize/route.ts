import { NextRequest, NextResponse } from 'next/server';
import { compileDiffusionPrompt, translateAndRefineChinesePrompt } from '@/lib/i18n/promptTranslator';
import { buildDiffusionPromptString } from '@/lib/render/imageEngine';
import { IPProfile, StylePreset } from '@/types';

/**
 * Professional AI Diffusion Prompt Optimizer & Translator Endpoint
 * Leverages intelligent prompt engineering protocols to convert raw Chinese storyboard
 * descriptions into cinematic, high-detail English image generation prompts.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      visualPrompt,
      ipProfile,
      stylePreset = '3D Clay',
      mode = 'text-to-image'
    } = body;

    if (!visualPrompt || !visualPrompt.trim()) {
      return NextResponse.json({ success: false, error: 'visualPrompt is required' }, { status: 400 });
    }

    const isImg2Img = mode === 'image-to-image';
    const cleanStyle = (stylePreset || ipProfile?.stylePreset || '3D Clay') as StylePreset;

    // 1. High-precision semantic translation of Chinese scene directives
    const scenePromptEn = translateAndRefineChinesePrompt(visualPrompt);

    // 2. Full diffusion prompt compilation
    const { promptEn: compiledPrompt, negativePrompt } = compileDiffusionPrompt(
      visualPrompt,
      ipProfile,
      cleanStyle
    );

    // 3. Assemble target prompt according to generation mode
    let optimizedPrompt = '';
    if (isImg2Img) {
      optimizedPrompt = `${scenePromptEn}, featuring the character from the reference image, in ${cleanStyle} style, single standalone image, single frame, no split screen, no grid, no multi-panel, no comic strip, no speech bubbles, no text, 3:4 vertical portrait aspect ratio composition, expressive action scene, masterpiece, best quality`;
    } else {
      optimizedPrompt = compiledPrompt || buildDiffusionPromptString(visualPrompt, ipProfile, cleanStyle);
    }

    return NextResponse.json({
      success: true,
      promptEn: optimizedPrompt,
      negativePrompt,
      scenePromptEn,
      mode: isImg2Img ? 'image-to-image' : 'text-to-image'
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

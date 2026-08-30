import { StoryboardFrame, IPProfile, StylePreset, GenerationMode } from '@/types';
import { compileDiffusionPrompt, translateAndRefineChinesePrompt } from '@/lib/i18n/promptTranslator';
import { buildDiffusionPromptString } from '@/lib/render/imageEngine';
import { generateImageViaServerCli } from '@/lib/render/serverCliGenerator';

/**
 * Server-side frame renderers: call the CLI generator directly.
 * (Previously these lived in imageEngine.ts and looped back through
 * fetch('/api/render'), which fails on the server with a relative URL.)
 */

export async function renderCharacterTurnaroundsServer(
  ip: IPProfile
): Promise<{
  avatarUrl: string;
  turnaroundSheets: { front: string; side: string; back: string };
  expressionSheets: Array<{ emotion: string; imageUrl: string }>;
}> {
  const mkPrompt = (view: 'front' | 'side' | 'back') =>
    buildDiffusionPromptString(
      `character reference sheet, ${view} view, full body, neutral pose, plain background`,
      ip,
      ip.stylePreset,
      view
    );

  const [front, side, back] = await Promise.all([
    generateImageViaServerCli(mkPrompt('front'), { width: 450, height: 600, ipName: ip.name }),
    generateImageViaServerCli(mkPrompt('side'), { width: 450, height: 600, ipName: ip.name }),
    generateImageViaServerCli(mkPrompt('back'), { width: 450, height: 600, ipName: ip.name })
  ]);

  const emotions = ['happy', 'panic'];
  const expressionSheets = await Promise.all(
    emotions.map(async (emotion) => {
      const r = await generateImageViaServerCli(
        buildDiffusionPromptString(
          `expression close-up, ${emotion} expression`,
          ip,
          ip.stylePreset,
          'front'
        ),
        { width: 450, height: 600, ipName: ip.name }
      );
      return { emotion, imageUrl: r.imageUrls[0] || '' };
    })
  );

  const frontUrl = front.imageUrls[0] || '';
  return {
    avatarUrl: frontUrl,
    turnaroundSheets: {
      front: frontUrl,
      side: side.imageUrls[0] || '',
      back: back.imageUrls[0] || ''
    },
    expressionSheets
  };
}

import { updateStoryFrameOnServer } from '@/lib/db/fileDb.server';

export async function renderSingleFrameServer(
  frame: StoryboardFrame,
  ipProfile?: IPProfile,
  stylePreset: StylePreset = '3D Clay',
  mode: GenerationMode = 'text-to-image',
  referenceImageUrl?: string,
  storyId?: string
): Promise<StoryboardFrame> {
  const baseImage = referenceImageUrl || ipProfile?.avatarUrl || ipProfile?.turnaroundSheets?.front || ipProfile?.assets?.[0]?.url;
  const isImg2Img = Boolean(baseImage);

  // Clean English translation of the scene composition description
  const scenePrompt = translateAndRefineChinesePrompt(frame.visualPrompt) || frame.visualPrompt;
  const { promptEn } = compileDiffusionPrompt(frame.visualPrompt, ipProfile, stylePreset);

  const dynamicTargetPrompt = isImg2Img
    ? `${scenePrompt}, featuring the character from the reference image, in ${stylePreset} style, single standalone image, single frame, no split screen, no grid, no multi-panel, no comic strip, no speech bubbles, no text, 3:4 vertical portrait aspect ratio composition, expressive action scene, masterpiece, best quality`
    : (promptEn || buildDiffusionPromptString(frame.visualPrompt, ipProfile, stylePreset));

  // Determine if frame.visualPromptEn has genuine custom scene prompt or is stale/generic portrait
  let fullPrompt = frame.visualPromptEn;
  const sceneCore = scenePrompt.split(',')[0].trim();
  const isGenericOrStale = !fullPrompt || 
                           !fullPrompt.trim() || 
                           (sceneCore && !fullPrompt.includes(sceneCore));

  if (isGenericOrStale) {
    fullPrompt = dynamicTargetPrompt;
  }

  const result = await generateImageViaServerCli(fullPrompt, {
    width: 450,
    height: 600,
    ipName: ipProfile?.name,
    referenceImageUrl: baseImage
  });
  const imageUrl = result.imageUrls[0] || '';
  const status: 'completed' | 'error' = imageUrl ? 'completed' : 'error';

  const updatedFrame: StoryboardFrame = {
    ...frame,
    visualPromptEn: fullPrompt,
    imageUrl,
    status,
    logId: result.logId,
    lastError: result.error
  };

  // Instant DB Persistence: Save frame to disk immediately upon generation
  try {
    updateStoryFrameOnServer(storyId, frame.id, {
      imageUrl,
      visualPromptEn: fullPrompt,
      status,
      logId: result.logId,
      lastError: result.error
    });
  } catch (err) {
    console.error('Failed to auto-persist rendered frame to disk:', err);
  }

  return updatedFrame;
}

export async function renderAllFramesServer(
  frames: StoryboardFrame[],
  ipProfile?: IPProfile,
  stylePreset: StylePreset = '3D Clay',
  mode: GenerationMode = 'text-to-image',
  referenceImageUrl?: string,
  storyId?: string
): Promise<StoryboardFrame[]> {
  const baseImage = referenceImageUrl || ipProfile?.avatarUrl || ipProfile?.turnaroundSheets?.front || ipProfile?.assets?.[0]?.url;
  const effectiveMode = baseImage ? 'image-to-image' : mode;

  // Use sequential pipeline execution to prevent process race conditions & API 429 quota exhaustion
  const renderedList: StoryboardFrame[] = [];
  for (const frame of frames) {
    const rendered = await renderSingleFrameServer(
      frame,
      ipProfile,
      stylePreset,
      effectiveMode,
      baseImage,
      storyId
    );
    renderedList.push(rendered);
  }

  return renderedList;
}

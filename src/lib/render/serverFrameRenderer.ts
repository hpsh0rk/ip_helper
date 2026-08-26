import { StoryboardFrame, IPProfile, StylePreset, GenerationMode } from '@/types';
import { compileDiffusionPrompt } from '@/lib/i18n/promptTranslator';
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

export async function renderSingleFrameServer(
  frame: StoryboardFrame,
  ipProfile?: IPProfile,
  stylePreset: StylePreset = '3D Clay',
  mode: GenerationMode = 'text-to-image',
  referenceImageUrl?: string
): Promise<StoryboardFrame> {
  const { promptEn } = compileDiffusionPrompt(frame.visualPrompt, ipProfile, stylePreset);

  let fullPrompt = buildDiffusionPromptString(
    frame.visualPromptEn || promptEn || frame.visualPrompt,
    ipProfile,
    stylePreset,
    frame.frameNumber % 2 === 0 ? 'side' : 'front'
  );

  if (mode === 'image-to-image' && (referenceImageUrl || ipProfile?.avatarUrl)) {
    fullPrompt = `character consistency lock with reference image, ${fullPrompt}`;
  }

  const result = await generateImageViaServerCli(fullPrompt, {
    width: 450,
    height: 600,
    ipName: ipProfile?.name,
    referenceImageUrl: mode === 'image-to-image' ? referenceImageUrl || ipProfile?.avatarUrl : undefined
  });
  const imageUrl = result.imageUrls[0] || '';

  return {
    ...frame,
    visualPromptEn: promptEn,
    imageUrl,
    status: imageUrl ? 'completed' : 'error'
  };
}

export async function renderAllFramesServer(
  frames: StoryboardFrame[],
  ipProfile?: IPProfile,
  stylePreset: StylePreset = '3D Clay',
  mode: GenerationMode = 'text-to-image'
): Promise<StoryboardFrame[]> {
  return Promise.all(
    frames.map((frame) => renderSingleFrameServer(frame, ipProfile, stylePreset, mode, ipProfile?.avatarUrl))
  );
}

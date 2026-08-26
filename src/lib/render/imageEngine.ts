import { StoryboardFrame, IPProfile, StylePreset, ImageModelProviderId, GenerationMode } from '@/types';
import { compileDiffusionPrompt, translateAndRefineChinesePrompt } from '@/lib/i18n/promptTranslator';
import { generateImageViaCli } from '@/lib/render/cliImageGenerator';

/**
 * Cleanly translates Chinese character DNA into pure English visual keywords
 */
export function translateCharacterVisualKeywords(ip?: IPProfile): string[] {
  if (!ip) return [];
  const list: string[] = [];

  const nameLower = ip.name.toLowerCase();
  if (nameLower.includes('柴犬') || nameLower.includes('shiba') || nameLower.includes('波波') || nameLower.includes('阿柴')) {
    list.push('anthropomorphic cute chubby Shiba Inu dog character');
  } else if (nameLower.includes('猫') || nameLower.includes('cat') || nameLower.includes('七七')) {
    list.push('anthropomorphic cute cat character');
  } else if (nameLower.includes('机械') || nameLower.includes('雷克') || nameLower.includes('薇拉') || nameLower.includes('cyber')) {
    list.push('futuristic cyberpunk mechanic delivery character');
  } else {
    list.push(`character named ${ip.name}`);
  }

  const textToTranslate = [
    ip.archetype,
    ip.visualAnchors?.hair,
    ip.visualAnchors?.clothing,
    ip.visualAnchors?.accessories,
    ip.visualAnchors?.distinctiveFeatures
  ].filter(Boolean).join(' ');

  const dict: Record<string, string> = {
    '草帽': 'wearing a yellow woven straw hat',
    '背带裤': 'wearing blue denim overalls',
    '衬衫': 'plaid shirt underneath',
    '拖拉机': 'farming elements',
    '农场主': 'country farmer aesthetic',
    '金黄': 'golden fur with white markings',
    '围裙': 'leather barista apron',
    '眼镜': 'round retro spectacles',
    '咖啡': 'coffee shop theme',
    '霓虹': 'neon glowing highlights',
    '机能': 'cyberpunk tactical jacket'
  };

  for (const [zh, en] of Object.entries(dict)) {
    if (textToTranslate.includes(zh)) {
      list.push(en);
    }
  }

  return list;
}

/**
 * Builds high-fidelity AI Diffusion prompts with pure English tokens
 */
export function buildDiffusionPromptString(
  basePrompt: string,
  ipProfile?: IPProfile,
  stylePreset: StylePreset = '3D Clay',
  angle?: 'front' | 'side' | 'back',
  emotion?: string
): string {
  const styleKeywordsMap: Record<StylePreset, string> = {
    '3D Clay': 'masterpiece, best quality, 3d claymation style, pop mart blind box toy, soft clay texture, soft studio lighting, octane render, 8k resolution',
    'Anime': 'masterpiece, best quality, vibrant Japanese anime aesthetic, Makoto Shinkai style lighting, crisp line art, atmospheric bokeh, 8k',
    'Cyberpunk': 'masterpiece, best quality, cyberpunk 2077 aesthetic, volumetric neon lighting, cinematic night city, dark atmosphere, unreal engine 5, 8k',
    'Ghibli Watercolor': 'masterpiece, best quality, Studio Ghibli inspired, lush hand-painted watercolor textures, warm sunlight, Hayao Miyazaki aesthetic',
    'Retro Comic': 'masterpiece, best quality, vintage retro comic book style, pop art, halftones, bold ink outlines, dynamic comic panel',
    'Chibi 2D': 'masterpiece, best quality, super cute chibi 2D illustration, kawaii, big sparkling eyes, pastel colors, clean sticker art'
  };

  const stylePrefix = styleKeywordsMap[stylePreset] || styleKeywordsMap['3D Clay'];
  const characterTokens = translateCharacterVisualKeywords(ipProfile);

  let angleDetail = '';
  if (angle === 'front') {
    angleDetail = 'character design sheet front view, facing camera directly, centered composition, full body standing';
  } else if (angle === 'side') {
    angleDetail = 'character design sheet side profile view, 90 degrees side angle, full body standing';
  } else if (angle === 'back') {
    angleDetail = 'character design sheet back view, seen from behind 180 degrees, back of head, facing away from camera, showing back of costume and backpack, no face visible';
  }

  const parts = [
    stylePrefix,
    characterTokens.join(', '),
    basePrompt,
    angleDetail,
    emotion ? `expression: ${emotion}` : '',
    '3:4 portrait aspect ratio, highly detailed, perfect studio lighting'
  ].filter(Boolean);

  return parts.join(', ');
}

export function generateDiffusionImageURL(
  prompt: string,
  width: number = 450,
  height: number = 600,
  seed?: number
): string {
  const refinedPrompt = translateAndRefineChinesePrompt(prompt);
  const cleanPrompt = encodeURIComponent(refinedPrompt.slice(0, 800));
  const finalSeed = seed !== undefined ? seed : Math.floor(Math.random() * 999999);
  return `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&nologo=true&seed=${finalSeed}&model=flux`;
}

/**
 * Fetches image using Antigravity CLI native generator
 */
export async function fetchDiffusionAsBase64(
  prompt: string,
  width: number = 450,
  height: number = 600,
  seed?: number
): Promise<string> {
  return generateImageViaCli(prompt, { width, height });
}

/**
 * Renders Character Turnaround Sheets
 */
export async function renderCharacterTurnarounds(
  ip: IPProfile,
  providerId: ImageModelProviderId = 'antigravity-cli'
): Promise<{
  avatarUrl: string;
  turnaroundSheets: { front: string; side: string; back: string };
  expressionSheets: Array<{ emotion: string; imageUrl: string }>;
}> {
  const seedBase = Math.abs(
    ip.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 100)
  );

  const frontPrompt = buildDiffusionPromptString('character turnaround concept sheet', ip, ip.stylePreset, 'front', 'confident happy smile');
  const sidePrompt = buildDiffusionPromptString('character turnaround concept sheet', ip, ip.stylePreset, 'side', 'calm side profile');
  const backPrompt = buildDiffusionPromptString('character turnaround concept sheet', ip, ip.stylePreset, 'back');

  const frontBase64 = await fetchDiffusionAsBase64(frontPrompt, 450, 600, seedBase);
  const sideBase64 = await fetchDiffusionAsBase64(sidePrompt, 450, 600, seedBase + 1);
  const backBase64 = await fetchDiffusionAsBase64(backPrompt, 450, 600, seedBase + 2);

  const expressions = [
    { emotion: '元气微笑', imageUrl: frontBase64 },
    { emotion: '惊慌翻车', imageUrl: generateDiffusionImageURL(buildDiffusionPromptString('close-up portrait', ip, ip.stylePreset, 'front', 'funny shocked panic expression, comical sweat drop'), 300, 300, seedBase + 10) },
    { emotion: '认真专注', imageUrl: generateDiffusionImageURL(buildDiffusionPromptString('close-up portrait', ip, ip.stylePreset, 'front', 'serious focused intense determined expression'), 300, 300, seedBase + 20) },
    { emotion: '享受治愈', imageUrl: generateDiffusionImageURL(buildDiffusionPromptString('close-up portrait', ip, ip.stylePreset, 'front', 'wholesome cozy peaceful healing smile'), 300, 300, seedBase + 30) }
  ];

  return {
    avatarUrl: frontBase64,
    turnaroundSheets: {
      front: frontBase64,
      side: sideBase64,
      back: backBase64
    },
    expressionSheets: expressions
  };
}

/**
 * Renders a single 3:4 storyboard frame supporting both Text-to-Image and Image-to-Image
 */
export async function renderSingleFrame(
  frame: StoryboardFrame,
  ipProfile?: IPProfile,
  stylePreset: StylePreset = '3D Clay',
  mode: GenerationMode = 'text-to-image',
  referenceImageUrl?: string
): Promise<StoryboardFrame> {
  const { promptEn } = compileDiffusionPrompt(frame.visualPrompt, ipProfile, stylePreset);
  const seed = Math.floor(Math.random() * 999999);

  // If Image-to-Image mode is active and we have reference image
  let fullPrompt = buildDiffusionPromptString(
    frame.visualPromptEn || promptEn || frame.visualPrompt,
    ipProfile,
    stylePreset,
    frame.frameNumber % 2 === 0 ? 'side' : 'front'
  );

  if (mode === 'image-to-image' && (referenceImageUrl || ipProfile?.avatarUrl)) {
    fullPrompt = `character consistency lock with reference image, ${fullPrompt}`;
  }

  const imageUrl = await fetchDiffusionAsBase64(fullPrompt, 450, 600, seed);

  return {
    ...frame,
    visualPromptEn: promptEn,
    imageUrl,
    status: imageUrl ? 'completed' : 'error'
  };
}

/**
 * Batch renders all frames
 */
export async function renderAllFrames(
  frames: StoryboardFrame[],
  ipProfile?: IPProfile,
  stylePreset: StylePreset = '3D Clay',
  mode: GenerationMode = 'text-to-image'
): Promise<StoryboardFrame[]> {
  return Promise.all(
    frames.map(frame => renderSingleFrame(frame, ipProfile, stylePreset, mode, ipProfile?.avatarUrl))
  );
}

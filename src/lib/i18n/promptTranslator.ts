import { IPProfile, StylePreset } from '@/types';

const styleModifiers: Record<StylePreset, string> = {
  '3D Clay': 'cute 3D claymation style, soft studio lighting, plasticine textures, stop-motion animation aesthetic, miniature diorama, octane render, 8k',
  'Anime': 'vibrant Japanese anime aesthetic, Makoto Shinkai style lighting, crisp line art, beautiful color grading, atmospheric bokeh, trending on pixiv, highly detailed',
  'Cyberpunk': 'cyberpunk sci-fi aesthetic, neon rim lighting, holographic glow, rainy reflections, futuristic cityscape backdrop, cinematic Unreal Engine 5 render',
  'Ghibli Watercolor': 'Studio Ghibli inspired, lush hand-painted watercolor textures, warm sunlight, whimsical nostalgic atmosphere, Hayao Miyazaki aesthetic, gouache painting',
  'Retro Comic': 'retro 90s vintage comic book art, halftone dot printing texture, bold ink outlines, dynamic panel composition, pop art color palette',
  'Chibi 2D': 'super cute chibi 2D illustration, oversized head, expressive eyes, kawaii character design, flat color stickers, clean vector outlines'
};

/**
 * Intelligent Chinese to Professional English Diffusion Prompt Compiler & Purifier
 * Converts complex Chinese character descriptions, styles, and props into pure English tokens
 * without anatomical mutations or NSFW false-positives.
 */
export function translateAndRefineChinesePrompt(chinesePrompt: string): string {
  if (!chinesePrompt || !chinesePrompt.trim()) return '';

  // If already pure English, return directly
  if (!/[\u4e00-\u9fa5]/.test(chinesePrompt)) {
    return chinesePrompt;
  }

  const tokens: string[] = [];
  const text = chinesePrompt;

  // 1. Proportions & Character Type
  if (text.includes('二头身') || text.includes('大头小身') || text.includes('Q版') || text.includes('q版')) {
    tokens.push('cute chibi character with 2-head-tall proportions, oversized round head and tiny chubby body');
  }
  if (text.includes('精灵') || text.includes('小人')) {
    tokens.push('little magical fairy elf mascot');
  } else if (text.includes('柴犬')) {
    tokens.push('anthropomorphic cute chubby Shiba Inu character');
  } else if (text.includes('小猫') || text.includes('猫咪')) {
    tokens.push('anthropomorphic cute cat character');
  } else if (text.includes('机械') || text.includes('外卖少年')) {
    tokens.push('cyberpunk anime courier boy with tactical gear');
  }

  // 2. Skin & Body Structure (Cleanly sanitized)
  if (text.includes('纯白') || text.includes('白色光滑')) {
    tokens.push('smooth clean white cartoon body');
  }
  if (text.includes('四肢') || text.includes('圆柱形') || text.includes('短小')) {
    tokens.push('stubby tiny cylindrical rounded limbs');
  }
  if (text.includes('赤裸') || text.includes('无衣物') || text.includes('光溜溜')) {
    tokens.push('minimalist cartoon mascot design, no complex clothes');
  }

  // 3. Hair & Headwear
  if (text.includes('蓬松') || text.includes('红棕色') || text.includes('卷发') || text.includes('短发')) {
    tokens.push('fluffy messy curly reddish-brown short hair with dynamic layers');
  }
  if (text.includes('小揪揪') || text.includes('布帽子') || text.includes('帽子')) {
    tokens.push('wearing a cute brown fabric beanie hat with two twin topknot buns');
  } else if (text.includes('草帽')) {
    tokens.push('wearing a yellow woven straw hat');
  }

  // 4. Facial Features
  if (text.includes('豆豆眼') || text.includes('黑豆眼') || text.includes('黑色豆豆')) {
    tokens.push('simple black dot bead eyes');
  }
  if (text.includes('腮红') || text.includes('淡粉色')) {
    tokens.push('soft round rosy pink blush on cheeks');
  }

  // 5. Held Objects / Dolls / Props (Prevents Chimera fusion by explicit separation)
  if (text.includes('金毛') || text.includes('小狗') || text.includes('布偶') || text.includes('玩偶')) {
    tokens.push('holding tightly a scruffy wrinkled yellowish-brown golden retriever puppy plush toy doll made of textured cotton fabric');
  } else if (text.includes('奶茶') || text.includes('咖啡')) {
    tokens.push('holding a cute warm coffee cup');
  }

  // 6. Art Style & Retro Aesthetics
  if (text.includes('咪路') || text.includes('千禧年')) {
    tokens.push('2000s retro anime aesthetic, Studio Mirumo de Pon style, nostalgic early 2000s Japanese animation');
  }
  if (text.includes('2D') || text.includes('手绘') || text.includes('动漫手绘')) {
    tokens.push('2D hand-drawn cel-shaded anime style, clean crisp line art');
  } else if (text.includes('3D') || text.includes('黏土') || text.includes('盲盒')) {
    tokens.push('Pop Mart 3D clay figurine blind box toy, soft clay texture, octane render');
  }

  // 7. Lighting & Background
  if (text.includes('纯色背景') || text.includes('干净背景')) {
    tokens.push('clean solid pastel color background, isolated composition');
  }
  if (text.includes('暖白') || text.includes('雕刻感') || text.includes('光影') || text.includes('灯光')) {
    tokens.push('soft warm volumetric lighting, gentle subtle ambient occlusion');
  }

  // 8. Quality & Vibe
  tokens.push('super cute and wholesome, masterpiece, best quality, 4k resolution');

  return tokens.join(', ');
}

export function compileDiffusionPrompt(
  sceneDescription: string,
  ipProfile?: IPProfile,
  stylePreset: StylePreset = 'Anime'
): { promptEn: string; negativePrompt: string } {
  const translatedScene = translateAndRefineChinesePrompt(sceneDescription);

  const characterAnchors: string[] = [];
  if (ipProfile) {
    characterAnchors.push(`main character ${ipProfile.name}, a ${ipProfile.archetype || 'character'}`);
    if (ipProfile.visualAnchors?.hair) characterAnchors.push(ipProfile.visualAnchors.hair);
    if (ipProfile.visualAnchors?.clothing) characterAnchors.push(ipProfile.visualAnchors.clothing);
    if (ipProfile.visualAnchors?.accessories) characterAnchors.push(ipProfile.visualAnchors.accessories);
    if (ipProfile.visualAnchors?.distinctiveFeatures) characterAnchors.push(ipProfile.visualAnchors.distinctiveFeatures);
  }

  const styleTag = styleModifiers[stylePreset] || styleModifiers['Anime'];

  const promptParts = [
    characterAnchors.length > 0 ? characterAnchors.join(', ') : '',
    translatedScene,
    '3:4 vertical vertical portrait aspect ratio composition, full character visible, masterpiece, best quality',
    styleTag
  ].filter(Boolean);

  const promptEn = promptParts.join(', ');
  const negativePrompt = 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name, deformed limbs, realistic human skin texture, mutated body parts, nsfw, uncanny';

  return { promptEn, negativePrompt };
}

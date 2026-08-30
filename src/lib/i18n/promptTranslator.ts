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
/**
 * Intelligent Chinese to Professional English Diffusion Prompt Compiler & Purifier
 * Converts complex Chinese storyboard scene descriptions, actions, lighting, moods, styles,
 * and props into pure, expressive English diffusion tokens.
 */
export function translateAndRefineChinesePrompt(chinesePrompt: string): string {
  if (!chinesePrompt || !chinesePrompt.trim()) return '';

  const trimmed = chinesePrompt.trim();

  // If already compiled English prompt (contains standard diffusion keywords or majority English)
  if (
    trimmed.includes('masterpiece') ||
    trimmed.includes('best quality') ||
    trimmed.includes('aspect ratio') ||
    trimmed.includes('featuring the character') ||
    !/[\u4e00-\u9fa5]/.test(trimmed)
  ) {
    return trimmed;
  }

  const tokens: string[] = [];
  const text = chinesePrompt;

  // 0. Replacement & Substitution Syntax Parsing
  let excludedKeywords: string[] = [];
  let targetFocusText = text;

  const replaceMatch = text.match(/(?:把|将)?\s*([^\s,，。]+?)\s*(?:换为|换成|改成|替换为|替换成)\s*([^\s,，。]+)/);
  if (replaceMatch) {
    const fromEntity = replaceMatch[1];
    const toEntity = replaceMatch[2];
    excludedKeywords.push(fromEntity);
    targetFocusText = toEntity;
  }

  const isExcluded = (keyword: string) => excludedKeywords.some(ex => ex.includes(keyword) || keyword.includes(ex));
  const subjectForProps = targetFocusText || text;

  // 1. Time, Weather & Lighting Atmosphere
  if (text.includes('清晨') || text.includes('早晨') || text.includes('晨光') || text.includes('黎明') || text.includes('早上')) {
    tokens.push('early morning scene, fresh sunrise atmosphere');
  } else if (text.includes('黄昏') || text.includes('夕阳') || text.includes('傍晚') || text.includes('落日') || text.includes('晚霞')) {
    tokens.push('golden hour sunset lighting, warm dusk atmosphere');
  } else if (text.includes('夜晚') || text.includes('深夜') || text.includes('月夜') || text.includes('星空') || text.includes('黑夜')) {
    tokens.push('atmospheric cozy night scene, gentle moonlight, twinkling stars backdrop');
  } else if (text.includes('雨天') || text.includes('下雨') || text.includes('暴雨') || text.includes('雨水')) {
    tokens.push('rainy day mood, gentle rain mist, wet reflections');
  } else if (text.includes('下雪') || text.includes('雪天') || text.includes('冬日') || text.includes('雪花')) {
    tokens.push('snowy winter atmosphere, falling snowflakes');
  }

  if (text.includes('阳光洒下') || text.includes('温暖阳光') || text.includes('阳光明媚') || text.includes('阳光') || text.includes('日光') || text.includes('朝阳')) {
    tokens.push('warm golden morning sunlight streaming down, radiant sunbeams, soft cinematic lighting');
  } else if (text.includes('暖白') || text.includes('暖光') || text.includes('柔和光线') || text.includes('摄影棚光') || text.includes('雕刻感') || text.includes('光影')) {
    tokens.push('soft warm volumetric lighting, gentle studio key light, subtle ambient occlusion');
  } else if (text.includes('霓虹') || text.includes('赛博光') || text.includes('发光')) {
    tokens.push('vibrant neon rim lighting, colorful specular glow');
  }

  // 2. Character Mood, Energy & Readiness
  if (text.includes('元气满满') || text.includes('活力满满') || text.includes('神采奕奕') || text.includes('充满活力') || text.includes('精神饱满')) {
    tokens.push('full of vibrant energy, enthusiastic and spirited vibe, radiant joyful expression');
  }
  if (text.includes('准备开展新计划') || text.includes('准备出发') || text.includes('开展新计划') || text.includes('新计划') || text.includes('跃跃欲试') || text.includes('摩拳擦掌') || text.includes('充满干劲')) {
    tokens.push('standing ready with great excitement to start a brand new project and plan, looking forward with determination');
  }
  if (text.includes('信心满满') || text.includes('自信') || text.includes('意气风发')) {
    tokens.push('confident upbeat smile, proud energetic posture');
  }
  if (text.includes('开心') || text.includes('高兴') || text.includes('愉快') || text.includes('欢快') || text.includes('兴奋') || text.includes('幸福')) {
    tokens.push('beaming with joy, bright cheerful smile, joyful wholesome mood');
  }
  if (text.includes('紧张') || text.includes('手抖') || text.includes('慌乱') || text.includes('手忙脚乱') || text.includes('汗珠') || text.includes('冷汗')) {
    tokens.push('comically tense and flustered moment, trembling hands, large anime sweat drop on forehead');
  }
  if (text.includes('震惊') || text.includes('抱头大叫') || text.includes('抱头') || text.includes('大叫') || text.includes('惊恐') || text.includes('惊慌失措') || text.includes('滑稽震惊')) {
    tokens.push('clutching head in comical shock, wide-eyed screaming expression, hilarious exaggerated cartoon reaction');
  }
  if (text.includes('面面相觑') || text.includes('尴尬') || text.includes('空气安静') || text.includes('定格') || text.includes('呆滞') || text.includes('社死')) {
    tokens.push('deadpan awkward frozen moment, silent stare, funny speechless reaction face');
  }
  if (text.includes('相视大笑') || text.includes('大笑') || text.includes('笑出声') || text.includes('温馨融洽') || text.includes('暖心治愈') || text.includes('温柔以待')) {
    tokens.push('laughing heartily together, heartwarming and wholesome atmosphere, cozy bonding moment');
  }
  if (text.includes('胜利手势') || text.includes('剪刀手') || text.includes('比出') || text.includes('比耶') || text.includes('致谢')) {
    tokens.push('flashing a cute peace victory V-sign gesture with a cheerful wink, waving to viewer');
  }

  // 3. Clothing & Outfits
  if (text.includes('日常装扮') || text.includes('日常穿搭') || text.includes('便装') || text.includes('休闲装') || text.includes('日常衣着')) {
    tokens.push('wearing cute casual everyday outfit, charming stylish clothing');
  } else if (text.includes('围裙') || text.includes('咖啡师皮围裙') || text.includes('皮围裙')) {
    tokens.push('wearing a classic brown barista leather apron with neat straps');
  } else if (text.includes('战术夹克') || text.includes('机能夹克') || text.includes('外套')) {
    tokens.push('wearing tactical techwear jacket with reflective straps');
  } else if (text.includes('睡衣') || text.includes('睡袍')) {
    tokens.push('wearing cozy soft cute pajamas');
  }

  // 4. Proportions, Headwear & Character Type
  if (text.includes('二头身') || text.includes('大头小身') || text.includes('Q版') || text.includes('q版')) {
    tokens.push('cute chibi character with 2-head-tall proportions, oversized round head and tiny chubby body');
  }
  if ((text.includes('精灵') || text.includes('小人')) && !isExcluded('精灵') && !isExcluded('小人')) {
    tokens.push('little magical fairy elf mascot');
  } else if (text.includes('柴犬') && !isExcluded('柴犬')) {
    tokens.push('anthropomorphic cute chubby Shiba Inu character');
  } else if ((text.includes('小猫') || text.includes('猫咪')) && !isExcluded('小猫') && !isExcluded('猫咪') && !targetFocusText.includes('猫')) {
    tokens.push('anthropomorphic cute cat character');
  } else if ((text.includes('小狗') || text.includes('修勾') || text.includes('狗狗')) && !isExcluded('小狗') && !isExcluded('狗')) {
    tokens.push('anthropomorphic cute puppy character');
  } else if (text.includes('小狐狸') || text.includes('灵狐') || text.includes('狐狸')) {
    tokens.push('cute anthropomorphic fox character with fluffy ears and tail');
  } else if (text.includes('小熊') || text.includes('小泰迪')) {
    tokens.push('cute anthropomorphic little bear character');
  } else if (text.includes('小兔') || text.includes('兔子')) {
    tokens.push('cute anthropomorphic bunny rabbit character');
  }

  if (text.includes('草帽')) {
    tokens.push('wearing a yellow woven straw hat');
  } else if (text.includes('眼镜') || text.includes('圆眼镜')) {
    tokens.push('wearing stylish round eyeglasses');
  } else if (text.includes('护目镜') || text.includes('AR护目镜')) {
    tokens.push('wearing futuristic holographic goggles');
  }

  // 5. Actions, Poses & Storyboard Interactions
  if (text.includes('出门') || text.includes('走向') || text.includes('前行') || text.includes('走在街上') || text.includes('迈出')) {
    tokens.push('stepping outside with lively strides, walking down the street');
  } else if (text.includes('全神贯注') || text.includes('摆弄') || text.includes('制作') || text.includes('操作') || text.includes('倒奶') || text.includes('拉花') || text.includes('调试')) {
    tokens.push('focusing intently and tinkering carefully with hands, closeup on hands crafting and handling props');
  } else if (text.includes('失衡') || text.includes('倾斜') || text.includes('摇晃') || text.includes('脱手') || text.includes('滑脱')) {
    tokens.push('props tilting and wobbling dangerously out of balance, dynamic tense moment');
  } else if (text.includes('彻底失控') || text.includes('飞向空中') || text.includes('散落飞溅') || text.includes('喷发') || text.includes('飞溅') || text.includes('起飞') || text.includes('打翻')) {
    tokens.push('dramatic dynamic explosion and splash, items flying chaotically into mid-air, dynamic action motion blur');
  } else if (text.includes('躺平') || text.includes('平躺') || text.includes('躺着')) {
    tokens.push('lying flat relaxed on the ground, cozy chilled pose');
  } else if (text.includes('坐') || text.includes('坐着')) {
    tokens.push('sitting comfortably with cute relaxed pose');
  } else if (text.includes('奔跑') || text.includes('跑') || text.includes('飞奔')) {
    tokens.push('running joyfully with energetic dynamic motion pose');
  } else if (text.includes('跳跃') || text.includes('跳')) {
    tokens.push('jumping happily in mid-air with joyful energetic pose');
  } else if (text.includes('挥手') || text.includes('打招呼')) {
    tokens.push('waving hand cheerfully to the camera');
  } else if (text.includes('睡觉') || text.includes('睡大觉')) {
    tokens.push('sleeping peacefully with sweet closed eyes');
  }

  // 6. Props & Objects
  if ((subjectForProps.includes('熊') || subjectForProps.includes('小熊') || subjectForProps.includes('泰迪熊') || subjectForProps.includes('棕熊')) && !isExcluded('小熊') && !isExcluded('熊')) {
    tokens.push('holding tightly a cute chubby brown teddy bear plush toy doll');
  } else if ((subjectForProps.includes('兔') || subjectForProps.includes('小兔') || subjectForProps.includes('兔子')) && !isExcluded('兔子') && !isExcluded('小兔')) {
    tokens.push('holding tightly a cute fluffy bunny rabbit plush toy doll');
  } else if (text.includes('奶泡缸') || text.includes('拉花缸') || text.includes('咖啡杯') || text.includes('咖啡')) {
    tokens.push('holding a shiny metal milk pitcher and warm coffee cup');
  } else if (text.includes('奶茶')) {
    tokens.push('holding a sweet bubble milk tea with boba pearls');
  } else if (text.includes('背包') || text.includes('小包')) {
    tokens.push('carrying a cute compact bag');
  }

  // 7. Background & Environment
  if (text.includes('街头') || text.includes('街角') || text.includes('街道') || text.includes('老街') || text.includes('街景')) {
    tokens.push('charming quaint neighborhood street backdrop, cozy shopfronts, warm morning ambiance');
  } else if (text.includes('咖啡馆') || text.includes('吧台') || text.includes('店内') || text.includes('后厨')) {
    tokens.push('cozy warm coffee shop interior, espresso machine steam rising, wooden counter backdrop');
  } else if (text.includes('房间') || text.includes('卧室') || text.includes('书桌') || text.includes('客厅')) {
    tokens.push('cozy warm room interior with sunny window and wooden desk');
  } else if (text.includes('草地') || text.includes('公园') || text.includes('花海')) {
    tokens.push('lush green grass lawn with tiny blooming wildflowers');
  } else if (text.includes('沙滩') || text.includes('海边') || text.includes('海滩')) {
    tokens.push('scenic sunny beach by turquoise ocean with soft golden sand');
  } else if (text.includes('纯色背景') || text.includes('干净背景')) {
    tokens.push('clean solid pastel color background, isolated composition');
  }

  // Fallback: If no tokens matched from the domain dictionary, extract readable concepts
  if (tokens.length === 0) {
    tokens.push('single standalone cinematic action scene, dynamic character action and rich background details, no split screen, no grid');
  }

  // Always append general high quality enhancement tokens
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
    'single standalone image, single frame, no split screen, no grid, no multi-panel, no comic strip, no speech bubbles, 3:4 vertical vertical portrait aspect ratio composition, full character visible, masterpiece, best quality',
    styleTag
  ].filter(Boolean);

  const promptEn = promptParts.join(', ');
  const negativePrompt = 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name, deformed limbs, realistic human skin texture, mutated body parts, nsfw, uncanny, grid, 2x2 grid, 4-panel, multi-panel, comic strip, comic panels, manga panels, split screen, collage, multiple frames, speech bubbles, dialog box, text banners, multiple views, character sheet, multiple images in one';

  return { promptEn, negativePrompt };
}

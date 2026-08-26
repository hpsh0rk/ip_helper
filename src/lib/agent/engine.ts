import { IPProfile, StoryScript, StoryboardFrame, Locale, StylePreset } from '@/types';
import { buildSystemPromptWithSkills } from '@/lib/skills/loader';
import { compileDiffusionPrompt } from '@/lib/i18n/promptTranslator';
import { generateDiffusionImageURL, buildDiffusionPromptString } from '@/lib/render/imageEngine';

export interface ChatResponseResult {
  reply: string;
  extractedIP?: IPProfile;
  generatedStory?: StoryScript;
  suggestedTopics?: string[];
  actionType?: 'ip_created' | 'ip_updated' | 'story_generated';
}

/**
 * Dynamically parses arbitrary natural language into a rich, structured IP Profile
 */
export function extractDynamicIPFromText(
  userText: string,
  locale: Locale = 'zh',
  baseStylePreset: StylePreset = '3D Clay'
): IPProfile {
  const isEn = locale === 'en';

  // 1. Extract Name
  let name = '';
  const nameMatch = userText.match(/(?:叫|名字|名为|称作|name is|named)\s*[:：]?\s*([^\s,，。!！]+)/i) ||
                    userText.match(/([^\s,，。!！]+)(?:小猫|小狗|机器人|侦探|少年|少女|医生|店长|博主|大厨)/);
  if (nameMatch) {
    name = nameMatch[1].trim();
  }

  // Fallback name generation based on keywords
  if (!name || name.length > 8) {
    if (userText.includes('狗') || userText.includes('柴犬')) name = isEn ? 'Shiba Bobo' : '柴犬波波 (Bobo)';
    else if (userText.includes('兔') || userText.includes('白兔')) name = isEn ? 'Bunny Mimi' : '兔米米 (Mimi)';
    else if (userText.includes('熊') || userText.includes('熊猫')) name = isEn ? 'Panda Panpan' : '潘潘 (Panpan)';
    else if (userText.includes('机械') || userText.includes('赛博') || userText.includes('机器人')) name = isEn ? 'Cyber K-01' : '智械K-01 (K-01)';
    else if (userText.includes('龙') || userText.includes('恐龙')) name = isEn ? 'Dino Rex' : '暴龙阿雷 (Rex)';
    else if (userText.includes('鸭') || userText.includes('柯尔鸭')) name = isEn ? 'Duck Dodo' : '鸭嘟嘟 (Dodo)';
    else if (userText.includes('猫')) name = isEn ? 'Miao Qiqi' : '喵七七 (Miao Qiqi)';
    else {
      // Pick first distinctive noun or default
      const words = userText.replace(/[，。！？\s]/g, '');
      name = words.slice(0, 3) + (isEn ? ' Spirit' : '小萌物');
    }
  }

  // 2. Extract Archetype / Role
  let archetype = userText.slice(0, 40).replace(/创建|一个|一只|一位|的|IP/g, '').trim();
  if (!archetype) archetype = isEn ? 'Cute adventurous daily companion' : '充满好奇心的治愈系日常探险家';

  // 3. Detect Style Preset
  let stylePreset: StylePreset = baseStylePreset;
  if (userText.includes('黏土') || userText.includes('粘土') || userText.includes('3D') || userText.toLowerCase().includes('clay')) {
    stylePreset = '3D Clay';
  } else if (userText.includes('动漫') || userText.includes('二次元') || userText.includes('日系') || userText.toLowerCase().includes('anime')) {
    stylePreset = 'Anime';
  } else if (userText.includes('赛博') || userText.includes('科幻') || userText.toLowerCase().includes('cyber')) {
    stylePreset = 'Cyberpunk';
  } else if (userText.includes('水彩') || userText.includes('吉卜力') || userText.includes('宫崎骏') || userText.toLowerCase().includes('ghibli')) {
    stylePreset = 'Ghibli Watercolor';
  } else if (userText.includes('美漫') || userText.includes('复古') || userText.toLowerCase().includes('comic')) {
    stylePreset = 'Retro Comic';
  } else if (userText.includes('Q版') || userText.includes('表情包') || userText.toLowerCase().includes('chibi')) {
    stylePreset = 'Chibi 2D';
  }

  // 4. Dynamic Visual Anchors
  let hair = '毛发/发型蓬松且有光泽，头顶有一小撮标志性呆毛';
  if (userText.includes('金') || userText.includes('黄')) hair = '亮金色渐变毛发，耳尖微卷';
  else if (userText.includes('黑') || userText.includes('墨')) hair = '乌黑油亮毛发，泛着温润光泽';
  else if (userText.includes('白') || userText.includes('银')) hair = '纯白如雪的柔软绒毛，右耳有淡灰色斑块';
  else if (userText.includes('机能') || userText.includes('机械')) hair = '带流光呼吸灯的金属外壳与光纤神经发丝';

  let clothing = '极具辨识度的定制日常工作服与舒适外套';
  if (userText.includes('咖啡') || userText.includes('店员') || userText.includes('围裙')) clothing = '深棕色复古皮质围裙，搭配米白色棉质衬衫';
  else if (userText.includes('外卖') || userText.includes('战术') || userText.includes('机能')) clothing = '黑色防水机能连帽夹克，饰有橙色反光条与多功能工装口袋';
  else if (userText.includes('医生') || userText.includes('白大褂')) clothing = '干练利落的短款白大褂，内衬淡蓝色毛衣';
  else if (userText.includes('农场') || userText.includes('草帽') || userText.includes('背带裤')) clothing = '浅蓝色牛仔背带裤，内搭姜黄色格子衬衫';
  else if (userText.includes('西装') || userText.includes('职场') || userText.includes('打工')) clothing = '略显宽松的炭灰色小西装，挂着工牌与钥匙扣';

  let accessories = '随身携带的标志性小物件';
  if (userText.includes('眼镜')) accessories = '一副复古黑框小圆眼镜，金属镜腿';
  else if (userText.includes('相机') || userText.includes('摄影')) accessories = '斜挎着一台复古胶片相机，带皮质背带';
  else if (userText.includes('耳机') || userText.includes('音乐')) accessories = '头戴式降噪猫耳耳机，泛着微弱呼吸光';
  else if (userText.includes('草帽')) accessories = '系着红丝带的手工编织小草帽，挂在背后';
  else accessories = '脖子上系着带小铜铃的红绳项圈，腰间挂着专属能量水壶';

  // 5. Avatar selection
  const avatarPool = [
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80'
  ];
  const avatarUrl = avatarPool[Math.floor(Math.random() * avatarPool.length)];

  return {
    id: `ip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    archetype,
    visualAnchors: {
      hair,
      clothing,
      accessories,
      colorPalette: ['#8B5A2B', '#EEDC82', '#4A5568', '#CBD5E0'],
      distinctiveFeatures: '圆润呆萌的体型，表情丰富，肢体动作夸张生动'
    },
    personality: {
      traits: ['乐观向上', '手残但执着', '爱吃美食', '反差萌'],
      tagline: `虽然每天都会遇到意想不到的小意外，但${name}从不服输！`,
      catchphrase: isEn ? 'Stay cute and never give up!' : '生活再难，也要保持可爱与热爱！',
      flawOrConflict: '经常因为过于认真或贪吃而引发搞笑的翻车社死事件'
    },
    worldview: `围绕${name}展开的温馨治愈日常都市，充满市井烟火气与幽默感的小世界。`,
    stylePreset,
    avatarUrl,
    assets: [],
    turnaroundSheets: {},
    expressionSheets: [],
    loraWeights: {
      face: 0.85,
      costume: 0.8,
      style: 0.85
    },
    createdAt: new Date().toISOString(),
    locale
  };
}

/**
 * Dynamically generates 4 tailor-made Xiaohongshu viral topic suggestions based on character traits
 */
export function generateSuggestedTopicsForIP(ip: IPProfile, locale: Locale = 'zh'): string[] {
  const isEn = locale === 'en';
  if (isEn) {
    return [
      `First day on the job chaos with ${ip.name}`,
      `${ip.name}'s secret late-night snack confession`,
      `How ${ip.name} accidentally went viral today`,
      `Wholesome weekend adventure with ${ip.name}`
    ];
  }
  return [
    `${ip.name}第一天上班就搞砸了但被全网原谅`,
    `关于${ip.name}为了减肥偷偷绝食却在半夜狂吃的抓马日常`,
    `${ip.name}去面试结果把面试官逗笑当场录用`,
    `治愈周末｜${ip.name}手作甜品大翻车现场`
  ];
}

/**
 * Dynamically generates a 6-frame storyboard tailored to ANY given IP and topic
 */
export function generateStoryboardForIP(
  ip: IPProfile,
  topic: string,
  locale: Locale = 'zh'
): StoryScript {
  const isEn = locale === 'en';
  const cleanTopic = topic.replace(/^[^\s]+\s+/, '').trim() || '日常小意外翻车';

  const clothingDesc = ip.visualAnchors?.clothing || ip.description || '日常装扮';
  const accessDesc = ip.visualAnchors?.accessories || '随身道具';
  const flawDesc = ip.personality?.flawOrConflict || '意料之外的意外状况';

  const scenes = [
    {
      num: 1,
      title: isEn ? 'P1 Confident Start (Hook)' : 'P1 信心满满出发 (黄金封面)',
      zh: `清晨温暖阳光洒下，${ip.name}带着${clothingDesc}，元气满满准备开展新计划`,
      narration: isEn ? `Today is a brand new start for ${ip.name}!` : `谁懂啊！今天为了${cleanTopic}，${ip.name}早早就做足了心理准备！`,
      dialogue: isEn ? `${ip.name}: "Today will be legendary!"` : `${ip.name}："今天本主角一定要把${cleanTopic}做到极致！"`,
      img: ip.avatarUrl || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80'
    },
    {
      num: 2,
      title: isEn ? 'P2 The First Step' : 'P2 事情开始按计划推进',
      zh: `场景特写，${ip.name}全神贯注地摆弄着${accessDesc}，周围环境温馨而忙碌`,
      narration: isEn ? 'Everything seemed under control at first.' : `刚开始一切看起来都很顺利，周围人投来期待的目光～`,
      dialogue: isEn ? `${ip.name}: "Step one complete, easy peasy!"` : `${ip.name}："看吧，按我的独家秘籍，完全没问题！"`,
      img: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80'
    },
    {
      num: 3,
      title: isEn ? 'P3 Sudden Tension' : 'P3 突发意想不到的紧张瞬间',
      zh: `${ip.name}额头渗出汗珠，手脚开始慌乱，身边的道具发生轻微失衡倾斜`,
      narration: isEn ? 'Suddenly, an unexpected twist hit the scene!' : `不知为何，由于${flawDesc}，节奏突然开始不对劲了...`,
      dialogue: isEn ? `${ip.name}: "Wait... why is this shaking?!"` : `${ip.name}（内心）："等一下...怎么和我想象的完全不一样？！"`,
      img: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80'
    },
    {
      num: 4,
      title: isEn ? 'P4 Dramatic Climax Spill' : 'P4 戏剧性大翻车高潮',
      zh: `道具彻底失控飞向空中，物品散落飞溅，${ip.name}夸张抱头大叫，神情滑稽震惊`,
      narration: isEn ? 'In a split second, total comical disaster occurred!' : `下一秒！手一滑，全场直接原地起飞，迎来了史诗级大翻车——`,
      dialogue: isEn ? `${ip.name}: "NOOOO! Watch out everyone!"` : `${ip.name}："哇啊啊啊！快闪开！怎么会变成这样！"`,
      img: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=600&auto=format&fit=crop&q=80'
    },
    {
      num: 5,
      title: isEn ? 'P5 Deadpan Reaction' : 'P5 尴尬但极其搞笑的现场定格',
      zh: `全场空气安静，旁观者与${ip.name}面面相觑，滑稽的痕迹留在脸上或周围`,
      narration: isEn ? 'The room went dead silent as everyone stared.' : `空气瞬间凝固，周围的人全看呆了，场面又社死又好笑...`,
      dialogue: isEn ? `Witness: "Is this... part of the special performance?"` : `路人/店长："那个...这难道是你准备的特别即兴表演吗？"`,
      img: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&auto=format&fit=crop&q=80'
    },
    {
      num: 6,
      title: isEn ? 'P6 Wholesome Ending & CTA' : 'P6 暖心治愈收尾与评论区求互动',
      zh: `大家忍不住相视大笑，温馨融洽，${ip.name}微笑着比出胜利手势向观众致谢`,
      narration: isEn ? `Though it was chaotic, warmth and laughter filled the heart. Share your stories below!` : `虽然翻车了，但大家都被逗乐了！生活就是这样，只要心态好，糗事也能变成快乐回忆✨`,
      dialogue: isEn ? `${ip.name}: "Have you ever had a moment like this? Tell me in the comments!"` : `${ip.name}："家人们，你们有没有过类似的社死名场面？快在评论区告诉我让我平衡一下😭！"`,
      img: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=600&auto=format&fit=crop&q=80'
    }
  ];

  const frames: StoryboardFrame[] = scenes.map((s, idx) => {
    const { promptEn } = compileDiffusionPrompt(s.zh, ip, ip.stylePreset);
    const scenePrompt = buildDiffusionPromptString(
      s.zh,
      ip,
      ip.stylePreset,
      idx % 2 === 0 ? 'front' : 'side',
      idx === 3 ? 'shocked panic expression' : idx === 5 ? 'happy warm healing smile' : 'smile'
    );
    const sceneImg = generateDiffusionImageURL(scenePrompt, 600, 800, Date.now() + idx * 7);

    return {
      id: `frame-${Date.now()}-${idx + 1}`,
      frameNumber: s.num,
      title: s.title,
      visualPrompt: s.zh,
      visualPromptEn: promptEn,
      narration: s.narration,
      dialogue: s.dialogue,
      imageUrl: sceneImg,
      isCover: idx === 0,
      status: 'completed'
    };
  });

  const xhsTitleOptions = isEn
    ? [
        `Help😭 ${ip.name} tried ${cleanTopic} and it went crazy!`,
        `You won't believe what happened when ${ip.name} did ${cleanTopic}...`,
        `${ip.name}'s Diary: First-time ${cleanTopic} disaster🐱`,
        `Wholesome Daily: As long as I'm not embarrassed, nobody is!`
      ]
    : [
        `救命😭${ip.name}关于【${cleanTopic}】的大翻车现场！`,
        `谁懂啊！${ip.name}第一次尝试${cleanTopic}，结果直接社死...`,
        `${ip.name}的生活手记：关于${cleanTopic}的抓马日常🐱`,
        `治愈日常｜只要我不尴尬，这就是一场行为艺术！`
      ];

  const xhsContent = isEn
    ? `🐱 You won't believe what happened to ${ip.name} during ${cleanTopic} today! 😭\n\nTried so hard to make everything perfect, but my hands were shaking and things went completely out of control!\n\nThankfully everyone laughed it off and turned the disaster into a wholesome memory ✨\n\n💬 What was your most hilarious story related to this? Drop your comments below! 👇\n\n#OriginalIP #${ip.name.replace(/\s+/g, '')} #StoryComics #CuteIllustration #WholesomeDaily`
    : `🐱 谁懂啊！${ip.name}今天因为【${cleanTopic}】抓马翻车了😭\n\n出门前练习了八百遍，信心满满以为能惊艳全场！\n结果手一滑，直接上演史诗级名场面，周围人全看呆了...\n\n还好大家人超好，不仅没怪我还一起哈哈大笑～果然生活需要一点幽默感✨\n\n💬 各位家人们，你们在【${cleanTopic}】的时候有没有发生过什么社死名场面？快在评论区分享让我平衡一下呜呜呜😭！\n\n#原创IP #${ip.name.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')}日常 #小红书漫画 #打工人日常 #治愈系插画 #社死现场`;

  const xhsTags = isEn
    ? ['#OriginalIP', `#${ip.name.replace(/\s+/g, '')}`, '#StoryComics', '#CuteIllustration', '#DailyHumor']
    : ['#原创IP', `#${ip.name.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')}日常`, '#小红书漫画', '#打工人日常', '#治愈系插画', '#社死现场'];

  return {
    id: `story-${Date.now()}`,
    ipId: ip.id,
    title: `${ip.name}：${cleanTopic}`,
    summary: `${ip.name}在${cleanTopic}中的爆款 6 格分镜故事`,
    topic: cleanTopic,
    frames,
    xhsTitleOptions,
    xhsSelectedTitle: xhsTitleOptions[0],
    xhsContent,
    xhsTags,
    coverOverlay: {
      mainTitle: isEn ? `${cleanTopic} Chaos 😭` : `关于${cleanTopic}翻车了😭`,
      subtitle: isEn ? `Starring ${ip.name}` : `${ip.name}的抓马高光时刻`,
      badgeText: isEn ? 'Must Read' : '今日必看',
      textColor: '#FFFFFF',
      bgColor: '#FF5757',
      fontSize: 26,
      position: 'bottom'
    },
    createdAt: new Date().toISOString(),
    locale
  };
}

/**
 * Main Chat Processing Dispatcher
 */
export function processAgentChat(
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  currentIP?: IPProfile,
  locale: Locale = 'zh',
  activeSkillIds: string[] = ['agency-xiaohongshu-specialist', 'agency-image-prompt-engineer']
): ChatResponseResult {
  const isEn = locale === 'en';
  const lowerMsg = userMessage.toLowerCase();

  // Intent 1: Create or refine IP
  if (
    userMessage.includes('创建') || 
    userMessage.includes('人设') || 
    userMessage.includes('IP') || 
    userMessage.includes('角色') ||
    userMessage.includes('猫') ||
    userMessage.includes('狗') ||
    userMessage.includes('柴犬') ||
    userMessage.includes('机器人') ||
    userMessage.includes('外卖') ||
    lowerMsg.includes('create') ||
    lowerMsg.includes('character')
  ) {
    const newIP = extractDynamicIPFromText(userMessage, locale);
    const suggestedTopics = generateSuggestedTopicsForIP(newIP, locale);

    const reply = isEn
      ? `🎉 Done! I have built and structured the IP Bible for **${newIP.name}**!\n\n` +
        `• **Role**: ${newIP.archetype}\n` +
        `• **Visual Anchors**: ${newIP.visualAnchors.hair} ｜ ${newIP.visualAnchors.clothing} ｜ ${newIP.visualAnchors.accessories}\n` +
        `• **Style Preset**: ${newIP.stylePreset}\n` +
        `• **Key Personality**: ${newIP.personality.traits.join(', ')}\n\n` +
        `You can now view/edit this character in **Character Management**, or pick a topic to generate a 6-panel storyboard!`
      : `🎉 太棒了！已为你全新构建并沉淀 **${newIP.name}** 的专属 IP 档案：\n\n` +
        `• **角色定位**：${newIP.archetype}\n` +
        `• **视觉锁词 (Visual Anchors)**：${newIP.visualAnchors.hair} ｜ ${newIP.visualAnchors.clothing} ｜ ${newIP.visualAnchors.accessories}\n` +
        `• **艺术画风**：${newIP.stylePreset}\n` +
        `• **性格亮点**：${newIP.personality.traits.join('、')}（${newIP.personality.flawOrConflict}）\n\n` +
        `你可以前往「🎭 角色管理」进行精细化微调，或直接点击下方灵感主题开始生成小红书 6 格故事！`;

    return {
      reply,
      extractedIP: newIP,
      suggestedTopics,
      actionType: 'ip_created'
    };
  }

  // Intent 2: Generate Storyboard & Script
  if (
    userMessage.includes('故事') || 
    userMessage.includes('分镜') || 
    userMessage.includes('剧本') ||
    userMessage.includes('画') ||
    userMessage.includes('篇') ||
    lowerMsg.includes('story') ||
    lowerMsg.includes('script')
  ) {
    const targetIP = currentIP || extractDynamicIPFromText('通用治愈系小萌物', locale);
    const story = generateStoryboardForIP(targetIP, userMessage, locale);

    const reply = isEn
      ? `🎬 6-Panel Xiaohongshu storyboard generated for **${targetIP.name}** on topic: "${story.topic}"!\n\n` +
        `• **Hook Title**: ${story.xhsSelectedTitle}\n` +
        `• **Pacing**: Hook ➔ Escalation ➔ Climax Spill ➔ Wholesome Resolution ➔ CTA\n` +
        `• **Aspect Ratio**: 3:4 Vertical High-Res\n\n` +
        `Review the 6 frames in the storyboard canvas or customize the cover typography on the right simulator!`
      : `🎬 已根据【小红书爆款营销专家】规则，为 **${targetIP.name}** 生成关于【${story.topic}】的 6 格分镜故事：\n\n` +
        `• **黄金封面大字**：${story.xhsSelectedTitle}\n` +
        `• **叙事节奏**：3秒吸睛悬念 ➔ 细节铺垫 ➔ 戏剧性大翻车 ➔ 尴尬冷幽默 ➔ 暖心治愈与评论区互动\n` +
        `• **视觉画幅**：3:4 竖屏高清\n\n` +
        `已同步至分镜画布与小红书真机模拟器，你可以直接进行封面排版调整与一键打包下载！`;

    return {
      reply,
      generatedStory: story,
      actionType: 'story_generated'
    };
  }

  // Default conversational response
  const reply = isEn
    ? `I'm ready! Describe any character concept you want to create, or tell me a story topic to generate an instant 6-panel storyboard.`
    : `收到！告诉我你想创建什么新角色（例如："一只戴草帽的柴犬农场主"、"来自外星的机械水母"），我将为你自动构建完整 IP 档案与小红书分镜故事！`;

  return { reply };
}

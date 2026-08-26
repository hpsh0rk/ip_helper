import { IPProfile, StoryScript } from '@/types';

export const initialIPProfiles: IPProfile[] = [
  {
    id: 'ip-cat-barista-01',
    name: '喵七七 (Miao Qiqi)',
    description: '爱喝奶茶但天天想减肥的打工人小猫咖啡师',
    archetype: '爱喝奶茶但天天想减肥的打工人小猫咖啡师',
    visualAnchors: {
      hair: '银灰色渐变短毛，右耳有一小撮白色呆毛',
      clothing: '深棕色复古咖啡师皮围裙，内搭米白色条纹衬衫',
      accessories: '挂在脖子上的金属拉花缸挂件，戴一副复古黑框小圆眼镜',
      colorPalette: ['#8B5A2B', '#EEDC82', '#4A5568', '#CBD5E0'],
      distinctiveFeatures: '圆滚滚的包子脸，专注时尾巴会卷成问号形状'
    },
    personality: {
      traits: ['乐观阳光', '手残但执着', '奶茶重度依赖', '轻微强迫症'],
      tagline: '虽然今天打翻了牛奶，但明天的拉花一定会成功喵！',
      catchphrase: '生活再苦，奶茶加布丁也能补！',
      flawOrConflict: '总想克制食欲，但闻到奶香就走不动路'
    },
    worldview: '位于暖阳市老街角的「猫爪时光」咖啡馆，人类与拟人化动物共同生活的温馨治愈世界。',
    stylePreset: '3D Clay',
    avatarUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&auto=format&fit=crop&q=80',
    assets: [
      {
        id: 'asset-cat-01',
        url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&auto=format&fit=crop&q=80',
        prompt: 'Cute 3D claymation cat barista wearing brown leather apron and glasses, front view, Pop Mart blind box style, 8k render',
        tags: ['front', '3d_clay', 'avatar'],
        tag: 'front',
        label: '正视图 (Front)',
        createdAt: new Date().toISOString()
      },
      {
        id: 'asset-cat-02',
        url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=400&auto=format&fit=crop&q=80',
        prompt: 'Cute 3D claymation cat barista wearing brown leather apron, side profile 90 degrees view, 8k render',
        tags: ['side', '3d_clay'],
        tag: 'side',
        label: '侧视图 (Side)',
        createdAt: new Date().toISOString()
      },
      {
        id: 'asset-cat-03',
        url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&auto=format&fit=crop&q=80',
        prompt: 'Cute 3D claymation cat barista wearing brown leather apron, back view from behind 180 degrees, showing apron ties',
        tags: ['back', '3d_clay'],
        tag: 'back',
        label: '后视图 (Back)',
        createdAt: new Date().toISOString()
      },
      {
        id: 'asset-cat-04',
        url: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=300&auto=format&fit=crop&q=80',
        prompt: 'Cute 3D claymation cat barista drinking bubble tea happily, closeup portrait',
        tags: ['expression', 'happy', '3d_clay'],
        tag: 'expression',
        label: '表情特写 (Happy)',
        createdAt: new Date().toISOString()
      }
    ],
    turnaroundSheets: {
      front: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&auto=format&fit=crop&q=80',
      side: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=400&auto=format&fit=crop&q=80',
      back: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&auto=format&fit=crop&q=80'
    },
    expressionSheets: [],
    loraWeights: {
      face: 0.85,
      costume: 0.75,
      style: 0.8
    },
    createdAt: new Date().toISOString(),
    locale: 'zh'
  },
  {
    id: 'ip-cyber-courier-02',
    name: '雷克 (Rayke)',
    description: '赛博朋克夜之城特快外卖机械少年',
    archetype: '赛博朋克夜之城特快外卖机械少年',
    visualAnchors: {
      hair: '霓虹青色发光挑染短发',
      clothing: '黑色防雨机能战术夹克，带橙色反光条与机械外骨骼背包',
      accessories: '左眼全息 AR 护目镜，腰间挂着磁悬浮保温保温箱',
      colorPalette: ['#00F0FF', '#FF003C', '#121212', '#FCEE0A'],
      distinctiveFeatures: '右臂为精密的流光机械臂，眼神锐利坚定'
    },
    personality: {
      traits: ['冷静寡言', '使命必达', '面冷心热', '电子机械迷'],
      tagline: '哪怕下暴雨和EMP脉冲，你的麻辣烫也会在20分钟内送达。',
      catchphrase: '订单确认，路径已规划，出发。',
      flawOrConflict: '经常为了抄近道而在高楼管道间飞跃导致外骨骼超载'
    },
    worldview: '2088年高科技低生活的霓虹巨构都市「新京都」，底层打工人的硬核日常。',
    stylePreset: 'Cyberpunk',
    avatarUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80',
    assets: [
      {
        id: 'asset-rayke-01',
        url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80',
        prompt: 'Cyberpunk anime boy courier with cyan hair and holographic goggles, tactical jacket, night city backdrop',
        tags: ['front', 'cyberpunk', 'avatar'],
        tag: 'front',
        label: '正视图 (Front)',
        createdAt: new Date().toISOString()
      }
    ],
    turnaroundSheets: {},
    expressionSheets: [],
    loraWeights: {
      face: 0.9,
      costume: 0.85,
      style: 0.9
    },
    createdAt: new Date().toISOString(),
    locale: 'zh'
  }
];

export const initialStoryScript: StoryScript = {
  id: 'story-cat-barista-01',
  ipId: 'ip-cat-barista-01',
  title: '喵七七第一天上班打翻奶泡大翻车',
  summary: '喵七七第一天到猫咪咖啡馆上早班，为了给第一位顾客拉出完美的心形图案，结果手滑把奶泡打飞到了店长头上，引发了一场啼笑皆非但最终被原谅的暖心早晨。',
  topic: '打工人第一天上班翻车日常',
  frames: [
    {
      id: 'frame-1',
      frameNumber: 1,
      title: 'P1 信心满满出门',
      visualPrompt: '清晨温暖阳光洒在街头，小猫喵七七系好围裙背着小包走向咖啡馆，神采奕奕，充满元气',
      visualPromptEn: 'Warm morning sunlight on cozy street, cute cat barista Miao Qiqi in brown apron walking to coffee shop, cheerful expression, 3:4 portrait, Studio Ghibli style',
      narration: '谁懂啊！为了今天的第一天上班，我昨晚练习拉花到半夜！',
      dialogue: '喵七七："今天本喵一定要做出全城最棒的拿铁！"',
      imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
      isCover: true,
      status: 'completed'
    },
    {
      id: 'frame-2',
      frameNumber: 2,
      title: 'P2 迎来第一位顾客',
      visualPrompt: '咖啡馆吧台特写，阳光穿过玻璃窗，吧台干净整洁，第一位客人微笑着点了一杯热拿铁',
      visualPromptEn: 'Coffee shop counter closeup, steam rising from espresso machine, sunlight streaming in, cat barista nodding cheerfully, warm aesthetic',
      narration: '上午九点，迎来了开门第一位顾客，点了一杯热拿铁。',
      dialogue: '喵七七："您好！一份招牌心形拿铁马上就来！"',
      imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80',
      isCover: false,
      status: 'completed'
    },
    {
      id: 'frame-3',
      frameNumber: 3,
      title: 'P3 过于紧张手抖',
      visualPrompt: '小猫双手紧握不锈钢拉花缸，额头流下一滴滑稽汗珠，蒸汽管喷出浓烈白汽',
      visualPromptEn: 'Cat barista hands trembling while holding metal milk pitcher, steam rushing out, sweat drop on forehead, comical tense moment, anime shot',
      narration: '不知为什么，平时练得好好的，一到实战手就止不住疯狂发抖...',
      dialogue: '喵七七（内心）："稳住...不要抖...这可是决定我转正的一杯！"',
      imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
      isCover: false,
      status: 'completed'
    },
    {
      id: 'frame-4',
      frameNumber: 4,
      title: 'P4 奶泡喷射大翻车',
      visualPrompt: '奶泡缸失控滑脱，浓稠的白色奶泡像火山喷发一样飞向空中，小猫惊慌失措双爪抱头',
      visualPromptEn: 'Cat barista losing grip on milk pitcher, creamy milk foam exploding upwards in dynamic splash, hilarious shocked reaction face, anime dynamic angle',
      narration: '下一秒，手滑了！整缸打发完美的奶泡直接起飞——',
      dialogue: '喵七七："喵啊啊啊啊！快闪开！"',
      imageUrl: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=600&auto=format&fit=crop&q=80',
      isCover: false,
      status: 'completed'
    },
    {
      id: 'frame-5',
      frameNumber: 5,
      title: 'P5 店长头顶奶泡帽子',
      visualPrompt: '严肃的老猫店长站在吧台后，头顶恰好扣着一团像白帽子的奶泡，面无表情地看着喵七七',
      visualPromptEn: 'Stern elderly cat cafe manager standing quietly with a dollop of white milk foam on top of head like a hat, deadpan expression, funny cozy scene',
      narration: '空气突然安静，刚从后厨走出来的店长，头顶多了一顶白色高顶帽...',
      dialogue: '店长："七七，这杯...算员工免费试饮吗？"',
      imageUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&auto=format&fit=crop&q=80',
      isCover: false,
      status: 'completed'
    },
    {
      id: 'frame-6',
      frameNumber: 6,
      title: 'P6 暖心收尾求安慰',
      visualPrompt: '大家忍不住哈哈大笑，店长递给七七一块毛巾，并肩一起重新制作咖啡，温馨治愈',
      visualPromptEn: 'Cat barista and manager laughing together, wiping counter, making fresh coffee together, warm wholesome ending, cozy lighting',
      narration: '虽然翻车了，但店长不仅没生气还手把手教我重新做了一杯！打工人的第一天，依然在被世界温柔以待✨',
      dialogue: '喵七七："明天我一定要成功！大家第一天上班都发生过什么糗事？快来评论区告诉我让我不那么难过😭"',
      imageUrl: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=600&auto=format&fit=crop&q=80',
      isCover: false,
      status: 'completed'
    }
  ],
  xhsTitleOptions: [
    '救命😭第一天去咖啡馆当打工人就翻车了！',
    '谁懂啊！我把奶泡直接打到老板头上了...',
    '打工人小猫日记：关于我第一天上班的抓马现场🐱',
    '治愈日常｜只要我不尴尬，尴尬的就是店长！'
  ],
  xhsSelectedTitle: '救命😭第一天去咖啡馆当打工人就翻车了！',
  xhsContent: `🐱 谁懂啊！打工人小猫第一天上班就抓马翻车了😭

今天怀着激动的心情去「猫爪时光」咖啡馆报道！
昨晚在被窝里对着拉花教程练习了八百遍，
结果今天迎来的第一位客人，我手抖得像在弹吉他🎸

手一滑，整整一大缸刚打好的绵密奶泡直接原地起飞🛫
精准落在了刚从后厨巡视出来的店长头顶...
店长顶着那朵白云帽子，面无表情地问我："这杯算员工福利吗？"

还好店长人超好，没有骂我，还手把手带我做出了第一杯合格的心形拉花☕
果然打工人的每一天都在挑战命运的幽默感～

💬 各位打工人们，你们第一天入职/上班都发生过什么社死名场面？快在评论区分享让我平衡一下呜呜呜😭！

#原创IP #喵七七日常 #打工人日常 #小红书漫画 #治愈系插画 #咖啡馆日常 #社死现场 #猫咪生活`,
  xhsTags: [
    '#原创IP',
    '#喵七七日常',
    '#打工人日常',
    '#小红书漫画',
    '#治愈系插画',
    '#咖啡馆日常',
    '#社死现场',
    '#猫咪日常'
  ],
  coverOverlay: {
    mainTitle: '第一天上班就翻车了😭',
    subtitle: '我把奶泡打飞到了店长头上...',
    badgeText: '打工人必看',
    textColor: '#FFFFFF',
    bgColor: '#FF5757',
    fontSize: 28,
    position: 'bottom'
  },
  createdAt: new Date().toISOString(),
  locale: 'zh'
};

// Global in-memory storage for client/mock use
let currentIPs: IPProfile[] = [...initialIPProfiles];
let currentStories: StoryScript[] = [initialStoryScript];

export function getIPs(): IPProfile[] {
  return currentIPs;
}

export function getIPById(id: string): IPProfile | undefined {
  return currentIPs.find(ip => ip.id === id);
}

export function saveIP(ip: IPProfile): IPProfile {
  const existingIdx = currentIPs.findIndex(item => item.id === ip.id);
  if (existingIdx >= 0) {
    currentIPs[existingIdx] = ip;
  } else {
    currentIPs.unshift(ip);
  }
  return ip;
}

export function deleteIP(id: string): boolean {
  currentIPs = currentIPs.filter(item => item.id !== id);
  return true;
}

export function getStories(): StoryScript[] {
  return currentStories;
}

export function getStoryById(id: string): StoryScript | undefined {
  return currentStories.find(s => s.id === id);
}

export function saveStory(story: StoryScript): StoryScript {
  const existingIdx = currentStories.findIndex(s => s.id === story.id);
  if (existingIdx >= 0) {
    currentStories[existingIdx] = story;
  } else {
    currentStories.unshift(story);
  }
  return story;
}

export function deleteStory(id: string): boolean {
  currentStories = currentStories.filter(item => item.id !== id);
  return true;
}

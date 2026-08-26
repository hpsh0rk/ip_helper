import { TagDefinition } from '@/types';

export const SYSTEM_PRESET_TAGS: TagDefinition[] = [
  // 视角分类
  { id: 'front', label: '正视图 (Front)', category: 'angle', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'side', label: '侧视图 (Side)', category: 'angle', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: 'back', label: '后视图 (Back)', category: 'angle', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { id: 'three_quarter', label: '45度半侧面 (3/4 View)', category: 'angle', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  
  // 资产类型分类
  { id: 'avatar', label: '主头像 (Avatar)', category: 'type', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'full_body', label: '全身定妆 (Full Body)', category: 'type', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { id: 'expression', label: '表情特写 (Expression)', category: 'type', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  { id: 'action', label: '动作姿态 (Pose/Action)', category: 'type', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  { id: 'scene', label: '场景插画 (Scene)', category: 'type', color: 'bg-lime-500/20 text-lime-300 border-lime-500/30' },
  { id: 'prop', label: '道具概念 (Prop)', category: 'type', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },

  // 画风分类
  { id: '3d_clay', label: '3D 黏土 (3D Clay)', category: 'style', color: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' },
  { id: 'anime', label: '二次元日漫 (Anime)', category: 'style', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  { id: 'cyberpunk', label: '赛博朋克 (Cyberpunk)', category: 'style', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  { id: 'chibi', label: 'Q版萌系 (Chibi)', category: 'style', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },

  // 情绪/状态分类
  { id: 'happy', label: '元气微笑 (Happy)', category: 'emotion', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  { id: 'panic', label: '搞笑翻车 (Panic/Meme)', category: 'emotion', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { id: 'working', label: '专注打工 (Working)', category: 'emotion', color: 'bg-blue-400/20 text-blue-300 border-blue-400/30' }
];

/**
 * AI Semantic Tag Recognition
 * Analyzes prompt text, file names, or context keywords and returns matched tag IDs.
 */
export function aiInferTags(
  prompt: string,
  fileName?: string,
  customTags: TagDefinition[] = []
): string[] {
  // Normalize text: replace underscores/hyphens with spaces for smooth regex matching
  const rawText = `${prompt} ${fileName || ''}`.toLowerCase();
  const text = rawText.replace(/[_-]/g, ' ');
  const matchedTagIds = new Set<string>();

  // 1. Angle Rules
  if (/front\s*view|facing\s*camera|front\s*facing|正面|正视|前视|正面照/.test(text)) {
    matchedTagIds.add('front');
  }
  if (/side\s*view|side\s*profile|profile\s*view|侧面|侧视|90\s*degree/.test(text)) {
    matchedTagIds.add('side');
  }
  if (/back\s*view|from\s*behind|backside|后背|背影|后视|背面|back/.test(text)) {
    matchedTagIds.add('back');
  }
  if (/3\/4\s*view|three\s*quarter|45\s*度|半侧/.test(text)) {
    matchedTagIds.add('three_quarter');
  }

  // 2. Type Rules
  if (/avatar|headshot|portrait|profile\s*picture|头像|大头照|主形象/.test(text)) {
    matchedTagIds.add('avatar');
  }
  if (/full\s*body|whole\s*body|standing|全身|全身照|定妆照/.test(text)) {
    matchedTagIds.add('full_body');
  }
  if (/expression|emotion|face|closeup|smile|crying|shocked|panic|laugh|表情|特写|大笑|哭|惊慌|生气/.test(text)) {
    matchedTagIds.add('expression');
  }
  if (/scene|background|environment|street|cafe|room|landscape|场景|背景|环境|街道|咖啡馆/.test(text)) {
    matchedTagIds.add('scene');
  }
  if (/prop|item|tool|tractor|gun|cup|道具|工具|拖拉机|物品/.test(text)) {
    matchedTagIds.add('prop');
  }

  // 3. Style Rules
  if (/clay|claymation|blind\s*box|pop\s*mart|plasticine|黏土|粘土|盲盒|泡泡玛特/.test(text)) {
    matchedTagIds.add('3d_clay');
  }
  if (/anime|manga|comic|二次元|日漫|动漫/.test(text)) {
    matchedTagIds.add('anime');
  }
  if (/cyberpunk|neon|sci\s*fi|high\s*tech|赛博朋克|霓虹|科幻/.test(text)) {
    matchedTagIds.add('cyberpunk');
  }
  if (/\bchibi\b|cute\s*character|kawaii|q版|呆萌/.test(text)) {
    matchedTagIds.add('chibi');
  }

  // 4. Emotion Rules
  if (/smile|cheerful|happy|元气|开心|微笑|阳光/.test(text)) {
    matchedTagIds.add('happy');
  }
  if (/panic|disaster|spill|accident|shock|翻车|抓马|惊慌|社死/.test(text)) {
    matchedTagIds.add('panic');
  }
  if (/work|office|barista|farmer|cooking|打工|工作|咖啡师|农场|拉花/.test(text)) {
    matchedTagIds.add('working');
  }

  // 5. Custom Tags Matching (matches label or normalized tag id)
  for (const customTag of customTags) {
    const customLabelLower = customTag.label.toLowerCase();
    const idKey = customTag.id.toLowerCase().replace(/^(custom|tag)[-_]/, '');
    if (
      text.includes(customLabelLower) || 
      (idKey && text.includes(idKey)) ||
      rawText.includes(customTag.id.toLowerCase())
    ) {
      matchedTagIds.add(customTag.id);
    }
  }

  // Fallback defaults if nothing detected
  if (matchedTagIds.size === 0) {
    matchedTagIds.add('front');
  }

  return Array.from(matchedTagIds);
}

/**
 * Filter tags by search query with deduplication & similarity awareness
 */
export function searchTags(
  query: string,
  allTags: TagDefinition[]
): TagDefinition[] {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return allTags;

  return allTags.filter(t => 
    t.label.toLowerCase().includes(cleanQ) || 
    t.id.toLowerCase().includes(cleanQ)
  );
}

/**
 * Helper to resolve tag label and color from tag ID
 */
export function getTagInfo(
  tagIdOrLabel: string,
  allTags: TagDefinition[] = SYSTEM_PRESET_TAGS
): TagDefinition {
  const found = allTags.find(t => t.id === tagIdOrLabel || t.label === tagIdOrLabel);
  if (found) return found;

  return {
    id: tagIdOrLabel,
    label: tagIdOrLabel,
    category: 'custom',
    color: 'bg-zinc-800 text-zinc-300 border-zinc-700'
  };
}

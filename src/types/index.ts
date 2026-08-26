export type Locale = 'zh' | 'en';

export type StylePreset = 
  | '3D Clay'
  | 'Anime'
  | 'Cyberpunk'
  | 'Ghibli Watercolor'
  | 'Retro Comic'
  | 'Chibi 2D';

export interface VisualAnchors {
  hair: string;
  clothing: string;
  accessories: string;
  colorPalette: string[];
  distinctiveFeatures: string;
}

export interface Personality {
  traits: string[];
  tagline: string;
  catchphrase: string;
  flawOrConflict: string;
}

export interface TagDefinition {
  id: string;
  label: string;
  category?: 'angle' | 'type' | 'style' | 'emotion' | 'custom';
  color?: string;
}

export interface CharacterAsset {
  id: string;
  url: string;
  prompt: string;
  tags: string[]; // multi-tags: ['front', '3d_clay', 'avatar', 'custom_tag']
  tag?: string; // legacy backward compatibility
  label?: string; // legacy backward compatibility
  source?: 'generated' | 'uploaded';
  createdAt: string;
}

export interface IPProfile {
  id: string;
  name: string;
  description?: string; // 核心简介
  backstory?: string;   // 人物背景故事
  archetype: string;
  avatarUrl: string;
  stylePreset: StylePreset;
  assets: CharacterAsset[];
  turnaroundSheets: {
    front?: string;
    side?: string;
    back?: string;
  };
  visualAnchors: VisualAnchors;
  personality: Personality;
  worldview: string;
  expressionSheets: Array<{
    emotion: string;
    imageUrl: string;
  }>;
  loraWeights: {
    face: number;
    costume: number;
    style: number;
  };
  createdAt: string;
  locale: Locale;
}

export interface StoryboardFrame {
  id: string;
  frameNumber: number;
  title: string;
  visualPrompt: string;
  visualPromptEn: string;
  narration: string;
  dialogue: string;
  imageUrl: string;
  isCover: boolean;
  status: 'idle' | 'generating' | 'completed' | 'error';
}

export interface CoverOverlayConfig {
  mainTitle: string;
  subtitle: string;
  badgeText: string;
  textColor: string;
  bgColor: string;
  fontSize: number;
  position: 'bottom' | 'center' | 'top';
}

export interface StoryScript {
  id: string;
  ipId: string;
  title: string;
  summary: string;
  topic: string;
  frames: StoryboardFrame[];
  xhsTitleOptions: string[];
  xhsSelectedTitle: string;
  xhsContent: string;
  xhsTags: string[];
  coverOverlay: CoverOverlayConfig;
  createdAt: string;
  locale: Locale;
}

export interface Skill {
  id: string;
  name: string;
  title: string;
  description: string;
  systemPrompt: string;
  category: 'marketing' | 'visual' | 'story' | 'custom';
  enabled: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  action?: {
    type?: 'ip_created' | 'ip_updated' | 'story_generated' | 'skill_switched';
    payload?: IPProfile | StoryScript | Partial<IPProfile> | Record<string, unknown>;
  };
}

export interface GenerationRequest {
  ipProfile?: IPProfile;
  topic?: string;
  language?: Locale;
  activeSkillIds?: string[];
  userPrompt?: string;
}

export type GenerationMode = 'text-to-image' | 'image-to-image';

export type ImageModelProviderId = 
  | 'antigravity-cli'
  | 'openai-dalle3'
  | 'siliconflow-flux'
  | 'midjourney-proxy'
  | 'comfyui-local';

export interface ImageModelCapabilities {
  textToImage: boolean;   // 文生图
  imageToImage: boolean;  // 图生图 (垫图/参考图)
  ipAdapterLock: boolean; // 角色一致性特征锁定 (IP-Adapter / LoRA)
  inPainting: boolean;    // 局部重绘
}

export interface ImageModelProvider {
  id: ImageModelProviderId;
  name: string;
  badge: string;
  description: string;
  defaultModel: string;
  availableModels: string[];
  capabilities: ImageModelCapabilities;
  supportedRatios: string[];
  phase: 'phase1_active' | 'phase2_configurable';
  endpoint?: string;
  apiKey?: string;
}

export interface ImageEngineConfig {
  activeProviderId: ImageModelProviderId;
  generationMode: GenerationMode;
  customApiKeys?: Partial<Record<ImageModelProviderId, string>>;
  customEndpoints?: Partial<Record<ImageModelProviderId, string>>;
}

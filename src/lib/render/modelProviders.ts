import { ImageModelProvider, ImageModelProviderId } from '@/types';

export const IMAGE_MODEL_PROVIDERS: ImageModelProvider[] = [
  {
    id: 'antigravity-cli',
    name: 'Antigravity CLI (Google Imagen 3)',
    badge: '🌟 原生内置 · 开箱即用',
    description: 'Antigravity CLI 官方内置多模态商业级生图引擎，具备顶尖的 Prompt 实体理解力、Pop Mart 盲盒 3D 黏土质感与真实摄影棚打光，支持 8K 高保真输出。',
    defaultModel: 'imagen-3.0-generate-002',
    availableModels: ['imagen-3.0-generate-002', 'imagen-3.0-fast'],
    capabilities: {
      textToImage: true,
      imageToImage: true,
      ipAdapterLock: true,
      inPainting: false
    },
    supportedRatios: ['3:4', '1:1', '4:3', '16:9', '9:16'],
    phase: 'phase1_active'
  },
  {
    id: 'siliconflow-flux',
    name: 'SiliconFlow (FLUX.1 / SDXL)',
    badge: '⚡ 高速商业 API · 需 Key',
    description: '基于 FLUX.1-dev / SDXL 商业节点，具备极高的人物五官保真度与文字渲染能力，支持图生图 (I2I) 与角色特征参考图锁定。',
    defaultModel: 'black-forest-labs/FLUX.1-dev',
    availableModels: ['black-forest-labs/FLUX.1-dev', 'black-forest-labs/FLUX.1-schnell', 'stabilityai/stable-diffusion-xl-base-1.0'],
    capabilities: {
      textToImage: true,
      imageToImage: true,
      ipAdapterLock: true,
      inPainting: true
    },
    supportedRatios: ['3:4', '1:1', '9:16', '16:9'],
    phase: 'phase2_configurable',
    endpoint: 'https://api.siliconflow.cn/v1/images/generations'
  },
  {
    id: 'openai-dalle3',
    name: 'OpenAI DALL·E 3',
    badge: '🤖 语义大师 · 需 Key',
    description: 'OpenAI 旗舰文生图模型，指令遵循极强，擅长根据复杂长故事 Prompt 构图，注意：DALL·E 3 仅支持纯文生图 (Text-to-Image)。',
    defaultModel: 'dall-e-3',
    availableModels: ['dall-e-3'],
    capabilities: {
      textToImage: true,
      imageToImage: false,
      ipAdapterLock: false,
      inPainting: false
    },
    supportedRatios: ['1024x1792 (9:16)', '1024x1024 (1:1)', '1792x1024 (16:9)'],
    phase: 'phase2_configurable',
    endpoint: 'https://api.openai.com/v1/images/generations'
  },
  {
    id: 'midjourney-proxy',
    name: 'Midjourney Proxy / Niji 6',
    badge: '🎨 艺术巅峰 · 需 Key',
    description: '二次元与插画天花板，支持通过 `--cref [URL]` 垫入三视图定妆照进行角色一致性图生图，支持 `--cw` 调整衣服面部保持权重。',
    defaultModel: 'niji-6',
    availableModels: ['niji-6', 'midjourney-v6.1'],
    capabilities: {
      textToImage: true,
      imageToImage: true,
      ipAdapterLock: true,
      inPainting: true
    },
    supportedRatios: ['3:4', '1:1', '9:16', '16:9'],
    phase: 'phase2_configurable'
  },
  {
    id: 'comfyui-local',
    name: 'Local ComfyUI / SD-WebUI',
    badge: '🖥️ 本地私有化 · 需本地服务',
    description: '连接本地 GPU (RTX 4090 / Mac Metal) 运行自定义 ControlNet 与 IP-Adapter 工作流，完全隐私且无需 API 费用。',
    defaultModel: 'custom-workflow.json',
    availableModels: ['custom-workflow.json'],
    capabilities: {
      textToImage: true,
      imageToImage: true,
      ipAdapterLock: true,
      inPainting: true
    },
    supportedRatios: ['3:4', '1:1', '9:16', '16:9'],
    phase: 'phase2_configurable',
    endpoint: 'http://127.0.0.1:8188/prompt'
  }
];

export function getProviderById(id: ImageModelProviderId): ImageModelProvider {
  return IMAGE_MODEL_PROVIDERS.find(p => p.id === id) || IMAGE_MODEL_PROVIDERS[0];
}

import { describe, it, expect } from 'vitest';
import { renderSingleFrame, renderAllFrames } from '../lib/render/imageEngine';
import { StoryboardFrame, IPProfile } from '../types';

describe('Image Rendering Engine', () => {
  const mockFrame: StoryboardFrame = {
    id: 'f1',
    frameNumber: 1,
    title: 'P1 Morning',
    visualPrompt: '小猫在街头微笑着散步',
    visualPromptEn: '',
    narration: '美好一天',
    dialogue: '喵！',
    imageUrl: '',
    isCover: true,
    status: 'idle'
  };

  it('should render a single frame with compiled English prompt and image url', async () => {
    const mockIP: IPProfile = {
      id: 'test-ip-render',
      name: '喵七七',
      archetype: '小猫咖啡师',
      visualAnchors: {
        hair: '银灰色毛发',
        clothing: '皮围裙',
        accessories: '黑框眼镜',
        colorPalette: ['#8B5A2B'],
        distinctiveFeatures: '圆脸'
      },
      personality: {
        traits: ['元气'],
        tagline: '加油',
        catchphrase: '喵',
        flawOrConflict: '贪吃'
      },
      worldview: '咖啡馆',
      stylePreset: '3D Clay',
      avatarUrl: '',
      assets: [],
      turnaroundSheets: {},
      expressionSheets: [],
      loraWeights: { face: 0.8, costume: 0.8, style: 0.8 },
      createdAt: '',
      locale: 'zh'
    };

    const rendered = await renderSingleFrame(mockFrame, mockIP, 'Anime');

    expect(rendered.status).toBe('completed');
    expect(rendered.imageUrl).toBeTruthy();
    expect(rendered.visualPromptEn).toContain('main character 喵七七');
    expect(rendered.visualPromptEn).toContain('3:4 vertical');
  }, 15000);

  it('should batch render an array of storyboard frames', async () => {
    const frames = [mockFrame, { ...mockFrame, id: 'f2', frameNumber: 2 }];
    const renderedList = await renderAllFrames(frames, undefined, 'Cyberpunk');

    expect(renderedList.length).toBe(2);
    expect(renderedList[0].status).toBe('completed');
    expect(renderedList[1].status).toBe('completed');
  }, 15000);

  it('should return trace logs, timestamps and batch image structures from serverCliGenerator mock path', async () => {
    const { generateImageViaServerCli } = await import('../lib/render/serverCliGenerator');
    const result = await generateImageViaServerCli('A cute chibi cat barista', { count: 2 });

    expect(result.traceLogs).toBeDefined();
    expect(result.traceLogs.length).toBeGreaterThan(0);
    expect(result.generatedAt).toBeDefined();
    expect(typeof result.elapsedMs).toBe('number');
    expect(Array.isArray(result.imageUrls)).toBe(true);
  });
});


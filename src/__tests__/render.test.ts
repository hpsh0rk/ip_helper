import { describe, it, expect } from 'vitest';
import { renderSingleFrame, renderAllFrames } from '../lib/render/imageEngine';
import { StoryboardFrame, IPProfile, StoryScript } from '../types';

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
      name: '测试小猫',
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
    expect(rendered.visualPromptEn).toContain('main character 测试小猫');
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

  it('should use base image from character asset library and scene composition description', async () => {
    const { renderSingleFrameServer } = await import('../lib/render/serverFrameRenderer');
    const ipWithAssets: IPProfile = {
      id: 'ip-asset-tester',
      name: '小芝麻',
      archetype: '软萌烘焙师',
      visualAnchors: { hair: '白毛', clothing: '粉色围裙', accessories: '', colorPalette: [], distinctiveFeatures: '' },
      personality: { traits: [], tagline: '', catchphrase: '', flawOrConflict: '' },
      worldview: '甜品屋',
      stylePreset: '3D Clay',
      avatarUrl: 'https://example.com/base_avatar.png',
      assets: [{ id: 'a1', url: 'https://example.com/base_asset.png', prompt: '', tags: ['front'], createdAt: '' }],
      turnaroundSheets: {},
      expressionSheets: [],
      loraWeights: { face: 0.8, costume: 0.8, style: 0.8 },
      createdAt: '',
      locale: 'zh'
    };

    const sceneFrame: StoryboardFrame = {
      id: 'f-scene',
      frameNumber: 1,
      title: 'P1 翻车现场',
      visualPrompt: '清晨在柜台前做蛋糕不小心把面粉打翻',
      visualPromptEn: '',
      narration: '面粉飞起来了',
      dialogue: '哇！',
      imageUrl: '',
      isCover: true,
      status: 'idle'
    };

    const rendered = await renderSingleFrameServer(sceneFrame, ipWithAssets, '3D Clay', 'image-to-image', 'https://example.com/base_asset.png');
    expect(rendered.status).toBe('completed');
    expect(rendered.imageUrl).toBeTruthy();
    expect(rendered.visualPromptEn).toContain('featuring the character from the reference image');
    expect(rendered.visualPromptEn).toContain('in 3D Clay style');
    expect(rendered.visualPromptEn).toContain('single standalone image');
    expect(rendered.visualPromptEn).toContain('no split screen');
  });

  it('should auto-persist each rendered frame to disk in renderAllFramesServer', async () => {
    const { renderAllFramesServer } = await import('../lib/render/serverFrameRenderer');
    const { getStoryById, saveStory, saveIP } = await import('../lib/db/fileDb.server');

    const testIP: IPProfile = {
      id: 'ip-pipeline-ip',
      name: '流水线测试猫',
      archetype: '小猫',
      visualAnchors: { hair: '', clothing: '', accessories: '', colorPalette: [], distinctiveFeatures: '' },
      personality: { traits: [], tagline: '', catchphrase: '', flawOrConflict: '' },
      worldview: '',
      stylePreset: '3D Clay',
      avatarUrl: '',
      assets: [],
      turnaroundSheets: {},
      expressionSheets: [],
      loraWeights: { face: 0.8, costume: 0.8, style: 0.8 },
      createdAt: '',
      locale: 'zh'
    };
    saveIP(testIP);

    const testStory: StoryScript = {
      id: 'story-pipeline-test',
      ipId: testIP.id,
      title: '测试故事',
      summary: '故事简介',
      topic: '测试流水线',
      frames: [
        { ...mockFrame, id: 'f-pipe-1', frameNumber: 1, imageUrl: '', status: 'idle' as const },
        { ...mockFrame, id: 'f-pipe-2', frameNumber: 2, imageUrl: '', status: 'idle' as const }
      ],
      xhsTitleOptions: ['标题1'],
      xhsSelectedTitle: '标题1',
      xhsContent: '正文内容',
      xhsTags: ['#测试'],
      coverOverlay: {
        mainTitle: '封面大标题',
        subtitle: '副标题',
        badgeText: 'HOT',
        textColor: '#FFFFFF',
        bgColor: '#000000',
        fontSize: 24,
        position: 'bottom'
      },
      createdAt: new Date().toISOString(),
      locale: 'zh'
    };
    saveStory(testStory);

    const renderedList = await renderAllFramesServer(testStory.frames, testIP, '3D Clay', 'text-to-image', undefined, testStory.id);
    expect(renderedList.length).toBe(2);
    expect(renderedList[0].status).toBe('completed');
    expect(renderedList[1].status).toBe('completed');

    // Verify story from disk immediately contains the generated images
    const saved = getStoryById(testStory.id);
    expect(saved).toBeDefined();
    expect(saved?.frames[0].imageUrl).toBeTruthy();
    expect(saved?.frames[1].imageUrl).toBeTruthy();
  });
});


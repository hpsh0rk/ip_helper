import { describe, it, expect } from 'vitest';
import { processAgentChat, generateStoryboardForIP } from '../lib/agent/engine';
import { IPProfile } from '../types';

describe('Agent Orchestration & Xiaohongshu Rhythm Engine', () => {
  it('should extract structured IP profile from natural language creation request', () => {
    const result = processAgentChat(
      '帮我创建一个爱喝奶茶但天天想减肥的打工人小猫 IP',
      [],
      undefined,
      'zh'
    );

    expect(result.actionType).toBe('ip_created');
    expect(result.extractedIP).toBeDefined();
    expect(result.extractedIP?.name).toContain('喵');
    expect(result.extractedIP?.visualAnchors?.hair).toBeDefined();
    expect(result.extractedIP?.visualAnchors?.clothing).toBeDefined();
    expect(result.reply).toContain('构建并沉淀');
  });

  it('should generate 6-panel storyboard matching Xiaohongshu pacing', () => {
    const mockIP: IPProfile = {
      id: 'test-ip-01',
      name: '喵七七',
      archetype: '小猫咖啡师',
      visualAnchors: {
        hair: '银灰色短毛',
        clothing: '咖啡师皮围裙',
        accessories: '黑框眼镜',
        colorPalette: ['#8B5A2B'],
        distinctiveFeatures: '圆脸'
      },
      personality: {
        traits: ['元气'],
        tagline: '加油',
        catchphrase: '喵呜',
        flawOrConflict: '容易手抖'
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

    const story = generateStoryboardForIP(mockIP, '第一天上班翻车', 'zh');

    expect(story.frames.length).toBe(6);
    expect(story.frames[0].isCover).toBe(true);
    expect(story.frames[0].title).toContain('P1');
    expect(story.xhsTitleOptions.length).toBeGreaterThanOrEqual(3);
    expect(story.xhsContent).toContain('🐱');
    expect(story.xhsContent).toContain('评论区');
    expect(story.coverOverlay.mainTitle).toBeDefined();
    expect(story.xhsTags.length).toBeGreaterThanOrEqual(4);
  });

  it('should dynamically extract completely arbitrary IP characters like Shiba Inu Farmer', () => {
    const result = processAgentChat(
      '帮我创建一个戴草帽开拖拉机的柴犬农场主IP，名叫阿柴，穿背带裤，爱吃西瓜，3D黏土风',
      [],
      undefined,
      'zh'
    );

    expect(result.actionType).toBe('ip_created');
    expect(result.extractedIP).toBeDefined();
    expect(result.extractedIP?.name).toContain('阿柴');
    expect(result.extractedIP?.visualAnchors?.clothing).toContain('背带裤');
    expect(result.extractedIP?.visualAnchors?.accessories).toContain('草帽');
    expect(result.extractedIP?.stylePreset).toBe('3D Clay');
  });

  it('should dynamically generate custom story tailored to custom character and arbitrary topic', () => {
    const customIP: IPProfile = {
      id: 'custom-shiba',
      name: '阿柴',
      archetype: '柴犬农场主',
      visualAnchors: {
        hair: '金黄色毛发',
        clothing: '浅蓝色背带裤',
        accessories: '草帽',
        colorPalette: ['#FFA500'],
        distinctiveFeatures: '黑豆眼'
      },
      personality: {
        traits: ['憨厚', '贪吃'],
        tagline: '种出全宇宙最甜的西瓜！',
        catchphrase: '汪呜！',
        flawOrConflict: '经常为了偷吃西瓜而把拖拉机开进沟里'
      },
      worldview: '阳光农场',
      stylePreset: '3D Clay',
      avatarUrl: '',
      assets: [],
      turnaroundSheets: {},
      expressionSheets: [],
      loraWeights: { face: 0.8, costume: 0.8, style: 0.8 },
      createdAt: '',
      locale: 'zh'
    };

    const story = generateStoryboardForIP(customIP, '拖拉机翻进水沟抓鱼', 'zh');
    expect(story.title).toContain('阿柴');
    expect(story.title).toContain('拖拉机翻进水沟抓鱼');
    expect(story.frames[0].visualPrompt).toContain('阿柴');
    expect(story.frames[0].visualPrompt).toContain('浅蓝色背带裤');
    expect(story.xhsSelectedTitle).toContain('阿柴');
    expect(story.xhsSelectedTitle).toContain('拖拉机翻进水沟抓鱼');
  });
});

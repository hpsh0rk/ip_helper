import { describe, it, expect } from 'vitest';
import { POST } from '../app/api/prompt/optimize/route';
import { NextRequest } from 'next/server';
import { IPProfile } from '../types';

describe('AI Prompt Optimization API & Engine', () => {
  const mockIP: IPProfile = {
    id: 'ip-test-xiaojiu',
    name: '小酒',
    archetype: '治愈系日常伙伴',
    visualAnchors: {
      hair: '浅金色蓬松短发',
      clothing: '米白色日常卫衣',
      accessories: '挂在脖子上的小相机',
      colorPalette: ['#FFE4B5', '#87CEEB'],
      distinctiveFeatures: '圆脸大眼睛'
    },
    personality: {
      traits: ['乐观', '好奇'],
      tagline: '今天也是美好的一天',
      catchphrase: '冲鸭！',
      flawOrConflict: '偶尔手忙脚乱'
    },
    worldview: '温馨小镇',
    stylePreset: '3D Clay',
    avatarUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400',
    assets: [],
    turnaroundSheets: {},
    expressionSheets: [],
    loraWeights: { face: 0.85, costume: 0.8, style: 0.85 },
    createdAt: new Date().toISOString(),
    locale: 'zh'
  };

  it('should optimize a complex user storyboard prompt in Text-to-Image mode', async () => {
    const userPrompt = '清晨温暖阳光洒下，小酒带着日常装扮，元气满满准备开展新计划';
    const req = new NextRequest('http://localhost:3000/api/prompt/optimize', {
      method: 'POST',
      body: JSON.stringify({
        visualPrompt: userPrompt,
        ipProfile: mockIP,
        stylePreset: '3D Clay',
        mode: 'text-to-image'
      })
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.promptEn).toContain('main character 小酒');
    expect(data.promptEn).toContain('early morning');
    expect(data.promptEn).toContain('warm golden morning sunlight streaming down');
    expect(data.promptEn).toContain('wearing cute casual everyday outfit');
    expect(data.promptEn).toContain('full of vibrant energy');
    expect(data.promptEn).toContain('start a brand new project and plan');
    expect(data.promptEn).toContain('3D claymation');
  });

  it('should optimize prompt in Image-to-Image mode featuring reference image', async () => {
    const userPrompt = '清晨温暖阳光洒下，小酒带着日常装扮，元气满满准备开展新计划';
    const req = new NextRequest('http://localhost:3000/api/prompt/optimize', {
      method: 'POST',
      body: JSON.stringify({
        visualPrompt: userPrompt,
        ipProfile: mockIP,
        stylePreset: '3D Clay',
        mode: 'image-to-image'
      })
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.promptEn).toContain('early morning');
    expect(data.promptEn).toContain('warm golden morning sunlight streaming down');
    expect(data.promptEn).toContain('featuring the character from the reference image');
    expect(data.promptEn).toContain('in 3D Clay style');
  });

  it('should reject requests without visualPrompt', async () => {
    const req = new NextRequest('http://localhost:3000/api/prompt/optimize', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });
});

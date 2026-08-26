import { describe, it, expect } from 'vitest';
import { getIPs, getIPById, saveIP, deleteIP, getStories, getStoryById, saveStory, deleteStory } from '../lib/db/fileDb.server';
import { IPProfile, StoryScript } from '../types';

describe('Database Storage & CRUD', () => {
  it('should retrieve initial IP profiles', () => {
    const ips = getIPs();
    expect(ips.length).toBeGreaterThanOrEqual(1);
    expect(ips.some(ip => ip.name.includes('喵七七'))).toBe(true);
  });

  it('should save, update and delete an IP profile', () => {
    const newIP: IPProfile = {
      id: 'test-custom-ip',
      name: '小虎 (Tiger)',
      archetype: '丛林探险家',
      visualAnchors: {
        hair: '条纹毛发',
        clothing: '迷彩马甲',
        accessories: '望远镜',
        colorPalette: ['#FFA500'],
        distinctiveFeatures: '虎牙'
      },
      personality: {
        traits: ['勇敢'],
        tagline: '出发！',
        catchphrase: '吼！',
        flawOrConflict: '路痴'
      },
      worldview: '原始森林',
      stylePreset: '3D Clay',
      avatarUrl: '',
      assets: [],
      turnaroundSheets: {},
      expressionSheets: [],
      loraWeights: { face: 0.8, costume: 0.8, style: 0.8 },
      createdAt: new Date().toISOString(),
      locale: 'zh'
    };

    saveIP(newIP);
    expect(getIPById('test-custom-ip')?.name).toBe('小虎 (Tiger)');

    // Update IP
    const updatedIP = { ...newIP, name: '小虎船长' };
    saveIP(updatedIP);
    expect(getIPById('test-custom-ip')?.name).toBe('小虎船长');

    deleteIP('test-custom-ip');
    expect(getIPById('test-custom-ip')).toBeUndefined();
  });

  it('should retrieve, save, update and delete story scripts', () => {
    const stories = getStories();
    expect(stories.length).toBeGreaterThanOrEqual(1);
    expect(stories[0].frames.length).toBe(6);

    const customStory: StoryScript = {
      id: 'test-story-crud',
      ipId: 'test-ip',
      title: '测试分镜剧本',
      summary: '剧情概述',
      topic: '测试主题',
      frames: [],
      xhsTitleOptions: ['标题1', '标题2'],
      xhsSelectedTitle: '标题1',
      xhsContent: '测试正文内容',
      xhsTags: ['#测试'],
      coverOverlay: {
        mainTitle: '主标题',
        subtitle: '副标题',
        badgeText: '推荐',
        textColor: '#FFFFFF',
        bgColor: '#FF5757',
        fontSize: 24,
        position: 'bottom'
      },
      createdAt: new Date().toISOString(),
      locale: 'zh'
    };

    saveStory(customStory);
    expect(getStoryById('test-story-crud')?.title).toBe('测试分镜剧本');

    // Update story
    const updated = { ...customStory, title: '已更新分镜剧本' };
    saveStory(updated);
    expect(getStoryById('test-story-crud')?.title).toBe('已更新分镜剧本');

    deleteStory('test-story-crud');
    expect(getStoryById('test-story-crud')).toBeUndefined();
  });

  it('should allow deleting all characters down to zero and persist across file reads', () => {
    const all = getIPs();
    const ids = all.map(i => i.id);
    // Delete all
    ids.forEach(id => deleteIP(id));
    expect(getIPs().length).toBe(0);

    // Save a new single character
    const single: IPProfile = {
      id: 'solo-ip',
      name: '独苗角色',
      archetype: '独行侠',
      visualAnchors: { hair: '', clothing: '', accessories: '', colorPalette: [], distinctiveFeatures: '' },
      personality: { traits: [], tagline: '', catchphrase: '', flawOrConflict: '' },
      worldview: '',
      stylePreset: '3D Clay',
      avatarUrl: '',
      assets: [],
      turnaroundSheets: {},
      expressionSheets: [],
      loraWeights: { face: 0.8, costume: 0.8, style: 0.8 },
      createdAt: new Date().toISOString(),
      locale: 'zh'
    };
    saveIP(single);
    expect(getIPs().length).toBe(1);

    // Deleting the single remaining character should succeed
    deleteIP('solo-ip');
    expect(getIPs().length).toBe(0);

    // Restore initial profiles for other tests
    all.forEach(ip => saveIP(ip));
    expect(getIPs().length).toBe(all.length);
  });
});

import { describe, it, expect } from 'vitest';
import { getIPs, getIPById, saveIP, deleteIP, clearAllIPs, getStories, getStoryById, saveStory, deleteStory, clearAllStories } from '../lib/db/fileDb.server';
import { IPProfile, StoryScript } from '../types';

describe('Database Storage & CRUD', () => {
  it('should retrieve IP profiles array', () => {
    const ips = getIPs();
    expect(Array.isArray(ips)).toBe(true);
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
    // Ensure parent IP exists for the story
    saveIP({
      id: 'test-ip',
      name: '剧本测试角色',
      archetype: '测试角色',
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
    });

    const stories = getStories();
    expect(Array.isArray(stories)).toBe(true);

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

  it('should clear all IP profiles using clearAllIPs()', () => {
    saveIP({
      id: 'test-to-clear',
      name: '待清空角色',
      archetype: '测试角色',
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
    });
    expect(getIPs().length).toBeGreaterThanOrEqual(1);

    const cleared = clearAllIPs();
    expect(cleared).toBe(true);
    expect(getIPs().length).toBe(0);
  });

  it('should auto-prune orphan stories whose IP does not exist and cascade delete stories', () => {
    // 1. Create a character and a story for it
    const testIP: IPProfile = {
      id: 'ip-for-story-test',
      name: '故事测试角色',
      archetype: '故事测试',
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
    saveIP(testIP);

    const testStory: StoryScript = {
      id: 'story-for-ip-test',
      ipId: 'ip-for-story-test',
      title: '测试分镜故事',
      topic: '测试主题',
      summary: '分镜概要',
      frames: [],
      xhsTitleOptions: ['标题1'],
      xhsSelectedTitle: '标题1',
      xhsContent: '文案内容',
      xhsTags: ['#测试'],
      coverOverlay: {
        mainTitle: '大标题',
        subtitle: '小标题',
        badgeText: '标签',
        textColor: '#fff',
        bgColor: '#000',
        fontSize: 24,
        position: 'bottom'
      },
      createdAt: new Date().toISOString(),
      locale: 'zh'
    };
    saveStory(testStory);
    expect(getStories().some(s => s.id === 'story-for-ip-test')).toBe(true);

    // 2. Deleting the IP should cascade delete the associated story
    deleteIP('ip-for-story-test');
    expect(getIPById('ip-for-story-test')).toBeUndefined();
    expect(getStories().some(s => s.id === 'story-for-ip-test')).toBe(false);

    // 3. If an orphaned story is saved pointing to a non-existent IP, getStories should prune it
    const orphanStory: StoryScript = {
      ...testStory,
      id: 'orphan-story-id',
      ipId: 'non-existent-ip-999'
    };
    saveStory(orphanStory);
    // getStories will check IP list and filter out non-existent IP's stories
    const filteredStories = getStories();
    expect(filteredStories.some(s => s.id === 'orphan-story-id')).toBe(false);

    // 4. clearAllStories should clear all stories
    saveIP(testIP);
    saveStory({ ...testStory, id: 'story-to-clear' });
    expect(getStories().length).toBeGreaterThanOrEqual(1);
    clearAllStories();
    expect(getStories().length).toBe(0);
    deleteIP('ip-for-story-test');
  });

  it('should save and persist a newly created IP even if archetype is empty', () => {
    const freshDraft: IPProfile = {
      id: 'ip-newly-created-user-test',
      name: '小狐狸阿狸',
      description: '爱吃草莓大福的灵狐少女',
      backstory: '来自青丘的调皮小狐狸',
      archetype: '', // empty archetype from UI
      visualAnchors: { hair: '橘红色绒毛', clothing: '红色日式羽织', accessories: '草莓发夹', colorPalette: ['#FF6B6B'], distinctiveFeatures: '九条毛茸茸的尾巴' },
      personality: { traits: ['可爱', '调皮'], tagline: '', catchphrase: '', flawOrConflict: '' },
      worldview: '',
      stylePreset: '3D Clay',
      avatarUrl: '',
      assets: [],
      turnaroundSheets: {},
      expressionSheets: [],
      loraWeights: { face: 0.85, costume: 0.8, style: 0.85 },
      createdAt: new Date().toISOString(),
      locale: 'zh'
    };

    saveIP(freshDraft);
    const retrieved = getIPById('ip-newly-created-user-test');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('小狐狸阿狸');
    expect(retrieved?.description).toBe('爱吃草莓大福的灵狐少女');

    // Clean up
    deleteIP('ip-newly-created-user-test');
    expect(getIPById('ip-newly-created-user-test')).toBeUndefined();
  });
});

import { describe, it, expect } from 'vitest';
import { translations } from '../lib/i18n/translations';
import { compileDiffusionPrompt, translateAndRefineChinesePrompt } from '../lib/i18n/promptTranslator';
import { IPProfile } from '../types';

describe('Internationalization (i18n) & Prompt Translation', () => {
  it('should have parity between Chinese and English translation keys', () => {
    expect(translations.zh.app.name).toBe('IP Helper');
    expect(translations.en.app.name).toBe('IP Helper');

    expect(Object.keys(translations.zh.nav)).toEqual(Object.keys(translations.en.nav));
    expect(Object.keys(translations.zh.chat)).toEqual(Object.keys(translations.en.chat));
    expect(Object.keys(translations.zh.workbench)).toEqual(Object.keys(translations.en.workbench));
    expect(Object.keys(translations.zh.xhs)).toEqual(Object.keys(translations.en.xhs));
    expect(Object.keys(translations.zh.bible)).toEqual(Object.keys(translations.en.bible));
  });

  it('should compile Chinese scene descriptions into high-quality English diffusion prompts', () => {
    const mockIP: IPProfile = {
      id: 'test-ip',
      name: 'Miao Qiqi',
      archetype: 'cat barista',
      visualAnchors: {
        hair: 'silver gradient fur',
        clothing: 'brown barista apron',
        accessories: 'round glasses',
        colorPalette: ['#8B5A2B'],
        distinctiveFeatures: 'chubby cheeks'
      },
      personality: {
        traits: ['energetic'],
        tagline: 'Stay cute',
        catchphrase: 'Meow',
        flawOrConflict: 'clumsy'
      },
      worldview: 'Cafe street',
      stylePreset: '3D Clay',
      avatarUrl: '',
      assets: [],
      turnaroundSheets: {},
      expressionSheets: [],
      loraWeights: { face: 0.8, costume: 0.8, style: 0.8 },
      createdAt: '',
      locale: 'zh'
    };

    const sceneZh = '小猫在咖啡馆打翻了奶泡，惊慌失措';
    const { promptEn, negativePrompt } = compileDiffusionPrompt(sceneZh, mockIP, '3D Clay');

    expect(promptEn).toContain('main character Miao Qiqi');
    expect(promptEn).toContain('silver gradient fur');
    expect(promptEn).toContain('brown barista apron');
    expect(promptEn).toContain('3:4 vertical vertical portrait');
    expect(promptEn).toContain('3D claymation');
    expect(negativePrompt).toContain('lowres, bad anatomy');
  });

  it('should accurately translate user storyboard scene: 清晨温暖阳光洒下，小酒带着日常装扮，元气满满准备开展新计划', () => {
    const userScene = '清晨温暖阳光洒下，小酒带着日常装扮，元气满满准备开展新计划';
    const translated = translateAndRefineChinesePrompt(userScene);

    expect(translated).toContain('early morning');
    expect(translated).toContain('warm golden morning sunlight streaming down');
    expect(translated).toContain('wearing cute casual everyday outfit');
    expect(translated).toContain('full of vibrant energy');
    expect(translated).toContain('start a brand new project and plan');

    const customIP: IPProfile = {
      id: 'test-ip-xiaojiu',
      name: '小酒',
      archetype: '小酒',
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

    const compiled = compileDiffusionPrompt(userScene, customIP, '3D Clay');
    expect(compiled.promptEn).toContain('main character 小酒');
    expect(compiled.promptEn).toContain('early morning');
    expect(compiled.promptEn).toContain('warm golden morning sunlight streaming down');
    expect(compiled.promptEn).toContain('wearing cute casual everyday outfit');
    expect(compiled.promptEn).toContain('full of vibrant energy');
    expect(compiled.promptEn).toContain('3D claymation');
  });

  it('should correctly handle substitution prompts like 把小狗换为小熊 without golden retriever contamination', () => {
    const prompt = translateAndRefineChinesePrompt('把小狗换为小熊');
    expect(prompt).toContain('teddy bear');
    expect(prompt).not.toContain('golden retriever');
    expect(prompt).not.toContain('puppy');
  });
});

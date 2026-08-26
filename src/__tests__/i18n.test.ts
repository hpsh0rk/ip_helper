import { describe, it, expect } from 'vitest';
import { translations } from '../lib/i18n/translations';
import { compileDiffusionPrompt } from '../lib/i18n/promptTranslator';
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
});

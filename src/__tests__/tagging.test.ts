import { describe, it, expect } from 'vitest';
import { aiInferTags, searchTags, getTagInfo, SYSTEM_PRESET_TAGS } from '../lib/render/taggingEngine';
import { TagDefinition } from '../types';

describe('AI Tagging Engine & Multi-Tag System', () => {
  it('should accurately infer multi-tags from complex prompts (angle, style, type, emotion)', () => {
    const prompt = 'Pop Mart 3D clay blind box figurine of cute cat barista, front view facing camera, cheerful smile portrait, 8k render';
    const tags = aiInferTags(prompt);

    expect(tags).toContain('front');
    expect(tags).toContain('3d_clay');
    expect(tags).toContain('avatar');
    expect(tags).toContain('happy');
  });

  it('should infer tags for panic expressions and side views', () => {
    const prompt = 'Cat barista losing balance and spilling milk, side profile 90 degree view, hilarious shocked expression, comical panic face';
    const tags = aiInferTags(prompt);

    expect(tags).toContain('side');
    expect(tags).toContain('panic');
    expect(tags).toContain('expression');
  });

  it('should infer tags for uploaded files based on filename and image context', () => {
    const fileName = 'cute_cyberpunk_boy_back_view_scene.png';
    const tags = aiInferTags('', fileName);

    expect(tags).toContain('back');
    expect(tags).toContain('cyberpunk');
    expect(tags).toContain('scene');
  });

  it('should match user-defined custom tags seamlessly', () => {
    const customTags: TagDefinition[] = [
      { id: 'custom-tractor', label: '开拖拉机', category: 'custom' },
      { id: 'custom-watermelon', label: '吃西瓜', category: 'custom' }
    ];

    const prompt = 'Shiba inu farmer driving yellow tractor in the field';
    const tags = aiInferTags(prompt, undefined, customTags);

    expect(tags).toContain('custom-tractor');
  });

  it('should search existing tags with deduplication awareness', () => {
    const results = searchTags('侧', SYSTEM_PRESET_TAGS);
    expect(results.some(r => r.id === 'side')).toBe(true);
    expect(results.some(r => r.id === 'three_quarter')).toBe(true);

    const clayResults = searchTags('clay', SYSTEM_PRESET_TAGS);
    expect(clayResults.some(r => r.id === '3d_clay')).toBe(true);
  });

  it('should resolve tag info and colors properly', () => {
    const frontInfo = getTagInfo('front');
    expect(frontInfo.label).toContain('正视图');
    expect(frontInfo.category).toBe('angle');

    const customInfo = getTagInfo('农场私服');
    expect(customInfo.label).toBe('农场私服');
    expect(customInfo.category).toBe('custom');
  });
});

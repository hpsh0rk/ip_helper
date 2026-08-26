import { describe, it, expect } from 'vitest';
import { getAllSkills, buildSystemPromptWithSkills } from '../lib/skills/loader';

describe('Skills Hub Engine', () => {
  it('should load all built-in and local skills correctly', () => {
    const skills = getAllSkills();
    expect(skills.length).toBeGreaterThanOrEqual(3);

    const xhsSkill = skills.find(s => s.id === 'agency-xiaohongshu-specialist');
    expect(xhsSkill).toBeDefined();
    expect(xhsSkill?.title).toContain('小红书');
    expect(xhsSkill?.category).toBe('marketing');

    const imageSkill = skills.find(s => s.id === 'agency-image-prompt-engineer');
    expect(imageSkill).toBeDefined();
    expect(imageSkill?.category).toBe('visual');
  });

  it('should inject active skills into the agent system prompt', () => {
    const basePrompt = 'You are an IP assistant.';
    const enhanced = buildSystemPromptWithSkills(basePrompt, ['agency-xiaohongshu-specialist']);

    expect(enhanced).toContain('You are an IP assistant.');
    expect(enhanced).toContain('Active Domain Skills');
    expect(enhanced).toContain('小红书');
  });

  it('should return base prompt when no active skills provided', () => {
    const basePrompt = 'Base Prompt';
    const result = buildSystemPromptWithSkills(basePrompt, []);
    expect(result).toBe(basePrompt);
  });
});

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('UI Workflow Refinement Verifications', () => {
  const characterManagerPath = path.join(__dirname, '../components/CharacterManager.tsx');
  const storyStudioPath = path.join(__dirname, '../components/StoryStudio.tsx');
  const pagePath = path.join(__dirname, '../app/page.tsx');

  it('1 & 2: CharacterManager should have only the bottom save button, which redirects to visual_studio', () => {
    const content = fs.readFileSync(characterManagerPath, 'utf-8');

    // 1. Check occurrences of "保存角色档案"
    const matches = content.match(/保存角色档案/g) || [];
    // Should now only appear once (the bottom button)
    expect(matches.length).toBe(1);

    // 2. Check that the bottom save button triggers setActiveWorkspaceTab('visual_studio')
    expect(content).toContain("setActiveWorkspaceTab('visual_studio')");
  });

  it('3: Top action button "去故事工坊创作" does not duplicate primary violet highlight against active tab', () => {
    const content = fs.readFileSync(characterManagerPath, 'utf-8');

    // Sub-tab active state is bg-violet-600
    // "去故事工坊创作" top button should have neutral background (bg-zinc-900) instead of active tab highlight
    expect(content).toMatch(/<button[\s\S]*?onClick=\{\(\) => \{[\s\S]*?onGoToStoryStudio\(activeEditingIP\);[\s\S]*?className="flex items-center gap-1\.5 px-3\.5 py-1\.5 rounded-xl bg-zinc-900/);
  });

  it('4: StoryStudio should not contain AIChatPane ("AI 创作助理")', () => {
    const studioContent = fs.readFileSync(storyStudioPath, 'utf-8');

    // StoryStudio should not import or render AIChatPane
    expect(studioContent).not.toContain('AIChatPane');
    expect(studioContent).not.toContain('chatMessages');

    // StoryStudio should have a clean 2-Column layout
    expect(studioContent).toContain('2-Column Studio Workspace');
    expect(studioContent).toContain('StoryboardCanvas');
    expect(studioContent).toContain('XhsPreviewPane');
  });
});

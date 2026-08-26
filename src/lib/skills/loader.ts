import fs from 'fs';
import path from 'path';
import { Skill } from '@/types';

function parseFrontmatter(fileContent: string): { data: Record<string, string>; content: string } {
  const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { data: {}, content: fileContent };
  }

  const rawMeta = match[1];
  const content = match[2];
  const data: Record<string, string> = {};

  const lines = rawMeta.split('\n');
  let currentKey = '';
  let currentValue = '';

  for (const line of lines) {
    const keyMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (keyMatch) {
      if (currentKey) {
        data[currentKey] = currentValue.trim();
      }
      currentKey = keyMatch[1];
      currentValue = keyMatch[2];
    } else if (currentKey) {
      currentValue += ' ' + line.trim();
    }
  }

  if (currentKey) {
    data[currentKey] = currentValue.trim();
  }

  return { data, content };
}

export function loadSkillsFromDirectory(dirPath: string): Skill[] {
  const skills: Skill[] = [];
  if (!fs.existsSync(dirPath)) {
    return skills;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillMdPath = path.join(dirPath, entry.name, 'SKILL.md');
      if (fs.existsSync(skillMdPath)) {
        try {
          const raw = fs.readFileSync(skillMdPath, 'utf-8');
          const { data, content } = parseFrontmatter(raw);

          const name = data.name || entry.name;
          const description = data.description || '';
          
          let category: Skill['category'] = 'custom';
          if (name.includes('xiaohongshu') || name.includes('marketing')) {
            category = 'marketing';
          } else if (name.includes('image') || name.includes('visual')) {
            category = 'visual';
          } else if (name.includes('narrative') || name.includes('story')) {
            category = 'story';
          }

          let title = name
            .replace(/^agency-/, '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

          if (name.includes('xiaohongshu')) {
            title = '小红书爆款营销专家 (Xiaohongshu Specialist)';
          } else if (name.includes('image-prompt')) {
            title = 'AI 视觉提示词大师 (Image Prompt Engineer)';
          } else if (name.includes('narrative-designer')) {
            title = 'IP 故事与人设架构师 (Narrative Designer)';
          }

          skills.push({
            id: entry.name,
            name,
            title,
            description,
            systemPrompt: content.trim(),
            category,
            enabled: name.includes('xiaohongshu') || name.includes('image')
          });
        } catch (e) {
          console.error(`Failed to parse skill at ${skillMdPath}:`, e);
        }
      }
    }
  }

  return skills;
}

export function getAllSkills(): Skill[] {
  const localSkillsDir = path.join(process.cwd(), 'skills');
  const skills = loadSkillsFromDirectory(localSkillsDir);

  if (skills.length === 0) {
    // Built-in fallback skills
    return [
      {
        id: 'agency-xiaohongshu-specialist',
        name: 'agency-xiaohongshu-specialist',
        title: '小红书爆款营销专家 (Xiaohongshu Specialist)',
        description: '精通小红书算法机制、爆款封面心理学、3秒停留黄金法则、情绪共鸣文案与高权重Tag组合策略。',
        systemPrompt: '你是小红书营销与内容架构大师。你的职责是将故事与IP转化为极具网感、强共鸣、高收藏率的小红书图文内容。',
        category: 'marketing',
        enabled: true
      },
      {
        id: 'agency-image-prompt-engineer',
        name: 'agency-image-prompt-engineer',
        title: 'AI 视觉提示词大师 (Image Prompt Engineer)',
        description: '精通 Midjourney/Flux/SDXL 提示词工程，保持多分镜角色外貌、服装、艺术画风与光影的一致性。',
        systemPrompt: '你是顶级 AI 图像提示词专家。负责将中文场景描述转化为符合最高美学标准的英文生图 Prompt。',
        category: 'visual',
        enabled: true
      },
      {
        id: 'agency-narrative-designer',
        name: 'agency-narrative-designer',
        title: 'IP 故事与人设架构师 (Narrative Designer)',
        description: '擅长角色性格弧光构建、微反转情节设计与快节奏叙事分镜切分。',
        systemPrompt: '你是 IP 人设与故事架构大师，负责把控人设深度与小红书条漫分镜节奏。',
        category: 'story',
        enabled: false
      }
    ];
  }

  return skills;
}

export function buildSystemPromptWithSkills(basePrompt: string, activeSkillIds: string[] = []): string {
  const allSkills = getAllSkills();
  const activeSkills = allSkills.filter(s => activeSkillIds.includes(s.id));

  if (activeSkills.length === 0) {
    return basePrompt;
  }

  let prompt = `${basePrompt}\n\n=== 运行时已激活的专家技能 (Active Domain Skills) ===\n`;
  for (const skill of activeSkills) {
    prompt += `\n--- [Skill: ${skill.title}] ---\n`;
    prompt += `${skill.systemPrompt.slice(0, 1500)}\n`;
  }

  return prompt;
}

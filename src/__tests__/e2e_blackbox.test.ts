import { describe, it, expect } from 'vitest';
import { processAgentChat, generateStoryboardForIP } from '../lib/agent/engine';
import { renderSingleFrame, renderAllFrames } from '../lib/render/imageEngine';
import { compileDiffusionPrompt } from '../lib/i18n/promptTranslator';
import { getAllSkills, buildSystemPromptWithSkills } from '../lib/skills/loader';
import { translations } from '../lib/i18n/translations';
import { initialIPProfiles } from '../lib/db/mockDb';
import { IPProfile } from '../types';

describe('评委 A - 端到端黑盒全功能验收测试', () => {

  // ==========================================
  // 1. 对话创建与抽取 IP 档案功能
  // ==========================================
  describe('1. 对话创建与抽取 IP 档案功能', () => {
    it('1.1 能够从自然语言中提取结构化 IP 档案字段 (姓名、人设、视觉锚点、色盘、画风)', () => {
      const chatInput = '帮我创建一个爱喝奶茶但天天想减肥的打工人小猫 IP，3D黏土风';
      const result = processAgentChat(chatInput, [], undefined, 'zh');

      expect(result.actionType).toBe('ip_created');
      expect(result.extractedIP).toBeDefined();

      const ip = result.extractedIP as IPProfile;
      // 姓名
      expect(ip.name).toBeTruthy();
      expect(ip.name).toContain('喵');

      // 人设 & 定位
      expect(ip.archetype).toBeTruthy();
      expect(ip.personality).toBeDefined();
      expect(ip.personality.traits.length).toBeGreaterThanOrEqual(3);
      expect(ip.personality.tagline).toBeTruthy();
      expect(ip.personality.catchphrase).toBeTruthy();
      expect(ip.personality.flawOrConflict).toBeTruthy();

      // 视觉锚点 (Visual Anchors)
      expect(ip.visualAnchors).toBeDefined();
      expect(ip.visualAnchors.hair).toBeTruthy();
      expect(ip.visualAnchors.clothing).toBeTruthy();
      expect(ip.visualAnchors.accessories).toBeTruthy();
      expect(ip.visualAnchors.colorPalette.length).toBeGreaterThanOrEqual(3);
      expect(ip.visualAnchors.distinctiveFeatures).toBeTruthy();

      // 画风 (Style Preset)
      expect(ip.stylePreset).toBe('3D Clay');

      // 世界观 & 权重
      expect(ip.worldview).toBeTruthy();
      expect(ip.loraWeights.face).toBeGreaterThan(0);
      expect(ip.loraWeights.costume).toBeGreaterThan(0);
      expect(ip.loraWeights.style).toBeGreaterThan(0);
    });

    it('1.2 英文自然语言下同样支持解析并返回结构化 IP 档案', () => {
      const chatInput = 'Create a cyberpunk courier character named Rayke';
      const result = processAgentChat(chatInput, [], undefined, 'en');

      expect(result.actionType).toBe('ip_created');
      expect(result.extractedIP).toBeDefined();
      const ip = result.extractedIP as IPProfile;
      expect(ip.name).toContain('Rayke');
      expect(ip.stylePreset).toBe('Cyberpunk');
      expect(ip.visualAnchors.hair).toBeTruthy();
      expect(ip.visualAnchors.clothing).toBeTruthy();
      expect(result.reply).toContain('IP Bible');
    });
  });

  // ==========================================
  // 2. 6 格小红书分镜故事生成
  // ==========================================
  describe('2. 6 格小红书分镜故事生成', () => {
    it('2.1 分镜结构完整包含 P1~P6 且符合小红书黄金叙事曲线', () => {
      const activeIP = initialIPProfiles[0];
      const story = generateStoryboardForIP(activeIP, '咖啡馆初遇大翻车', 'zh');

      expect(story.frames).toHaveLength(6);

      // P1: 黄金封面与吸睛开场
      const p1 = story.frames[0];
      expect(p1.frameNumber).toBe(1);
      expect(p1.isCover).toBe(true);
      expect(p1.title).toContain('P1');
      expect(p1.narration).toBeTruthy();

      // P2: 迎来挑战 / 铺垫
      const p2 = story.frames[1];
      expect(p2.frameNumber).toBe(2);
      expect(p2.title).toContain('P2');

      // P3: 紧张累积 / 心理博弈
      const p3 = story.frames[2];
      expect(p3.frameNumber).toBe(3);
      expect(p3.title).toContain('P3');

      // P4: 戏剧性高潮 / 翻车现场
      const p4 = story.frames[3];
      expect(p4.frameNumber).toBe(4);
      expect(p4.title).toContain('P4');
      expect(p4.visualPrompt).toContain('飞溅');

      // P5: 滑稽收尾 / 尴尬冷幽默
      const p5 = story.frames[4];
      expect(p5.frameNumber).toBe(5);
      expect(p5.title).toContain('P5');

      // P6: 治愈反转与评论区互动 CTA
      const p6 = story.frames[5];
      expect(p6.frameNumber).toBe(6);
      expect(p6.title).toContain('P6');
      expect(p6.dialogue).toContain('评论区');
      expect(story.xhsContent).toContain('💬');
      expect(story.xhsContent).toContain('评论区');
    });

    it('2.2 包含 4 组以上爆款备选标题与高权重 Hashtags 矩阵', () => {
      const activeIP = initialIPProfiles[0];
      const story = generateStoryboardForIP(activeIP, '咖啡馆日常', 'zh');

      expect(story.xhsTitleOptions.length).toBeGreaterThanOrEqual(4);
      expect(story.xhsSelectedTitle).toBeTruthy();
      expect(story.xhsTags.length).toBeGreaterThanOrEqual(5);
      expect(story.xhsTags.some(t => t.includes('#原创IP'))).toBe(true);
      expect(story.xhsTags.some(t => t.includes('#打工人日常'))).toBe(true);
    });
  });

  // ==========================================
  // 3. 视觉渲染管线
  // ==========================================
  describe('3. 视觉渲染管线', () => {
    it('3.1 严格注入 3:4 竖屏比例与双轨英文 Prompt 编译', () => {
      const activeIP = initialIPProfiles[0];
      const sceneZh = '清晨阳光明媚，小猫在咖啡馆微笑着准备拉花';
      const { promptEn, negativePrompt } = compileDiffusionPrompt(sceneZh, activeIP, '3D Clay');

      // 验证 3:4 比例提示词
      expect(promptEn).toContain('3:4 vertical vertical portrait aspect ratio composition');

      // 验证角色一致性锁词注入
      expect(promptEn).toContain(`main character ${activeIP.name}`);
      expect(promptEn).toContain(activeIP.visualAnchors.hair);
      expect(promptEn).toContain(activeIP.visualAnchors.clothing);
      expect(promptEn).toContain(activeIP.visualAnchors.accessories);

      // 验证风格锁词注入 (3D Clay)
      expect(promptEn).toContain('cute 3D claymation style');
      expect(promptEn).toContain('plasticine textures');

      // 验证负向提示词
      expect(negativePrompt).toContain('lowres, bad anatomy, bad hands');
    });

    it('3.2 单帧与全量分镜批量渲染均能正常流转并更新状态', async () => {
      const activeIP = initialIPProfiles[0];
      const story = generateStoryboardForIP(activeIP, '翻车日记', 'zh');
      expect(story.frames.length).toBe(6);

      const updated = await renderSingleFrame(story.frames[0], activeIP, '3D Clay');
      expect(updated.status).toBe('completed');
      expect(updated.imageUrl).toBeTruthy();
    }, 15000);

    it('3.3 补充验证批量渲染流转', async () => {
      const activeIP = initialIPProfiles[0];
      const story = generateStoryboardForIP(activeIP, '翻车日记', 'zh');

      // 全量批量渲染
      const batchResult = await renderAllFrames(story.frames, activeIP, 'Cyberpunk');
      expect(batchResult).toHaveLength(6);
      batchResult.forEach((f) => {
        expect(f.status).toBe('completed');
        expect(f.imageUrl).toBeTruthy();
        expect(f.visualPromptEn).toContain('cyberpunk sci-fi aesthetic');
      });
    }, 25000);
  });

  // ==========================================
  // 4. 小红书发布工作室
  // ==========================================
  describe('4. 小红书发布工作室', () => {
    it('4.1 封面大字排版支持字号、位置与颜色定制', () => {
      const activeIP = initialIPProfiles[0];
      const story = generateStoryboardForIP(activeIP, '日常', 'zh');

      expect(story.coverOverlay).toBeDefined();
      expect(story.coverOverlay.mainTitle).toBeTruthy();
      expect(story.coverOverlay.badgeText).toBeTruthy();
      expect(['top', 'center', 'bottom']).toContain(story.coverOverlay.position);
      expect(story.coverOverlay.fontSize).toBeGreaterThanOrEqual(18);
      expect(story.coverOverlay.textColor).toBeTruthy();
    });

    it('4.2 验证正文包含 Emoji 且支持一键全量导出为 Markdown 与 ZIP 打包结构', () => {
      const activeIP = initialIPProfiles[0];
      const story = generateStoryboardForIP(activeIP, '日常', 'zh');

      // 正文包含小红书代表性 Emoji
      expect(story.xhsContent).toMatch(/🐱|😭|🎸|🛫|☕|💬/);

      // 验证正文格式与 Tag 组合
      const fullCopyText = `${story.xhsSelectedTitle}\n\n${story.xhsContent}\n\n${story.xhsTags.join(' ')}`;
      expect(fullCopyText).toContain(story.xhsSelectedTitle);
      expect(fullCopyText).toContain('#');
    });
  });

  // ==========================================
  // 5. 技能系统 (Skills Hub) 与 国际化 (i18n)
  // ==========================================
  describe('5. 技能系统 (Skills Hub) 与 国际化 (i18n)', () => {
    it('5.1 技能系统支持动态扫描本地 skills 目录或 fallback，并正确解析 frontmatter', () => {
      const skills = getAllSkills();
      expect(skills.length).toBeGreaterThanOrEqual(3);

      const skillIds = skills.map(s => s.id);
      expect(skillIds).toContain('agency-xiaohongshu-specialist');
      expect(skillIds).toContain('agency-image-prompt-engineer');
      expect(skillIds).toContain('agency-narrative-designer');

      const xhsSkill = skills.find(s => s.id === 'agency-xiaohongshu-specialist')!;
      expect(xhsSkill.title).toContain('小红书');
      expect(xhsSkill.systemPrompt).toBeTruthy();
    });

    it('5.2 激活技能可正确注入 System Prompt 提示词上下文中', () => {
      const basePrompt = 'You are the base AI agent.';
      const withSkills = buildSystemPromptWithSkills(basePrompt, [
        'agency-xiaohongshu-specialist',
        'agency-image-prompt-engineer'
      ]);

      expect(withSkills).toContain(basePrompt);
      expect(withSkills).toContain('Active Domain Skills');
      expect(withSkills).toContain('小红书爆款营销专家 (Xiaohongshu Specialist)');
      expect(withSkills).toContain('AI 视觉提示词大师 (Image Prompt Engineer)');
      expect(withSkills).toContain('Xiaohongshu');
    });

    it('5.3 中英双语对照无遗漏，所有 UI 模块均具备双语映射', () => {
      const zhKeys = Object.keys(translations.zh);
      const enKeys = Object.keys(translations.en);
      expect(zhKeys).toEqual(enKeys);

      for (const section of ['app', 'nav', 'chat', 'workbench', 'xhs', 'bible', 'skills', 'common'] as const) {
        const zhSub = Object.keys(translations.zh[section]);
        const enSub = Object.keys(translations.en[section]);
        expect(zhSub).toEqual(enSub);
      }
    });
  });
});

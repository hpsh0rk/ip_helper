'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { IPProfile, StylePreset, CharacterAsset, TagDefinition } from '@/types';
import { 
  Plus, 
  Trash2, 
  ArrowRight, 
  Tag, 
  Image as ImageIcon, 
  Save, 
  Search, 
  User, 
  Wand2,
  CheckCircle2,
  Layers,
  Upload,
  Sparkles,
  Edit3,
  X,
  Check,
  Maximize2,
  Clipboard,
  Loader2,
  BookOpen,
  Palette,
  Heart,
  Compass,
  FileText,
  Copy
} from 'lucide-react';
import { SYSTEM_PRESET_TAGS, searchTags, getTagInfo, aiInferTags } from '@/lib/render/taggingEngine';
import { translateAndRefineChinesePrompt } from '@/lib/i18n/promptTranslator';
import { AssetTagEditModal } from '@/components/AssetTagEditModal';
import { ImageLightboxModal } from '@/components/ImageLightboxModal';

interface QuickTokenItem {
  id: string;
  label: string;
  token: string;
  category: 'angle' | 'style' | 'lighting' | 'emotion' | 'custom';
}

const DEFAULT_QUICK_TOKENS: QuickTokenItem[] = [
  // 视角构图
  { id: 'angle-front', label: '📐 正视图 (Front)', token: 'character sheet front view, facing camera directly, full body centered', category: 'angle' },
  { id: 'angle-side', label: '📐 侧视图 (Side)', token: 'character sheet side profile 90 degrees view, full body', category: 'angle' },
  { id: 'angle-back', label: '📐 后视图 (Back)', token: 'character sheet back view from behind 180 degrees, back of head', category: 'angle' },
  { id: 'angle-closeup', label: '📐 头部特写 (Close-up)', token: 'extreme close-up portrait, focusing on face and detailed expressions', category: 'angle' },

  // 材质画风
  { id: 'style-clay', label: '🎨 Pop Mart 3D黏土', token: 'Pop Mart 3D clay figurine blind box toy, soft clay texture, subtle handcrafted clay fingerprints, octane render, 8k', category: 'style' },
  { id: 'style-chibi', label: '🎨 2D千禧动漫', token: '2000s retro anime aesthetic, Studio Mirumo de Pon style, 2D hand-drawn cel-shaded anime, clean line art', category: 'style' },
  { id: 'style-cyber', label: '🎨 赛博朋克霓虹', token: 'cyberpunk 2077 aesthetic, volumetric neon glowing highlights, dark moody city backdrop, unreal engine 5 render', category: 'style' },
  { id: 'style-ghibli', label: '🎨 吉卜力水彩', token: 'Studio Ghibli aesthetic, hand-painted watercolor textures, warm sunlight, Hayao Miyazaki charm', category: 'style' },

  // 摄影光影
  { id: 'light-studio', label: '💡 摄影棚立体雕刻光', token: 'soft warm studio lighting, 3d sculpted chiaroscuro, gentle rim light, perfect ambient occlusion', category: 'lighting' },
  { id: 'light-solid-bg', label: '💡 纯色马卡龙背景', token: 'clean solid pastel background, isolated subject, minimalist composition', category: 'lighting' },
  { id: 'light-tyndall', label: '💡 丁达尔体积光', token: 'volumetric sunbeams, cinematic Tyndall effect, dreamy atmospheric bokeh', category: 'lighting' },

  // 情绪表现
  { id: 'emo-smile', label: '😄 元气微笑', token: 'confident cheerful smile, sparkly big bead eyes, rosy cheeks', category: 'emotion' },
  { id: 'emo-panic', label: '😱 搞怪惊慌翻车', token: 'hilarious shocked panic comical sweat drop expression, chibi meme reaction', category: 'emotion' },
  { id: 'emo-healing', label: '✨ 治愈闭眼享受', token: 'wholesome cozy peaceful healing face, soft gentle smile', category: 'emotion' }
];

export interface TraceLogEntry {
  timestamp: string;
  step: string;
  message: string;
  status: 'info' | 'success' | 'warning' | 'error';
  elapsedMs?: number;
}

export interface GeneratedBatchCard {
  id: string;
  url: string;
  prompt: string;
  generatedAt: string;
  elapsedSec: string;
  tags: string[];
}

interface CharacterManagerProps {
  ips: IPProfile[];
  currentIP?: IPProfile;
  onSelectIP: (ip: IPProfile) => void;
  onSaveIP: (ip: IPProfile) => void;
  onDeleteIP: (id: string) => void;
  onGoToStoryStudio: (ip: IPProfile) => void;
  onShowToast: (msg: string) => void;
}

export function CharacterManager({
  ips,
  currentIP,
  onSelectIP,
  onSaveIP,
  onDeleteIP,
  onGoToStoryStudio,
  onShowToast
}: CharacterManagerProps) {
  const { locale } = useI18n();
  const [selectedIP, setSelectedIP] = useState<IPProfile | null>(currentIP || (ips.length > 0 ? ips[0] : null));

  // Sync selectedIP whenever currentIP or ips list changes from parent
  useEffect(() => {
    if (currentIP) {
      setSelectedIP(currentIP);
    } else if (ips.length > 0) {
      if (!selectedIP || !ips.some(ip => ip.id === selectedIP.id)) {
        setSelectedIP(ips[0]);
      }
    } else {
      setSelectedIP(null);
    }
  }, [currentIP, ips]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<string>('all');

  // Creation Mode State
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Custom Tags Registry
  const [customTags, setCustomTags] = useState<TagDefinition[]>([
    { id: 'custom-farm', label: '农场日常', category: 'custom', color: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30' }
  ]);

  // Draft Character state
  const [draftIP, setDraftIP] = useState<IPProfile>({
    id: '',
    name: '',
    description: '',
    backstory: '',
    archetype: '',
    stylePreset: '3D Clay',
    avatarUrl: '',
    assets: [],
    turnaroundSheets: {},
    visualAnchors: { hair: '', clothing: '', accessories: '', colorPalette: [], distinctiveFeatures: '' },
    personality: { traits: [], tagline: '', catchphrase: '', flawOrConflict: '' },
    worldview: '',
    expressionSheets: [],
    loraWeights: { face: 0.85, costume: 0.8, style: 0.85 },
    createdAt: new Date().toISOString(),
    locale
  });

  const activeEditingIP = isCreatingNew ? draftIP : selectedIP;

  // Mode: 'generate' vs 'upload'
  const [inputMode, setInputMode] = useState<'generate' | 'upload'>('generate');

  // Prompt Generator Workbench State
  const [currentPrompt, setCurrentPrompt] = useState(
    'Pop Mart 3D clay figurine blind box toy of a cute chubby Shiba Inu farmer wearing yellow straw hat and blue denim overalls, front view, octane render, soft studio lighting, 8k resolution'
  );
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedPreviewUrl, setGeneratedPreviewUrl] = useState<string | null>(null);
  const [previewSource, setPreviewSource] = useState<'generated' | 'uploaded'>('generated');
  
  // Workspace Tab: 'visual_studio' (生图与资产) vs 'character_profile' (人设与档案)
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'visual_studio' | 'character_profile'>('visual_studio');

  // Image-to-Image / Reference Derivation State
  const [referenceImage, setReferenceImage] = useState<{ url: string; prompt?: string; sourceName?: string } | null>(null);

  const handleDeriveFromImage = (url: string, promptText?: string, nameHint?: string) => {
    setReferenceImage({
      url,
      prompt: promptText,
      sourceName: nameHint || '已选参考基准图'
    });
    if (promptText && promptText.trim()) {
      setCurrentPrompt(promptText);
    }
    setInputMode('generate');
    setActiveWorkspaceTab('visual_studio');
    onShowToast('✨ 已挂载该图为参考基准图！可在下方 Prompt 中修改动作、视角或场景进行衍生生成');
  };

  // Batch Multi-Image Generation States (Requirement 1 & 2)
  const [imageCount, setImageCount] = useState<1 | 2 | 4>(1);
  const [generatedBatchCards, setGeneratedBatchCards] = useState<GeneratedBatchCard[]>([]);
  const [selectedBatchCardId, setSelectedBatchCardId] = useState<string | null>(null);

  // Live Timer & StopWatch (Requirement 2)
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Trace & Diagnostics System (Requirement: Logging & Troubleshooting)
  const [traceLogs, setTraceLogs] = useState<TraceLogEntry[]>([]);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationDiagnosticAdvice, setGenerationDiagnosticAdvice] = useState<string | null>(null);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const [currentModelFeedback, setCurrentModelFeedback] = useState<string | null>(null);

  const handleCopyDiagnosticReport = () => {
    const report = [
      `# 🛠️ IP Helper 生图排障诊断报告`,
      `• Log ID: ${currentLogId || 'LOG-PENDING'}`,
      `• 生成时间: ${new Date().toLocaleString('zh-CN', { hour12: false })}`,
      `• 耗时: ${timerSeconds}s`,
      `• 状态: ${generationError ? '❌ 失败' : '✅ 成功'}`,
      generationError ? `• 错误原因: ${generationError}` : '',
      generationDiagnosticAdvice ? `• 诊断建议: ${generationDiagnosticAdvice}` : '',
      currentModelFeedback ? `• 上游模型回包反馈:\n\`\`\`\n${currentModelFeedback}\n\`\`\`` : '',
      `• 输入 Prompt:\n\`\`\`\n${currentPrompt}\n\`\`\``,
      `• 完整链路追踪日志 (Trace Logs):`,
      ...traceLogs.map(l => `  [${l.timestamp?.split('T')[1]?.slice(0, 8) || '00:00:00'}] [${l.step}] (${l.status}) ${l.message}`)
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(report);
    onShowToast('📋 已复制全量排障报告！可直接发送给 AI 助手进行精准排查');
  };

  const handleCopyLogId = () => {
    if (!currentLogId) return;
    navigator.clipboard.writeText(currentLogId);
    onShowToast(`📋 已复制 Log ID: ${currentLogId}`);
  };

  // Quick Token & Custom Token State (Requirement 3 & 4)
  const [tokenCategoryFilter, setTokenCategoryFilter] = useState<'all' | 'angle' | 'style' | 'lighting' | 'emotion' | 'custom'>('all');
  const [customTokens, setCustomTokens] = useState<QuickTokenItem[]>([]);
  const [isCreatingCustomToken, setIsCreatingCustomToken] = useState(false);
  const [newCustomTokenLabel, setNewCustomTokenLabel] = useState('');
  const [newCustomTokenContent, setNewCustomTokenContent] = useState('');

  // Load custom quick tokens from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ip_helper_custom_quick_tokens');
      if (saved) {
        setCustomTokens(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveCustomTokens = (tokens: QuickTokenItem[]) => {
    setCustomTokens(tokens);
    try {
      localStorage.setItem('ip_helper_custom_quick_tokens', JSON.stringify(tokens));
    } catch {
      // ignore
    }
  };

  const handleAddCustomQuickToken = () => {
    if (!newCustomTokenLabel.trim() || !newCustomTokenContent.trim()) {
      onShowToast('请填写词条名称与对应的英文提示词');
      return;
    }

    const newItem: QuickTokenItem = {
      id: `custom-token-${Date.now()}`,
      label: `⭐ ${newCustomTokenLabel.trim()}`,
      token: newCustomTokenContent.trim(),
      category: 'custom'
    };

    const updated = [...customTokens, newItem];
    saveCustomTokens(updated);
    setNewCustomTokenLabel('');
    setNewCustomTokenContent('');
    setIsCreatingCustomToken(false);
    onShowToast(`已保存自定义快捷词条：${newItem.label}`);
  };

  const handleDeleteCustomQuickToken = (id: string) => {
    const updated = customTokens.filter(t => t.id !== id);
    saveCustomTokens(updated);
    onShowToast('已删除该自定义词条');
  };

  // Tagging State for the current generated/uploaded image
  const [stagedTagIds, setStagedTagIds] = useState<string[]>(['front', '3d_clay', 'avatar']);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [aiTagInferredNotice, setAiTagInferredNotice] = useState<string | null>(null);

  // Modal State for Editing Existing Asset Tags
  const [editingAsset, setEditingAsset] = useState<CharacterAsset | null>(null);

  // Lightbox State for Image Enlargement
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    imageUrl: string | null;
    title?: string;
    prompt?: string;
    tags?: string[];
  }>({
    isOpen: false,
    imageUrl: null
  });

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to process any image file/blob (from upload or clipboard)
  const processImageFile = useCallback((fileOrBlob: File | Blob, nameHint: string = '上传图片') => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const uploadTime = new Date().toLocaleString('zh-CN', { hour12: false });
      
      const newCard: GeneratedBatchCard = {
        id: `upload-${Date.now()}`,
        url: result,
        prompt: '用户手动上传资产',
        generatedAt: uploadTime,
        elapsedSec: '本地秒传',
        tags: aiInferTags(nameHint, nameHint, customTags)
      };

      setGeneratedBatchCards([newCard]);
      setSelectedBatchCardId(newCard.id);
      setGeneratedPreviewUrl(result);
      setPreviewSource('uploaded');

      // AI Tag Semantic Inference
      const inferredTags = newCard.tags;
      setStagedTagIds(inferredTags);
      setAiTagInferredNotice(`✨ AI 已根据图片信息自动识别并勾选了 ${inferredTags.length} 个匹配标签！`);
      onShowToast(`🎉 成功载入【${nameHint}】，AI 已自动匹配标签！`);
    };
    reader.readAsDataURL(fileOrBlob);
  }, [customTags, onShowToast]);

  // Global Clipboard Paste Listener
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processImageFile(blob, '剪切板粘贴图片');
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [processImageFile]);

  const filteredIPs = ips.filter(ip => {
    const matchSearch = ip.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (ip.description || ip.archetype || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  const handleUpdateActive = (field: string, value: any) => {
    if (isCreatingNew) {
      setDraftIP(prev => ({ ...prev, [field]: value }));
    } else if (selectedIP) {
      setSelectedIP(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const startCreateNewFlow = () => {
    setIsCreatingNew(true);
    setActiveWorkspaceTab('character_profile');
    setDraftIP({
      id: `ip-${Date.now()}`,
      name: '',
      description: '',
      backstory: '',
      archetype: '',
      stylePreset: '3D Clay',
      avatarUrl: '',
      assets: [],
      turnaroundSheets: {},
      visualAnchors: { hair: '', clothing: '', accessories: '', colorPalette: [], distinctiveFeatures: '' },
      personality: { traits: [], tagline: '', catchphrase: '', flawOrConflict: '' },
      worldview: '',
      expressionSheets: [],
      loraWeights: { face: 0.85, costume: 0.8, style: 0.85 },
      createdAt: new Date().toISOString(),
      locale
    });
    setGeneratedPreviewUrl(null);
    setGeneratedBatchCards([]);
    setCurrentPrompt('Pop Mart 3D clay figurine blind box toy of cute character, front view, octane render, 8k resolution');
    setStagedTagIds(['front', '3d_clay', 'avatar']);
    onShowToast('进入新角色创建模式：可在【角色档案】中记录设定，或随时切换至【视觉工坊】生图');
  };

  // Toggle Tag in staging area
  const toggleStagedTag = (tagId: string) => {
    if (stagedTagIds.includes(tagId)) {
      setStagedTagIds(prev => prev.filter(id => id !== tagId));
    } else {
      setStagedTagIds(prev => [...prev, tagId]);
    }
  };

  // Create custom tag in staging area
  const handleCreateStagedCustomTag = () => {
    const cleanLabel = tagSearchQuery.trim();
    if (!cleanLabel) return;

    const newTagId = `custom-${Date.now()}`;
    const newTag: TagDefinition = {
      id: newTagId,
      label: cleanLabel,
      category: 'custom',
      color: 'bg-violet-500/20 text-violet-300 border-violet-500/30'
    };

    setCustomTags(prev => [...prev, newTag]);
    setStagedTagIds(prev => [...prev, newTagId]);
    setTagSearchQuery('');
    onShowToast(`已创建并自动勾选新标签：${cleanLabel}`);
  };

  // Direct Image Generation based on User's full Prompt with Trace & Batching
  const handleGenerateDirectImage = async () => {
    if (!currentPrompt.trim()) {
      onShowToast('请输入生图 Prompt 提示词');
      return;
    }

    setIsGeneratingImage(true);
    setAiTagInferredNotice(null);
    setGenerationError(null);
    setGenerationDiagnosticAdvice(null);
    setTimerSeconds(0);

    // Initial local trace entry
    const startTimestamp = new Date().toISOString();
    const initialLogs: TraceLogEntry[] = [
      {
        timestamp: startTimestamp,
        step: 'CLIENT_REQUEST_INIT',
        message: `发起生图请求：计划生成 ${imageCount} 张图片，引擎：Antigravity CLI (Google Imagen 3)`,
        status: 'info'
      }
    ];
    setTraceLogs(initialLogs);

    // Start live stopwatch
    const startTime = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimerSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 200);

    onShowToast(`AI 正在调度 Antigravity CLI 原生引擎生成 ${imageCount} 张图片，请稍候...`);

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'direct_prompt',
          prompt: currentPrompt,
          count: imageCount,
          referenceImageUrl: referenceImage?.url || undefined,
          width: 600,
          height: 800
        })
      });

      const data = await res.json();
      const totalElapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

      if (data.logId) setCurrentLogId(data.logId);
      if (data.modelFeedback) setCurrentModelFeedback(data.modelFeedback);

      if (data.traceLogs && Array.isArray(data.traceLogs)) {
        setTraceLogs(data.traceLogs);
      }

      if (data.success && (data.imageUrl || (data.imageUrls && data.imageUrls.length > 0))) {
        const urls: string[] = data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls : [data.imageUrl];
        const genTimeStr = data.generatedAt || new Date().toLocaleString('zh-CN', { hour12: false });
        
        const newBatchCards: GeneratedBatchCard[] = urls.map((url, idx) => {
          const inferred = aiInferTags(currentPrompt, undefined, customTags);
          return {
            id: `batch-${Date.now()}-${idx}`,
            url,
            prompt: currentPrompt,
            generatedAt: genTimeStr,
            elapsedSec: `${(data.elapsedMs ? data.elapsedMs / 1000 / urls.length : Number(totalElapsedSec) / urls.length).toFixed(1)}s`,
            tags: inferred
          };
        });

        setGeneratedBatchCards(newBatchCards);
        setSelectedBatchCardId(newBatchCards[0].id);
        setGeneratedPreviewUrl(newBatchCards[0].url);
        setPreviewSource('generated');
        setGenerationError(null);
        setGenerationDiagnosticAdvice(null);

        // AI Tag Semantic Inference
        const primaryInferred = newBatchCards[0].tags;
        setStagedTagIds(primaryInferred);
        setAiTagInferredNotice(`✨ AI 已根据 Prompt 语义自动识别并勾选了 ${primaryInferred.length} 个匹配标签！`);
        onShowToast(`🎉 成功生成 ${urls.length} 张高画质原画 (耗时 ${totalElapsedSec}s)！`);
      } else {
        const errorText = data.error || '生成超时或环境未产出图片文件';
        setGenerationError(errorText);
        setGenerationDiagnosticAdvice(data.diagnosticAdvice || '建议检查本地 agy 环境，或点击下方【重试生成】。');
        setDiagnosticsOpen(true);
        onShowToast(`生图未成功：${errorText}`);
      }
    } catch (err) {
      const errorText = err instanceof Error ? err.message : '网络请求波动或进程中断';
      setGenerationError(errorText);
      setGenerationDiagnosticAdvice('请检查本地 Next.js 服务是否正常，或重新发起请求。');
      setDiagnosticsOpen(true);
      onShowToast(`请求异常：${errorText}`);
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsGeneratingImage(false);
    }
  };

  // Handle Local File Upload Picker (Requirement 4)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('请选择有效的图片文件 (PNG, JPG, WebP)');
      return;
    }

    processImageFile(file, file.name);
  };

  // Save Staged Asset to IP Library (Multi-tag support)
  const handleSaveAssetToIP = () => {
    if (!generatedPreviewUrl) {
      onShowToast('请先生成或上传图片后再保存入库');
      return;
    }
    if (!activeEditingIP || !activeEditingIP.name.trim()) {
      onShowToast('请先为角色填写名字');
      return;
    }
    if (stagedTagIds.length === 0) {
      onShowToast('请至少选择一个标签');
      return;
    }

    const allCombined = [...SYSTEM_PRESET_TAGS, ...customTags];
    const primaryTagInfo = getTagInfo(stagedTagIds[0], allCombined);

    const newAsset: CharacterAsset = {
      id: `asset-${Date.now()}`,
      url: generatedPreviewUrl,
      prompt: previewSource === 'generated' ? currentPrompt : '用户手动上传资产',
      tags: [...stagedTagIds],
      tag: stagedTagIds[0],
      label: primaryTagInfo.label,
      source: previewSource,
      createdAt: new Date().toISOString()
    };

    const updatedAssets = [newAsset, ...(activeEditingIP.assets || [])];
    const shouldUpdateAvatar = stagedTagIds.includes('avatar') || stagedTagIds.includes('front') || !activeEditingIP.avatarUrl;

    const updatedIP: IPProfile = {
      ...activeEditingIP,
      archetype: activeEditingIP.archetype?.trim() || activeEditingIP.description?.trim() || activeEditingIP.name.trim(),
      avatarUrl: shouldUpdateAvatar ? generatedPreviewUrl : activeEditingIP.avatarUrl,
      assets: updatedAssets,
      turnaroundSheets: {
        ...activeEditingIP.turnaroundSheets,
        ...(stagedTagIds.includes('front') ? { front: generatedPreviewUrl } : {}),
        ...(stagedTagIds.includes('side') ? { side: generatedPreviewUrl } : {}),
        ...(stagedTagIds.includes('back') ? { back: generatedPreviewUrl } : {})
      }
    };

    if (isCreatingNew) {
      setIsCreatingNew(false);
    }
    setSelectedIP(updatedIP);
    onSelectIP(updatedIP);
    onSaveIP(updatedIP);
    onShowToast(`✅ 已成功保存【${updatedIP.name}】及新资产入库（共 ${stagedTagIds.length} 个标签）！`);
  };

  // Save Existing Asset Tags from Modal (Requirement 5)
  const handleSaveExistingAssetTags = (assetId: string, newTags: string[], newCustomTags?: TagDefinition[]) => {
    if (!activeEditingIP) return;

    if (newCustomTags) {
      setCustomTags(newCustomTags);
    }

    const updatedAssets = (activeEditingIP.assets || []).map(a => {
      if (a.id === assetId) {
        const allCombined = [...SYSTEM_PRESET_TAGS, ...(newCustomTags || customTags)];
        const primaryTagInfo = getTagInfo(newTags[0] || 'front', allCombined);
        return {
          ...a,
          tags: newTags,
          tag: newTags[0] || 'front',
          label: primaryTagInfo.label
        };
      }
      return a;
    });

    const updatedIP: IPProfile = {
      ...activeEditingIP,
      assets: updatedAssets
    };

    if (isCreatingNew) {
      setDraftIP(updatedIP);
    } else {
      setSelectedIP(updatedIP);
    }

    onSaveIP(updatedIP);
    onShowToast('✅ 资产标签修改已保存！');
  };

  // Delete an asset from the IP
  const handleDeleteAsset = (assetId: string) => {
    if (!activeEditingIP) return;
    const updatedAssets = (activeEditingIP.assets || []).filter(a => a.id !== assetId);
    const updatedIP = { ...activeEditingIP, assets: updatedAssets };
    if (isCreatingNew) {
      setDraftIP(updatedIP);
    } else {
      setSelectedIP(updatedIP);
    }
    onSaveIP(updatedIP);
    onShowToast('已从资产库移除该图片');
  };

  // Set asset as main avatar
  const handleSetAsAvatar = (asset: CharacterAsset) => {
    if (!activeEditingIP) return;
    const updatedIP = { ...activeEditingIP, avatarUrl: asset.url };
    if (isCreatingNew) {
      setDraftIP(updatedIP);
    } else {
      setSelectedIP(updatedIP);
    }
    onSaveIP(updatedIP);
    onShowToast(`已将该资产设为【${activeEditingIP.name}】主头像`);
  };

  // Open Lightbox Helper (Requirement 3)
  const handleOpenLightbox = (url: string, title?: string, prompt?: string, tags?: string[]) => {
    setLightboxData({
      isOpen: true,
      imageUrl: url,
      title: title || activeEditingIP?.name || '图片放大预览',
      prompt,
      tags
    });
  };

  const currentAssets = activeEditingIP?.assets || [];
  const allAvailableTags = [...SYSTEM_PRESET_TAGS, ...customTags];

  const filteredAssets = currentAssets.filter(asset => {
    if (selectedAssetFilter === 'all') return true;
    const assetTagList = asset.tags || (asset.tag ? [asset.tag] : []);
    return assetTagList.includes(selectedAssetFilter);
  });

  const stagedSearchFilteredTags = searchTags(tagSearchQuery, allAvailableTags);
  const stagedExactMatch = allAvailableTags.some(
    t => t.label.toLowerCase() === tagSearchQuery.trim().toLowerCase() ||
         t.id.toLowerCase() === tagSearchQuery.trim().toLowerCase()
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Banner */}
      <div className="p-4 px-6 border-b border-zinc-800 bg-zinc-900/40 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <User className="w-4 h-4" />
            </span>
            <div>
              <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>🎭 IP 角色管理与多标签资产中心</span>
                <span className="text-[10px] text-violet-300 bg-violet-950/80 px-2 py-0.5 rounded-full border border-violet-500/40 font-semibold">
                  {isCreatingNew ? '新建角色草稿' : '多标签资产库'}
                </span>
              </h1>
              <p className="text-xs text-zinc-400">
                支持自由生图、文件上传与剪切板粘贴 (Ctrl+V/⌘+V)，AI 智能识别打标，点击图片即可全屏放大预览
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!isCreatingNew ? (
            <button
              onClick={startCreateNewFlow}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md shadow-violet-600/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              ➕ 新建 IP 角色
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!draftIP.name.trim()) {
                    onShowToast('请先填写角色名字再保存');
                    return;
                  }
                  const finalIP = {
                    ...draftIP,
                    archetype: draftIP.archetype?.trim() || draftIP.description?.trim() || draftIP.name.trim()
                  };
                  onSaveIP(finalIP);
                  onSelectIP(finalIP);
                  setSelectedIP(finalIP);
                  setIsCreatingNew(false);
                  onShowToast(`✅ 已成功创建并保存角色【${finalIP.name}】！`);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存入库</span>
              </button>
              <button
                onClick={() => {
                  setIsCreatingNew(false);
                  setSelectedIP(currentIP || ips[0] || null);
                }}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Character List (Width: 260px) */}
        <div className="w-64 border-r border-zinc-800 bg-zinc-950/40 flex flex-col h-full flex-shrink-0">
          <div className="p-3 border-b border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                角色列表 ({ips.length})
              </span>
              {ips.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('确定要清空所有 IP 角色档案吗？清空后不可恢复。')) {
                      onDeleteIP('all');
                      onShowToast('🗑️ 已清空所有 IP 角色档案');
                    }
                  }}
                  className="text-[10px] text-zinc-500 hover:text-red-400 cursor-pointer transition-colors"
                  title="清空所有角色"
                >
                  清空全部
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索已有角色..."
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {isCreatingNew && (
              <div className="p-3 rounded-2xl border-2 border-dashed border-violet-500/80 bg-violet-950/20 text-xs">
                <div className="flex items-center gap-2 font-bold text-violet-300">
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                  新建角色进行中
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  在右侧生图、上传或按 Ctrl+V 粘贴图片，打标沉淀入库
                </p>
              </div>
            )}

            {filteredIPs.length === 0 && !isCreatingNew && (
              <div className="p-4 text-center space-y-2.5 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/40 my-2">
                <User className="w-7 h-7 text-zinc-600 mx-auto" />
                <p className="text-[11px] text-zinc-400">暂无 IP 角色档案</p>
                <button
                  type="button"
                  onClick={startCreateNewFlow}
                  className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold cursor-pointer transition-all shadow"
                >
                  ➕ 新建第一个角色
                </button>
              </div>
            )}

            {filteredIPs.map((ip) => {
              const isSelected = !isCreatingNew && selectedIP?.id === ip.id;
              const assetCount = ip.assets?.length || 0;
              return (
                <div
                  key={ip.id}
                  onClick={() => {
                    setIsCreatingNew(false);
                    setSelectedIP(ip);
                    onSelectIP(ip);
                  }}
                  className={`group relative p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-violet-950/30 border-violet-500/60 shadow-lg shadow-violet-950/20 ring-1 ring-violet-500/30'
                      : 'bg-zinc-900/70 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {ip.avatarUrl ? (
                      <img
                        src={ip.avatarUrl}
                        alt={ip.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLightbox(ip.avatarUrl, `${ip.name} - 主形象`, undefined, ['avatar', 'front']);
                        }}
                        className="w-11 h-11 rounded-xl object-cover border border-zinc-700/80 flex-shrink-0 hover:scale-105 transition-transform"
                        title="点击放大查看头像"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-violet-700/40 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-violet-200 flex-shrink-0">
                        {ip.name ? ip.name.slice(0, 1) : 'IP'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-bold text-xs text-zinc-100 truncate">{ip.name}</h3>
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 flex-shrink-0">
                          {assetCount} 个
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                        {ip.description || ip.archetype || '暂无描述'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onGoToStoryStudio(ip);
                      }}
                      className="flex items-center gap-1 text-violet-400 hover:text-violet-300 font-bold cursor-pointer"
                    >
                      <span>🎬 去故事工坊</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <button
                      title="删除该角色"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`确定要删除角色【${ip.name}】吗？删除后不可恢复。`)) {
                          onDeleteIP(ip.id);
                          onShowToast(`已删除角色：${ip.name}`);
                        }
                      }}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center & Right Studio Area */}
        {activeEditingIP ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Character Context Top Navigation Bar */}
            <div className="p-3 px-6 border-b border-zinc-800 bg-zinc-900/60 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                {activeEditingIP.avatarUrl ? (
                  <img
                    src={activeEditingIP.avatarUrl}
                    alt={activeEditingIP.name}
                    onClick={() => handleOpenLightbox(activeEditingIP.avatarUrl, `${activeEditingIP.name} 主头像`)}
                    className="w-10 h-10 rounded-xl object-cover border border-zinc-700 hover:scale-105 transition-transform cursor-pointer shadow"
                    title="点击放大头像"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-violet-700/40 border border-zinc-700 flex items-center justify-center text-xs font-bold text-violet-200 flex-shrink-0">
                    {activeEditingIP.name ? activeEditingIP.name.slice(0, 1) : 'IP'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                      <span>{activeEditingIP.name || '未命名角色'}</span>
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/40">
                      {activeEditingIP.archetype || '原创角色'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      🎨 {activeEditingIP.stylePreset || '3D Clay'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1 max-w-md">
                    {activeEditingIP.description || '暂无故事描述，可切换至【角色人设档案】完善背景设定'}
                  </p>
                </div>
              </div>

              {/* Sub-Workspace Tab Switcher */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab('visual_studio')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeWorkspaceTab === 'visual_studio'
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>🪄 视觉生图 & 资产工坊</span>
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-violet-950 text-violet-300 border border-violet-500/30">
                      {currentAssets.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab('character_profile')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeWorkspaceTab === 'character_profile'
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>📋 角色人设与世界观</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (!activeEditingIP || !activeEditingIP.name.trim()) {
                      onShowToast('请先为角色填写名字');
                      return;
                    }
                    const finalIP = {
                      ...activeEditingIP,
                      archetype: activeEditingIP.archetype?.trim() || activeEditingIP.description?.trim() || activeEditingIP.name.trim()
                    };
                    onSaveIP(finalIP);
                    onSelectIP(finalIP);
                    setSelectedIP(finalIP);
                    if (isCreatingNew) setIsCreatingNew(false);
                    onGoToStoryStudio(finalIP);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-semibold border border-zinc-700/80 hover:border-violet-500/40 shadow-xs transition-all cursor-pointer"
                >
                  <span>🎬 去故事工坊创作</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sub-Workspace Views */}
            {activeWorkspaceTab === 'visual_studio' ? (
              <div className="flex-1 flex overflow-hidden">
                {/* Left Column: Direct Prompt & Upload Studio (Width: 48%) */}
                <div className="w-[48%] border-r border-zinc-800/80 overflow-y-auto p-5 space-y-4 bg-zinc-950/20">
                  {/* Workbench Tab: Generate vs Upload */}
                  <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setInputMode('generate')}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            inputMode === 'generate'
                              ? 'bg-violet-600 text-white shadow'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>🪄 自由生图工作台</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputMode('upload')}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            inputMode === 'upload'
                              ? 'bg-violet-600 text-white shadow'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>📤 本地 / 剪切板上传</span>
                        </button>
                      </div>

                      <span className="text-[10px] text-pink-300 bg-pink-950/60 px-2 py-0.5 rounded border border-pink-500/30 font-semibold">
                        AI 自动智能打标
                      </span>
                    </div>

                    {inputMode === 'generate' ? (
                      <div className="space-y-3">
                        {/* Reference Image Derivation Slot (Image-to-Image) */}
                        {referenceImage && referenceImage.url ? (
                          <div className="p-2.5 rounded-xl bg-violet-950/40 border border-violet-500/50 flex items-center justify-between gap-3 animate-in fade-in shadow-md">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <img
                                src={referenceImage.url}
                                alt="Reference"
                                onClick={() => handleOpenLightbox(referenceImage.url, '参考基准图', referenceImage.prompt)}
                                className="w-11 h-11 rounded-lg object-cover border border-violet-500/50 cursor-pointer flex-shrink-0 hover:scale-105 transition-transform"
                                title="点击放大查看参考图"
                              />
                              <div className="overflow-hidden space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gradient-to-r from-violet-600 to-purple-600 text-white flex items-center gap-1 flex-shrink-0 shadow-sm">
                                    <Sparkles className="w-2.5 h-2.5 text-yellow-300" />
                                    图生图衍生中
                                  </span>
                                  <span className="text-[11px] font-bold text-zinc-100 truncate">
                                    {referenceImage.sourceName || '已选参考图'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-300 truncate">
                                  AI 将基于此图保持角色外观一致性，修改下方 Prompt 可变换动作或场景
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setReferenceImage(null);
                                onShowToast('已清除参考图，恢复为纯文本生图模式');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-red-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all flex-shrink-0 border border-zinc-700 shadow-sm"
                              title="清除参考图，切回纯文生图"
                            >
                              <X className="w-3 h-3" />
                              <span>清除参考</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-[11px] text-zinc-400">
                            <span>直接输入生图描述（中英文均可），或点击右侧资产库上的「🧬 基于此图衍生」启用图生图：</span>
                          </div>
                        )}

                        <textarea
                          value={currentPrompt}
                          onChange={(e) => setCurrentPrompt(e.target.value)}
                          rows={3}
                          placeholder="例如: Pop Mart 3D clay figurine blind box toy of a cute chubby Shiba Inu farmer wearing yellow straw hat and denim overalls, front view, octane render, 8k..."
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none resize-none leading-relaxed"
                        />

                        {/* Quick Token Bar with Category Filters & Custom Tokens (Requirement 3 & 4) */}
                        <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                              <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 mr-1 flex-shrink-0">
                                <Tag className="w-3 h-3 text-violet-400" />
                                快捷追加:
                              </span>
                              {[
                                { id: 'all', label: '全部' },
                                { id: 'angle', label: '📐 视角' },
                                { id: 'style', label: '🎨 风格' },
                                { id: 'lighting', label: '💡 光影' },
                                { id: 'emotion', label: '😄 情绪' },
                                { id: 'custom', label: `⭐ 自定义 (${customTokens.length})` }
                              ].map(tab => (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => setTokenCategoryFilter(tab.id as any)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all flex-shrink-0 cursor-pointer ${
                                    tokenCategoryFilter === tab.id
                                      ? 'bg-violet-600 text-white font-bold'
                                      : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800/60'
                                  }`}
                                >
                                  {tab.label}
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => setIsCreatingCustomToken(prev => !prev)}
                              className="px-2 py-0.5 rounded-lg bg-violet-950/80 hover:bg-violet-900 text-violet-300 border border-violet-500/40 text-[10px] font-bold flex-shrink-0 flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>{isCreatingCustomToken ? '收起' : '新建词条'}</span>
                            </button>
                          </div>

                          {/* Custom Token Creator Form */}
                          {isCreatingCustomToken && (
                            <div className="p-2.5 rounded-xl bg-zinc-900 border border-violet-500/50 space-y-2 animate-in fade-in">
                              <div className="text-[11px] font-bold text-violet-300 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-yellow-400" />
                                <span>添加自定义快捷词条 (保存在本地，可长期复用)</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={newCustomTokenLabel}
                                  onChange={(e) => setNewCustomTokenLabel(e.target.value)}
                                  placeholder="词条展示名称 (如: 极光星空底座)"
                                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
                                />
                                <input
                                  type="text"
                                  value={newCustomTokenContent}
                                  onChange={(e) => setNewCustomTokenContent(e.target.value)}
                                  placeholder="英文生图 Token (如: glowing aurora night sky backdrop)"
                                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 font-mono"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setIsCreatingCustomToken(false)}
                                  className="px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10px]"
                                >
                                  取消
                                </button>
                                <button
                                  type="button"
                                  onClick={handleAddCustomQuickToken}
                                  className="px-3 py-0.5 rounded bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] shadow"
                                >
                                  保存词条
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Token Chips Pool */}
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-0.5">
                            {[...DEFAULT_QUICK_TOKENS, ...customTokens]
                              .filter(item => tokenCategoryFilter === 'all' || item.category === tokenCategoryFilter)
                              .map((chip) => (
                                <div
                                  key={chip.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-violet-950 hover:border-violet-500/80 border border-zinc-800 text-zinc-300 text-[10px] transition-all group"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!currentPrompt.includes(chip.token)) {
                                        setCurrentPrompt(prev => prev.trim() ? `${prev}, ${chip.token}` : chip.token);
                                        onShowToast(`已追加词条：${chip.label}`);
                                      }
                                    }}
                                    className="cursor-pointer hover:text-white"
                                  >
                                    {chip.label}
                                  </button>

                                  {chip.category === 'custom' && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteCustomQuickToken(chip.id);
                                      }}
                                      className="text-zinc-500 hover:text-red-400 p-0.5 cursor-pointer"
                                      title="删除此自定义词条"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Controls Row: Batch Count & AI Polish */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          {/* Batch Image Count Selector (Requirement 1) */}
                          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                            <span className="text-[10px] text-zinc-400 font-bold px-1.5">生成张数:</span>
                            {[
                              { count: 1, label: '1 张 (快速)' },
                              { count: 2, label: '2 张 (双图对比)' },
                              { count: 4, label: '4 张 (四宫格抽卡)' }
                            ].map(opt => (
                              <button
                                key={opt.count}
                                type="button"
                                onClick={() => setImageCount(opt.count as 1 | 2 | 4)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  imageCount === opt.count
                                    ? 'bg-violet-600 text-white shadow'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>

                          {/* AI Polish / Translate Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (!currentPrompt.trim()) return;
                              const refined = translateAndRefineChinesePrompt(currentPrompt);
                              setCurrentPrompt(refined);
                              onShowToast('✨ 已自动将中文 Prompt 编译为专业英文生图 Tokens！');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/40 text-[10px] font-bold cursor-pointer transition-all shadow-sm"
                            title="自动解析中文字段并编译为无畸变的专业英文生图 Tokens"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                            <span>AI 智能润色 / 编译 Tokens</span>
                          </button>
                        </div>

                        {/* Primary Generate Action Button */}
                        <button
                          onClick={handleGenerateDirectImage}
                          disabled={isGeneratingImage || !currentPrompt.trim()}
                          className={`w-full py-2.5 rounded-xl text-white text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                            referenceImage
                              ? 'bg-gradient-to-r from-violet-600 via-pink-600 to-purple-600 hover:from-violet-500 hover:via-pink-500 hover:to-purple-500 shadow-violet-600/40'
                              : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-violet-600/30'
                          }`}
                        >
                          {isGeneratingImage ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                              <span>AI 正在{referenceImage ? '基于参考图衍生' : '渲染'}中... 已耗时 {timerSeconds}s</span>
                            </>
                          ) : (
                            <>
                              {referenceImage ? (
                                <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                              ) : (
                                <Wand2 className="w-4 h-4" />
                              )}
                              <span>
                                {referenceImage
                                  ? `🧬 基于参考图衍生生成 ${imageCount} 张原画`
                                  : `🪄 立即生成 ${imageCount} 张图片并智能打标`}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      /* Local Image & Clipboard Upload Area */
                      <div className="space-y-3">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="image/*"
                          className="hidden"
                        />

                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-zinc-700 hover:border-violet-500/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-zinc-950/60 hover:bg-zinc-900/60 transition-all group relative"
                        >
                          <div className="w-12 h-12 rounded-full bg-violet-600/10 border border-violet-500/30 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform mb-2">
                            <Upload className="w-5 h-5" />
                          </div>
                          <h4 className="text-xs font-bold text-zinc-200">点击选择、拖拽图片 或 直接按快捷键粘贴</h4>
                          <p className="text-[11px] text-zinc-400 mt-1 max-w-xs leading-relaxed">
                            支持 PNG, JPG, WebP 格式。在页面任意位置直接按 <kbd className="px-1.5 py-0.5 bg-zinc-800 text-violet-300 rounded border border-zinc-700 font-mono text-[10px]">Ctrl+V</kbd> 或 <kbd className="px-1.5 py-0.5 bg-zinc-800 text-violet-300 rounded border border-zinc-700 font-mono text-[10px]">⌘+V</kbd> 即可一键粘贴剪切板截图！
                          </p>

                          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-500 bg-zinc-900/80 px-2.5 py-1 rounded-full border border-zinc-800">
                            <Clipboard className="w-3 h-3 text-violet-400" />
                            <span>已就绪监听系统剪切板图片粘贴</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Generating Pulse Loading & Step Tracker (Requirement: Diagnostics & Timing) */}
                  {isGeneratingImage && (
                    <div className="p-5 rounded-2xl bg-zinc-900 border border-violet-500/40 space-y-3 shadow-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-violet-950 border border-violet-500/50 flex items-center justify-center text-violet-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                              <span>Antigravity CLI 原生生图引擎运行中</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono font-bold border border-violet-500/30">
                                ⏱️ 耗时 {timerSeconds}s
                              </span>
                            </h4>
                            <p className="text-[10px] text-zinc-400">正在生成 {imageCount} 张商业级原画，已建立无头任务调度与链路监控</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setDiagnosticsOpen(prev => !prev)}
                          className="text-[10px] text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 cursor-pointer"
                        >
                          {diagnosticsOpen ? '收起排障日志' : '查看实时链路'}
                        </button>
                      </div>

                      {/* Step Progress Tracker */}
                      <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                        <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>① 语义编译</span>
                        </div>
                        <div className={`p-1.5 rounded-lg border font-bold flex items-center gap-1 ${
                          timerSeconds >= 1 ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                        }`}>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>② agy 调度</span>
                        </div>
                        <div className={`p-1.5 rounded-lg border font-bold flex items-center gap-1 ${
                          timerSeconds >= 5 ? 'bg-violet-950/40 border-violet-500/40 text-violet-300 animate-pulse' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                        }`}>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>③ Imagen 3 渲染</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-500 flex items-center gap-1">
                          <span>④ 智能打标</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generation Error & Diagnostic TroubleShooting Box */}
                  {/* Generation Error & Diagnostic TroubleShooting Box */}
                  {generationError && !isGeneratingImage && (
                    <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/50 space-y-3 text-xs animate-in fade-in shadow-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 text-red-300 font-bold">
                          <X className="w-4 h-4 text-red-400" />
                          <span>生图异常捕获 (已生成排障诊断编号)</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleGenerateDirectImage}
                          className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow"
                        >
                          🔄 立即重试
                        </button>
                      </div>

                      {/* Log ID & Fast Copy Bar (Requirement: Support copy & provide Log ID for AI Agent) */}
                      {currentLogId && (
                        <div className="p-2.5 rounded-xl bg-black/60 border border-violet-500/40 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-400">排障诊断 ID:</span>
                            <code className="px-2 py-0.5 rounded bg-violet-950 text-violet-300 font-mono font-bold text-xs border border-violet-500/50 select-all">
                              {currentLogId}
                            </code>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleCopyLogId}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer border border-zinc-700 transition-all"
                              title="复制 Log ID 发送给 AI 助手排查"
                            >
                              <Copy className="w-3 h-3" />
                              <span>复制 Log ID</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleCopyDiagnosticReport}
                              className="px-3 py-1 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow transition-all"
                              title="复制包含 Log ID、上游回包和 Trace Logs 的全量报告"
                            >
                              <FileText className="w-3 h-3" />
                              <span>📋 一键复制排障报告给 AI</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="p-2.5 rounded-xl bg-black/40 border border-red-500/30 text-[11px] font-mono text-red-200">
                        {generationError}
                      </div>

                      {/* Upstream Model Feedback Breakdown (e.g. 429 Quota Exceeded) */}
                      {currentModelFeedback && (
                        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-200 space-y-1">
                          <div className="font-bold flex items-center gap-1 text-amber-300">
                            <span>⚠️ 上游模型详细回包 (429 / 限制说明):</span>
                          </div>
                          <div className="whitespace-pre-wrap font-mono text-[10px] bg-black/50 p-2 rounded border border-amber-500/20 text-zinc-200">
                            {currentModelFeedback}
                          </div>
                        </div>
                      )}

                      {generationDiagnosticAdvice && (
                        <p className="text-[11px] text-zinc-300">
                          💡 <strong>排障建议</strong>：{generationDiagnosticAdvice}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Live Trace & Diagnostics Console (Requirement: Logging & Troubleshooting) */}
                  {(diagnosticsOpen || traceLogs.length > 0) && (
                    <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h5 className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-violet-400" />
                            <span>生图跟踪链路与排障日志 (Trace & Diagnostics)</span>
                          </h5>
                          {currentLogId && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-violet-950/80 text-violet-300 border border-violet-500/30">
                              {currentLogId}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleCopyDiagnosticReport}
                            className="text-[10px] text-violet-300 hover:text-white px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 hover:border-violet-500 flex items-center gap-1 transition-all cursor-pointer"
                            title="复制全部链路日志给 AI"
                          >
                            <Copy className="w-2.5 h-2.5" />
                            <span>复制排障报告</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiagnosticsOpen(prev => !prev)}
                            className="text-[10px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 cursor-pointer"
                          >
                            {diagnosticsOpen ? '收起' : '展开日志'}
                          </button>
                        </div>
                      </div>

                      {diagnosticsOpen && (
                        <div className="max-h-48 overflow-y-auto space-y-1 text-[10px] font-mono p-2 rounded-xl bg-black/60 border border-zinc-800">
                          {traceLogs.map((log, idx) => (
                            <div key={idx} className="flex items-start gap-2 leading-relaxed">
                              <span className="text-zinc-500 flex-shrink-0">
                                {log.timestamp.split('T')[1]?.slice(0, 8) || '00:00:00'}
                              </span>
                              <span className={`px-1 rounded flex-shrink-0 font-bold ${
                                log.status === 'success' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' :
                                log.status === 'error' ? 'bg-red-950 text-red-400 border border-red-500/40' :
                                log.status === 'warning' ? 'bg-amber-950 text-amber-400 border border-amber-500/40' :
                                'bg-zinc-800 text-zinc-400'
                              }`}>
                                {log.step}
                              </span>
                              <span className={`${
                                log.status === 'success' ? 'text-emerald-200' :
                                log.status === 'error' ? 'text-red-200 font-bold' :
                                'text-zinc-300'
                              }`}>
                                {log.message}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Multi-Image Batch Result Cards Grid (Requirement 1 & 2) */}
                  {generatedBatchCards.length > 0 && !isGeneratingImage && (
                    <div className="p-4 rounded-2xl bg-zinc-900 border border-violet-500/50 space-y-3.5 shadow-xl animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>{previewSource === 'generated' ? `生图完成 (共 ${generatedBatchCards.length} 张)` : '图片已载入'}</span>
                        </h4>

                        {generatedBatchCards.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!activeEditingIP || !activeEditingIP.name.trim()) {
                                onShowToast('请先为角色填写名字');
                                return;
                              }
                              const newAssets: CharacterAsset[] = generatedBatchCards.map((card, idx) => ({
                                id: `asset-${Date.now()}-${idx}`,
                                url: card.url,
                                prompt: card.prompt,
                                tags: card.tags.length > 0 ? card.tags : ['front'],
                                tag: card.tags[0] || 'front',
                                label: getTagInfo(card.tags[0] || 'front', [...SYSTEM_PRESET_TAGS, ...customTags]).label,
                                source: previewSource,
                                createdAt: new Date().toISOString()
                              }));

                              const updatedIP: IPProfile = {
                                ...activeEditingIP,
                                avatarUrl: activeEditingIP.avatarUrl || newAssets[0].url,
                                assets: [...newAssets, ...(activeEditingIP.assets || [])]
                              };

                              if (isCreatingNew) {
                                setDraftIP(updatedIP);
                              } else {
                                setSelectedIP(updatedIP);
                              }
                              onSaveIP(updatedIP);
                              onShowToast(`🎉 已将全部 ${newAssets.length} 张原画一键保存入库！`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow cursor-pointer transition-all"
                          >
                            💾 全部一键保存入库 ({generatedBatchCards.length} 张)
                          </button>
                        )}
                      </div>

                      {aiTagInferredNotice && (
                        <div className="p-2 px-3 rounded-xl bg-violet-950/60 border border-violet-500/40 text-[11px] text-violet-200 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                          <span>{aiTagInferredNotice}</span>
                        </div>
                      )}

                      {/* Batch Cards Grid */}
                      <div className={`grid gap-3 ${
                        generatedBatchCards.length === 1 ? 'grid-cols-1' :
                        generatedBatchCards.length === 2 ? 'grid-cols-2' :
                        'grid-cols-2'
                      }`}>
                        {generatedBatchCards.map((card, idx) => {
                          const isSelectedCard = selectedBatchCardId === card.id || generatedPreviewUrl === card.url;
                          return (
                            <div
                              key={card.id}
                              onClick={() => {
                                setSelectedBatchCardId(card.id);
                                setGeneratedPreviewUrl(card.url);
                                setStagedTagIds(card.tags);
                              }}
                              className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                isSelectedCard
                                  ? 'bg-violet-950/40 border-violet-500 ring-1 ring-violet-500/50 shadow-md'
                                  : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                              }`}
                            >
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenLightbox(card.url, `生成原画 #${idx + 1}`, card.prompt, card.tags);
                                }}
                                className="group/thumb relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-black cursor-pointer mb-2"
                                title="点击全屏放大"
                              >
                                {card.url ? (
                                  <img src={card.url} alt="batch result" className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform" />
                                ) : null}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1 text-[10px] text-white font-bold">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                  <span>放大预览</span>
                                </div>

                                {/* Generation Time & Elapsed Badge (Requirement 2) */}
                                <div className="absolute bottom-1 left-1 right-1 bg-black/80 backdrop-blur-[2px] px-1.5 py-0.5 rounded text-[9px] text-zinc-300 font-mono flex items-center justify-between border border-zinc-700/60">
                                  <span>⚡ {card.elapsedSec}</span>
                                  <span className="text-zinc-400">{card.generatedAt.split(' ')[1] || card.generatedAt}</span>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex flex-wrap gap-1">
                                  {card.tags.map(t => (
                                    <span key={t} className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                                      {getTagInfo(t, [...SYSTEM_PRESET_TAGS, ...customTags]).label.split(' ')[0]}
                                    </span>
                                  ))}
                                </div>

                                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeriveFromImage(card.url, card.prompt, `生成批次图 #${idx + 1}`);
                                    }}
                                    className="w-full py-1 rounded-lg bg-violet-950/80 hover:bg-violet-900 text-violet-300 border border-violet-500/40 font-bold text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                                    title="以此图为基准进行图生图衍生"
                                  >
                                    <Sparkles className="w-2.5 h-2.5 text-yellow-300" />
                                    <span>🧬 衍生</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setGeneratedPreviewUrl(card.url);
                                      setStagedTagIds(card.tags);
                                      handleSaveAssetToIP();
                                    }}
                                    className="w-full py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] transition-all cursor-pointer shadow flex items-center justify-center gap-1"
                                  >
                                    💾 存入库
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Multi-Tag Customizer for Active Selected Card */}
                      <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5 pt-2">
                        <span className="text-[11px] font-bold text-zinc-300 block">
                          调整当前选中图片的标签 (支持多选，点击 ✕ 移除):
                        </span>

                        <div className="flex flex-wrap gap-1 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 min-h-[32px] items-center">
                          {stagedTagIds.map(tid => {
                            const info = getTagInfo(tid, allAvailableTags);
                            return (
                              <span
                                key={tid}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${info.color || 'bg-violet-500/20 text-violet-300 border-violet-500/30'}`}
                              >
                                <span>{info.label}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleStagedTag(tid)}
                                  className="hover:text-red-400 cursor-pointer"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            );
                          })}
                        </div>

                        {/* Tag Search & Custom Tag Creation */}
                        <div className="relative">
                          <Search className="w-3 h-3 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={tagSearchQuery}
                            onChange={(e) => setTagSearchQuery(e.target.value)}
                            placeholder="搜索标签 / 创建新标签..."
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-7 pr-20 py-1 text-[11px] text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                          />

                          {tagSearchQuery.trim() && !stagedExactMatch && (
                            <button
                              type="button"
                              onClick={handleCreateStagedCustomTag}
                              className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold cursor-pointer transition-all"
                            >
                              ➕ 新建 "{tagSearchQuery.trim()}"
                            </button>
                          )}
                        </div>

                        {/* Tag Pool */}
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pt-0.5">
                          {stagedSearchFilteredTags.map(t => {
                            const isSelected = stagedTagIds.includes(t.id);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => toggleStagedTag(t.id)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                                  isSelected
                                    ? 'bg-violet-600 border-violet-400 text-white shadow font-bold'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                <span>{t.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Character Asset Gallery with Multi-Tag Display & Lightbox */}
                <div className="w-[52%] overflow-y-auto p-5 space-y-4 bg-zinc-950/60">
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-violet-400" />
                        【{activeEditingIP.name || '未命名角色'}】的多标签资产库 ({currentAssets.length})
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        点击任意图片即可全屏放大查看，支持修改多标签、设为主头像或直接带入故事工坊
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        onSaveIP(activeEditingIP);
                        onGoToStoryStudio(activeEditingIP);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-semibold border border-zinc-700/80 hover:border-violet-500/40 shadow-xs transition-all cursor-pointer"
                    >
                      <span>🎬 去故事工坊创作</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Tag Filters */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    <button
                      onClick={() => setSelectedAssetFilter('all')}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex-shrink-0 transition-all cursor-pointer ${
                        selectedAssetFilter === 'all'
                          ? 'bg-violet-600 text-white font-bold'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      全部 ({currentAssets.length})
                    </button>
                    {allAvailableTags.map(t => {
                      const count = currentAssets.filter(a => {
                        const tagList = a.tags || (a.tag ? [a.tag] : []);
                        return tagList.includes(t.id);
                      }).length;
                      if (count === 0) return null;

                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedAssetFilter(t.id)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex-shrink-0 transition-all cursor-pointer ${
                            selectedAssetFilter === t.id
                              ? 'bg-violet-600 text-white font-bold'
                              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                          }`}
                        >
                          {t.label.split(' ')[0]} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* Assets Grid */}
                  {filteredAssets.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                      {filteredAssets.map((asset) => {
                        const isMainAvatar = activeEditingIP.avatarUrl === asset.url;
                        const assetTags = asset.tags || (asset.tag ? [asset.tag] : ['front']);

                        return (
                          <div
                            key={asset.id}
                            className="group relative rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-2.5 space-y-2 transition-all flex flex-col justify-between"
                          >
                            {/* Asset Thumbnail (Click to Lightbox - Requirement 3) */}
                            <div 
                              onClick={() => handleOpenLightbox(asset.url, `${activeEditingIP.name} 资产`, asset.prompt, assetTags)}
                              className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 cursor-pointer group/card"
                              title="点击放大查看图片"
                            >
                              {asset.url ? (
                                <img
                                  src={asset.url}
                                  alt="asset"
                                  className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                                />
                              ) : null}
                              
                              {/* Hover Zoom Overlay */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center gap-1 text-[11px] text-white font-bold backdrop-blur-[1px]">
                                <Maximize2 className="w-4 h-4" />
                                <span>点击放大</span>
                              </div>

                              {isMainAvatar && (
                                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-violet-600 text-white text-[9px] font-bold shadow-md">
                                  ★ 主头像
                                </span>
                              )}
                              {asset.source === 'uploaded' && (
                                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-zinc-900/90 text-zinc-300 text-[9px] font-medium border border-zinc-700">
                                  上传
                                </span>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              {/* Multi-tag Badges */}
                              <div className="flex flex-wrap gap-1">
                                {assetTags.map(tagId => {
                                  const tagInfo = getTagInfo(tagId, allAvailableTags);
                                  return (
                                    <span
                                      key={tagId}
                                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                        tagInfo.color || 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                      }`}
                                    >
                                      {tagInfo.label.split(' ')[0]}
                                    </span>
                                  );
                                })}
                              </div>

                              <p className="text-[10px] text-zinc-500 line-clamp-1 font-mono">
                                {asset.prompt}
                              </p>
                            </div>

                            <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px]">
                              <div className="flex items-center gap-1.5">
                                {/* Derive / Image-to-Image Action */}
                                <button
                                  type="button"
                                  onClick={() => handleDeriveFromImage(asset.url, asset.prompt, `${activeEditingIP.name} 资产图`)}
                                  className="text-violet-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer bg-violet-950/80 hover:bg-violet-900 border border-violet-500/40 px-2 py-0.5 rounded-md transition-all shadow-sm"
                                  title="以此图为视觉基准进行图生图衍生"
                                >
                                  <Sparkles className="w-2.5 h-2.5 text-yellow-300" />
                                  <span>🧬 衍生</span>
                                </button>

                                {/* Edit Tags Button */}
                                <button
                                  type="button"
                                  onClick={() => setEditingAsset(asset)}
                                  className="text-zinc-400 hover:text-zinc-200 font-semibold flex items-center gap-1 cursor-pointer px-1 py-0.5 rounded hover:bg-zinc-800"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                  <span>标签</span>
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {!isMainAvatar && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetAsAvatar(asset)}
                                    className="text-zinc-400 hover:text-zinc-200 cursor-pointer text-[9px] px-1 py-0.5 rounded hover:bg-zinc-800"
                                  >
                                    设头像
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteAsset(asset.id)}
                                  title="删除此资产"
                                  className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-64 rounded-2xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center p-6 text-center">
                      <ImageIcon className="w-10 h-10 text-zinc-600 mb-2" />
                      <h4 className="text-xs font-bold text-zinc-400">该标签筛选下暂无图片资产</h4>
                      <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                        在左侧通过 Prompt 生图、上传本地图片或按 Ctrl+V 粘贴截图，AI 自动打标后即可沉淀到这里！
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Character Profile & Lore Management View */
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-950/40">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Top Notification / Action row */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-violet-400" />
                        <span>IP 角色人设设定与世界观档案</span>
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        完善视觉锚点与人物性格，自动在后续分镜生成与故事创作中精准保持角色一致性
                      </p>
                    </div>
                  </div>

                  {/* Clarification Notice Banner (Requirement: Fixed Text Notice) */}
                  <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs space-y-1.5 shadow-md">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <span className="text-sm">💡</span>
                      <span>设定与创作解耦说明 (固定文本备忘)</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      以下三个字段（<strong>角色名字</strong>、<strong>核心简介</strong>、<strong>人物背景故事</strong>）为固定的纯文本记录字段，仅作为您对该 IP 的设定备忘归档，<strong>不会参与图片生成或创作的任何一个环节</strong>。
                    </p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      所有角色的外貌特征、毛发发型、穿搭道具与艺术风格均不设硬性锁定，由您在「视觉工坊」中通过 Prompt 自由指定；也可以先生成一张满意的 IP 角色图片，再根据该图去拓展其他系列图片。
                    </p>
                  </div>

                  {/* Simplified Profile Form Card (3 Fields Only) */}
                  <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4 shadow-md">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                      <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-violet-400" />
                        <span>IP 角色基础信息设定</span>
                      </h4>
                      <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                        3 个纯文本字段
                      </span>
                    </div>

                    <div className="space-y-4 text-xs">
                      {/* Field 1: 角色名字 */}
                      <div>
                        <label className="text-[11px] font-bold text-zinc-200 block mb-1.5">
                          1. 角色名字 <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={activeEditingIP.name}
                          onChange={(e) => handleUpdateActive('name', e.target.value)}
                          placeholder="例如: 柴犬波波 / 喵七七 / 赛博侦探K"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-zinc-100 text-xs focus:border-violet-500 focus:outline-none"
                        />
                      </div>

                      {/* Field 2: 核心简介 */}
                      <div>
                        <label className="text-[11px] font-bold text-zinc-200 block mb-1.5">
                          2. 核心简介
                        </label>
                        <textarea
                          value={activeEditingIP.description || ''}
                          onChange={(e) => handleUpdateActive('description', e.target.value)}
                          rows={2}
                          placeholder="用一两句话快速概括角色（例如: 戴黄色草帽开小拖拉机的农场小柴犬，热心肠但有点贪吃）"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-zinc-100 text-xs focus:border-violet-500 focus:outline-none resize-none leading-relaxed"
                        />
                      </div>

                      {/* Field 3: 人物背景故事 */}
                      <div>
                        <label className="text-[11px] font-bold text-zinc-200 block mb-1.5">
                          3. 人物背景故事
                        </label>
                        <textarea
                          value={activeEditingIP.backstory || ''}
                          onChange={(e) => handleUpdateActive('backstory', e.target.value)}
                          rows={5}
                          placeholder="记录该角色的身世背景、经历、生活日常与设定故事，方便后续创作时随时查阅参考..."
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-zinc-100 text-xs focus:border-violet-500 focus:outline-none resize-none leading-relaxed"
                        />
                      </div>
                    </div>

                    {/* Quick Jump to Visual Studio */}
                    <div className="pt-2">
                      <div className="p-3.5 rounded-xl bg-violet-950/40 border border-violet-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-violet-300">
                          <Wand2 className="w-4 h-4 text-yellow-400" />
                          <span>已拥有 {currentAssets.length} 张视觉图片资产</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveWorkspaceTab('visual_studio')}
                          className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow"
                        >
                          前往视觉工坊自由生图 ➔
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Save Footer Banner */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveWorkspaceTab('visual_studio')}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                    >
                      ← 返回视觉工坊
                    </button>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (!activeEditingIP || !activeEditingIP.name.trim()) {
                            onShowToast('请先为角色填写名字');
                            return;
                          }
                          const finalIP = {
                            ...activeEditingIP,
                            archetype: activeEditingIP.archetype?.trim() || activeEditingIP.description?.trim() || activeEditingIP.name.trim()
                          };
                          onSaveIP(finalIP);
                          onSelectIP(finalIP);
                          setSelectedIP(finalIP);
                          if (isCreatingNew) setIsCreatingNew(false);
                          setActiveWorkspaceTab('visual_studio');
                          onShowToast(`✅ 已保存【${finalIP.name}】角色人设档案！`);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-4 h-4" />
                        <span>保存角色档案</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!activeEditingIP || !activeEditingIP.name.trim()) {
                            onShowToast('请先为角色填写名字');
                            return;
                          }
                          const finalIP = {
                            ...activeEditingIP,
                            archetype: activeEditingIP.archetype?.trim() || activeEditingIP.description?.trim() || activeEditingIP.name.trim()
                          };
                          onSaveIP(finalIP);
                          onSelectIP(finalIP);
                          setSelectedIP(finalIP);
                          if (isCreatingNew) setIsCreatingNew(false);
                          onGoToStoryStudio(finalIP);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>🎬 带入故事工坊开始创作</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-zinc-950/40">
            <div className="w-16 h-16 rounded-2xl bg-violet-950/50 border border-violet-500/40 flex items-center justify-center text-violet-400 shadow-xl">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-200">当前没有选中的 IP 角色</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1.5 leading-relaxed">
                角色档案库当前为空。点击下方按钮立即创建你的第一个专属 IP 角色，在视觉工坊中自由生图并沉淀资产！
              </p>
            </div>
            <button
              type="button"
              onClick={startCreateNewFlow}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>立即创建第一个 IP 角色</span>
            </button>
          </div>
        )}
      </div>

      {/* Asset Tag Edit Modal for Existing Assets */}
      <AssetTagEditModal
        isOpen={Boolean(editingAsset)}
        asset={editingAsset}
        customTags={customTags}
        onClose={() => setEditingAsset(null)}
        onSaveTags={handleSaveExistingAssetTags}
      />

      {/* Image Lightbox Modal (Requirement 3) */}
      <ImageLightboxModal
        isOpen={lightboxData.isOpen}
        imageUrl={lightboxData.imageUrl}
        title={lightboxData.title}
        prompt={lightboxData.prompt}
        tags={lightboxData.tags}
        customTags={customTags}
        onClose={() => setLightboxData(prev => ({ ...prev, isOpen: false }))}
        onShowToast={onShowToast}
        onDeriveImage={handleDeriveFromImage}
      />
    </div>
  );
}

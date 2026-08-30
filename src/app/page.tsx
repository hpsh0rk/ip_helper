'use client';

import React, { useState, useEffect } from 'react';
import { I18nProvider, useI18n } from '@/lib/i18n/context';
import { IPProfile, StoryScript, StoryboardFrame, Skill, ChatMessage } from '@/types';
import { Header } from '@/components/Header';
import { CharacterManager } from '@/components/CharacterManager';
import { StoryStudio } from '@/components/StoryStudio';
import { SkillsModal } from '@/components/SkillsModal';
import { ImageModelSettingsModal } from '@/components/ImageModelSettingsModal';
import { ImageEngineConfig } from '@/types';
import { getProviderById } from '@/lib/render/modelProviders';
import { generateStoryboardForIP } from '@/lib/agent/engine';
import { compileDiffusionPrompt, translateAndRefineChinesePrompt } from '@/lib/i18n/promptTranslator';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

function MainApp() {
  const { locale } = useI18n();

  // Top-level Navigation View (with localStorage persistence)
  const [activeView, setActiveView] = useState<'characters' | 'studio'>('characters');

  // Core Data States
  const [allIPs, setAllIPs] = useState<IPProfile[]>([]);
  const [currentIP, setCurrentIP] = useState<IPProfile | undefined>(undefined);
  const [story, setStory] = useState<StoryScript | undefined>(undefined);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>([
    'agency-xiaohongshu-specialist',
    'agency-image-prompt-engineer'
  ]);

  // Image Engine Configuration State (Phase 1 default: Antigravity CLI)
  const [imageEngineConfig, setImageEngineConfig] = useState<ImageEngineConfig>({
    activeProviderId: 'antigravity-cli',
    generationMode: 'text-to-image'
  });
  const [isModelSettingsOpen, setIsModelSettingsOpen] = useState(false);

  // Chat & Studio States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  // Modals & Feedback
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const [toastInfo, setToastInfo] = useState<{
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    detail?: string;
  } | null>(null);

  const showToast = (
    msg: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    detail?: string,
    duration?: number
  ) => {
    const id = Date.now();
    setToastInfo({ id, message: msg, type, detail });
    const timeout = duration || (type === 'error' ? 8000 : 3500);
    setTimeout(() => {
      setToastInfo(current => (current?.id === id ? null : current));
    }, timeout);
  };

  const handleSwitchView = (view: 'characters' | 'studio') => {
    setActiveView(view);
    try {
      localStorage.setItem('ip_helper_active_view', view);
    } catch {
      // ignore
    }
  };

  // Initial Sync from API
  useEffect(() => {
    try {
      const savedView = localStorage.getItem('ip_helper_active_view') as 'characters' | 'studio' | null;
      if (savedView === 'characters' || savedView === 'studio') {
        setActiveView(savedView);
      }
    } catch {
      // ignore
    }

    fetch('/api/skills')
      .then(res => res.json())
      .then(data => {
        if (data.skills) setSkills(data.skills);
      })
      .catch(console.error);

    fetch('/api/ip')
      .then(res => res.json())
      .then(data => {
        const ips: IPProfile[] = data.ips || [];
        setAllIPs(ips);

        let targetIP: IPProfile | undefined;
        try {
          const savedIpId = localStorage.getItem('ip_helper_last_selected_ip_id');
          if (savedIpId) {
            targetIP = ips.find(item => item.id === savedIpId);
          }
        } catch {
          // ignore
        }

        if (!targetIP && ips.length > 0) {
          targetIP = ips[0];
        }

        setCurrentIP(targetIP);

        fetch('/api/story')
          .then(res => res.json())
          .then(storyData => {
            const stories: StoryScript[] = storyData.stories || [];
            if (targetIP && stories.length > 0) {
              const matchingStory = stories.find(s => s.ipId === targetIP!.id);
              setStory(matchingStory || stories[0] || undefined);
            } else if (stories.length > 0) {
              setStory(stories[0]);
            } else {
              setStory(undefined);
            }
          })
          .catch(console.error);
      })
      .catch(console.error);
  }, []);

  // Handle Chat Message
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: chatMessages.map(m => ({ role: m.role, content: m.content })),
          currentIP,
          locale,
          activeSkillIds
        })
      });

      const data = await res.json();
      if (data.success) {
        const botMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toISOString(),
          action: {
            type: data.actionType,
            payload: data.extractedIP || data.generatedStory
          }
        };
        setChatMessages(prev => [...prev, botMsg]);

        // If IP created/updated
        if (data.extractedIP) {
          const newIP = data.extractedIP as IPProfile;
          setCurrentIP(newIP);
          setAllIPs(prev => {
            const exists = prev.some(item => item.id === newIP.id);
            return exists ? prev.map(item => item.id === newIP.id ? newIP : item) : [newIP, ...prev];
          });
          showToast(`已成功创建/更新 IP：${newIP.name}`);
        }

        // If Story generated
        if (data.generatedStory) {
          setStory(data.generatedStory);
          showToast(`已生成 6 格小红书爆款分镜！`);
        }
      }
    } catch {
      showToast('发送对话失败，请重试');
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handle Batch Image Rendering (Sequential Pipeline with Instant DB Persistence)
  const handleBatchRender = async () => {
    if (!story || !story.frames || story.frames.length === 0) return;
    setIsRendering(true);
    showToast('AI 正在流水线渲染分镜配图 (实时保存，刷新不丢失)...');

    const baseImage = story.baseImageUrl || currentIP?.avatarUrl || currentIP?.assets?.[0]?.url || currentIP?.turnaroundSheets?.front;
    const stylePreset = currentIP?.stylePreset || '3D Clay';
    const isImg2Img = Boolean(baseImage);

    // Set all frames to generating in UI
    setStory(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        frames: prev.frames.map(f => ({ ...f, status: 'generating' }))
      };
    });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < story.frames.length; i++) {
      const frame = story.frames[i];
      showToast(`正在流水线渲染第 ${frame.frameNumber}/${story.frames.length} 格分镜...`);

      const scenePromptEn = translateAndRefineChinesePrompt(frame.visualPrompt) || frame.visualPrompt;
      const { promptEn } = compileDiffusionPrompt(frame.visualPrompt, currentIP, stylePreset);
      const sceneCore = scenePromptEn.split(',')[0].trim();
      const isStale = !frame.visualPromptEn || !frame.visualPromptEn.trim() || (sceneCore && !frame.visualPromptEn.includes(sceneCore));
      const effectivePromptEn = isStale
        ? (isImg2Img
            ? `${scenePromptEn}, featuring the character from the reference image, in ${stylePreset} style, single standalone image, single frame, no split screen, no grid, no multi-panel, no comic strip, no speech bubbles, no text, 3:4 vertical portrait aspect ratio composition, expressive action scene, masterpiece, best quality`
            : promptEn)
        : frame.visualPromptEn;

      const frameToSend = {
        ...frame,
        visualPromptEn: effectivePromptEn
      };

      try {
        const res = await fetch('/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frame: frameToSend,
            ipId: currentIP?.id,
            storyId: story.id,
            stylePreset,
            referenceImageUrl: baseImage,
            mode: isImg2Img ? 'image-to-image' : 'text-to-image'
          })
        });

        const data = await res.json();
        if (data.success && data.frame && data.frame.imageUrl) {
          const rendered = data.frame as StoryboardFrame;
          setStory(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              frames: prev.frames.map(f => f.id === frame.id ? rendered : f)
            };
          });
          successCount++;
        } else {
          failCount++;
          const errorMsg = data.frame?.lastError || data.error || '未产出有效画作';
          setStory(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              frames: prev.frames.map(f => f.id === frame.id ? { ...f, status: 'error', lastError: errorMsg } : f)
            };
          });
        }
      } catch (err: any) {
        failCount++;
        const errorMsg = err?.message || '网络连接异常';
        setStory(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            frames: prev.frames.map(f => f.id === frame.id ? { ...f, status: 'error', lastError: errorMsg } : f)
          };
        });
      }
    }

    setIsRendering(false);
    if (failCount === 0) {
      showToast(`🎉 全部分镜渲染完成 (${successCount}/${story.frames.length} 格)！已自动保存。`, 'success');
    } else {
      showToast(
        `流水线渲染结束：成功 ${successCount} 格，失败 ${failCount} 格`,
        'warning',
        '部分格出图受限，您可点击失败格卡片上的「立即重试生成」单独重试。',
        7000
      );
    }
  };

  // Handle Single Frame Rendering
  const handleSingleRender = async (frame: StoryboardFrame) => {
    if (!story) return;
    showToast(`正在调度引擎渲染第 ${frame.frameNumber} 格分镜...`, 'info', undefined, 3000);

    setStory(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        frames: prev.frames.map(f => f.id === frame.id ? { ...f, status: 'generating', lastError: undefined } : f)
      };
    });

    const baseImage = story.baseImageUrl || currentIP?.avatarUrl || currentIP?.assets?.[0]?.url || currentIP?.turnaroundSheets?.front;
    const stylePreset = currentIP?.stylePreset || '3D Clay';
    const isImg2Img = Boolean(baseImage);
    const scenePromptEn = translateAndRefineChinesePrompt(frame.visualPrompt) || frame.visualPrompt;
    const { promptEn } = compileDiffusionPrompt(frame.visualPrompt, currentIP, stylePreset);
    
    // Ensure we don't send stale portrait-only prompts
    const sceneCore = scenePromptEn.split(',')[0].trim();
    const isStale = !frame.visualPromptEn || !frame.visualPromptEn.trim() || (sceneCore && !frame.visualPromptEn.includes(sceneCore));
    const effectivePromptEn = isStale
      ? (isImg2Img
          ? `${scenePromptEn}, featuring the character from the reference image, in ${stylePreset} style, single standalone image, single frame, no split screen, no grid, no multi-panel, no comic strip, no speech bubbles, no text, 3:4 vertical portrait aspect ratio composition, expressive action scene, masterpiece, best quality`
          : promptEn)
      : frame.visualPromptEn;

    const frameToSend = {
      ...frame,
      visualPromptEn: effectivePromptEn
    };

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame: frameToSend,
          ipId: currentIP?.id,
          storyId: story.id,
          stylePreset,
          referenceImageUrl: baseImage,
          mode: isImg2Img ? 'image-to-image' : 'text-to-image'
        })
      });

      const data = await res.json();
      if (data.success && data.frame && data.frame.imageUrl) {
        const rendered = data.frame as StoryboardFrame;
        setStory(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            frames: prev.frames.map(f => f.id === frame.id ? rendered : f)
          };
        });
        showToast(`🎉 第 ${frame.frameNumber} 格分镜渲染完成！已保存。`, 'success');
      } else {
        const errorReason = data.frame?.lastError || data.error || '未能产出专属图片，会话已安全退出。';
        setStory(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            frames: prev.frames.map(f => f.id === frame.id ? { ...f, status: 'error', lastError: errorReason } : f)
          };
        });
        showToast(
          `第 ${frame.frameNumber} 格渲染失败`,
          'error',
          errorReason,
          9000
        );
      }
    } catch (err: any) {
      const errorReason = err?.message || '网络连接或服务端异常';
      setStory(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          frames: prev.frames.map(f => f.id === frame.id ? { ...f, status: 'error', lastError: errorReason } : f)
        };
      });
      showToast(`第 ${frame.frameNumber} 格渲染异常`, 'error', errorReason, 9000);
    }
  };

  // Update Story
  const handleUpdateStory = (updates: Partial<StoryScript>) => {
    setStory(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      fetch('/api/story', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(console.error);
      return updated;
    });
  };

  // Save IP
  const handleSaveIP = async (savedIP: IPProfile) => {
    setCurrentIP(savedIP);
    try {
      localStorage.setItem('ip_helper_last_selected_ip_id', savedIP.id);
    } catch {
      // ignore
    }
    setAllIPs(prev => {
      const exists = prev.some(item => item.id === savedIP.id);
      return exists ? prev.map(item => item.id === savedIP.id ? savedIP : item) : [savedIP, ...prev];
    });
    try {
      const res = await fetch('/api/ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedIP)
      });
      const data = await res.json();
      if (!data.success) {
        showToast(`角色保存失败: ${data.error || '未知错误'}`);
      }
    } catch {
      showToast('网络请求异常，角色保存可能未同步到本地');
    }
  };

  // Delete IP
  const handleDeleteIP = (id: string) => {
    if (id === 'all') {
      setAllIPs([]);
      setCurrentIP(undefined);
      setStory(undefined);
      try {
        localStorage.removeItem('ip_helper_last_selected_ip_id');
      } catch {}
      fetch('/api/ip?id=all', {
        method: 'DELETE',
        headers: { 'x-confirm-purge': 'confirmed' }
      }).catch(console.error);
      showToast('已清空所有 IP 角色');
      return;
    }
    const remaining = allIPs.filter(item => item.id !== id);
    setAllIPs(remaining);
    if (currentIP?.id === id) {
      const nextIP = remaining.length > 0 ? remaining[0] : undefined;
      setCurrentIP(nextIP);
      if (nextIP) {
        try {
          localStorage.setItem('ip_helper_last_selected_ip_id', nextIP.id);
        } catch {}
        fetch('/api/story')
          .then(res => res.json())
          .then(data => {
            const match = data.stories?.find((s: StoryScript) => s.ipId === nextIP.id);
            setStory(match || undefined);
          })
          .catch(() => setStory(undefined));
      } else {
        setStory(undefined);
        try {
          localStorage.removeItem('ip_helper_last_selected_ip_id');
        } catch {}
      }
    } else if (story?.ipId === id) {
      setStory(undefined);
    }
    fetch(`/api/ip?id=${id}`, { method: 'DELETE' }).catch(console.error);
  };

  // Select Active IP
  const handleSelectIP = (ip: IPProfile) => {
    setCurrentIP(ip);
    try {
      localStorage.setItem('ip_helper_last_selected_ip_id', ip.id);
    } catch {
      // ignore
    }
    fetch('/api/story')
      .then(res => res.json())
      .then(data => {
        const match = data.stories?.find((s: StoryScript) => s.ipId === ip.id);
        if (match) {
          setStory(match);
        } else {
          // If no story exists for this IP yet, generate a default one and persist
          const newStory = generateStoryboardForIP(ip, `${ip.name}的日常抓马翻车`, locale);
          setStory(newStory);
          persistNewStory(newStory);
        }
      })
      .catch(() => setStory(undefined));
  };

  // Persist a freshly generated story (fire-and-forget with feedback on failure)
  const persistNewStory = (newStory: StoryScript) => {
    fetch('/api/story', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStory)
    })
      .then(res => res.json())
      .then(data => {
        if (!data?.success) showToast('故事保存失败，刷新后可能丢失');
      })
      .catch(() => showToast('故事保存失败，刷新后可能丢失'));
  };

  // Transition from Character Manager to Story Studio
  const handleGoToStoryStudio = async (ip: IPProfile) => {
    setCurrentIP(ip);
    try {
      localStorage.setItem('ip_helper_last_selected_ip_id', ip.id);
    } catch {}

    // Check if a story already exists for this IP before generating a fresh one to prevent data loss!
    try {
      const res = await fetch('/api/story');
      const data = await res.json();
      const existingStory = data.stories?.find((s: StoryScript) => s.ipId === ip.id);
      if (existingStory) {
        setStory(existingStory);
      } else {
        const newStory = generateStoryboardForIP(ip, `${ip.name}的日常抓马翻车`, locale);
        setStory(newStory);
        persistNewStory(newStory);
      }
    } catch {
      if (!story || story.ipId !== ip.id) {
        const newStory = generateStoryboardForIP(ip, `${ip.name}的日常抓马翻车`, locale);
        setStory(newStory);
        persistNewStory(newStory);
      }
    }

    handleSwitchView('studio');
    showToast(`已切换至【${ip.name}】故事创作工坊`);
  };

  // Toggle skill
  const handleToggleSkill = (skillId: string) => {
    setActiveSkillIds(prev => {
      const exists = prev.includes(skillId);
      return exists ? prev.filter(id => id !== skillId) : [...prev, skillId];
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Top Global Navigation Bar */}
      <Header
        activeView={activeView}
        onSwitchView={handleSwitchView}
        currentIP={currentIP}
        allIPs={allIPs}
        onSelectIP={handleSelectIP}
        onOpenSkills={() => setIsSkillsModalOpen(true)}
        onOpenModelSettings={() => setIsModelSettingsOpen(true)}
        skills={skills}
        activeSkillIds={activeSkillIds}
        onToggleSkill={handleToggleSkill}
        activeProviderName={getProviderById(imageEngineConfig.activeProviderId).name}
      />

      {/* Main View Area: Characters Manager vs Story Studio */}
      <div className="flex-1 flex overflow-hidden">
        {activeView === 'characters' ? (
          <CharacterManager
            ips={allIPs}
            currentIP={currentIP}
            onSelectIP={handleSelectIP}
            onSaveIP={handleSaveIP}
            onDeleteIP={handleDeleteIP}
            onGoToStoryStudio={handleGoToStoryStudio}
            onShowToast={showToast}
          />
        ) : (
          <StoryStudio
            currentIP={currentIP}
            allIPs={allIPs}
            onSelectIP={handleSelectIP}
            story={story}
            onUpdateStory={handleUpdateStory}
            onSetStory={(newStory?: StoryScript) => {
              setStory(newStory);
              if (newStory) {
                persistNewStory(newStory);
              }
            }}
            skills={skills}
            activeSkillIds={activeSkillIds}
            onShowToast={showToast}
            onBatchRender={handleBatchRender}
            onSingleRender={handleSingleRender}
            isRendering={isRendering}
          />
        )}
      </div>

      {/* Image Model Settings Modal */}
      <ImageModelSettingsModal
        isOpen={isModelSettingsOpen}
        onClose={() => setIsModelSettingsOpen(false)}
        config={imageEngineConfig}
        onSaveConfig={setImageEngineConfig}
        onShowToast={showToast}
      />

      {/* Domain Skills Hub Modal */}
      <SkillsModal
        isOpen={isSkillsModalOpen}
        onClose={() => setIsSkillsModalOpen(false)}
        skills={skills}
        activeSkillIds={activeSkillIds}
        onToggleSkill={handleToggleSkill}
      />

      {/* Toast Notification Floating Card */}
      {toastInfo && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm w-auto px-4 py-3 rounded-2xl backdrop-blur-md shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 border ${
            toastInfo.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/60 text-rose-100 shadow-rose-950/40'
              : toastInfo.type === 'warning'
              ? 'bg-amber-950/90 border-amber-500/60 text-amber-100 shadow-amber-950/40'
              : toastInfo.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-100 shadow-emerald-950/40'
              : 'bg-zinc-900/95 border-violet-500/50 text-zinc-100 shadow-black/40'
          }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {toastInfo.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            {toastInfo.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
            {toastInfo.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toastInfo.type === 'info' && <Info className="w-4 h-4 text-violet-400" />}
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="text-xs font-semibold leading-snug">{toastInfo.message}</div>
            {toastInfo.detail && (
              <div className="text-[10px] text-zinc-300/80 mt-1 font-mono leading-relaxed break-words bg-black/30 p-1.5 rounded-lg border border-white/5">
                {toastInfo.detail}
              </div>
            )}
          </div>

          <button
            onClick={() => setToastInfo(null)}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <I18nProvider>
      <MainApp />
    </I18nProvider>
  );
}

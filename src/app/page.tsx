'use client';

import React, { useState, useEffect } from 'react';
import { I18nProvider, useI18n } from '@/lib/i18n/context';
import { IPProfile, StoryScript, StoryboardFrame, Skill, ChatMessage } from '@/types';
import { initialIPProfiles, initialStoryScript } from '@/lib/db/mockDb';
import { Header } from '@/components/Header';
import { CharacterManager } from '@/components/CharacterManager';
import { StoryStudio } from '@/components/StoryStudio';
import { SkillsModal } from '@/components/SkillsModal';
import { ImageModelSettingsModal } from '@/components/ImageModelSettingsModal';
import { ImageEngineConfig } from '@/types';
import { getProviderById } from '@/lib/render/modelProviders';
import { generateStoryboardForIP } from '@/lib/agent/engine';

function MainApp() {
  const { locale } = useI18n();

  // Top-level Navigation View
  const [activeView, setActiveView] = useState<'characters' | 'studio'>('characters');

  // Core Data States
  const [allIPs, setAllIPs] = useState<IPProfile[]>(initialIPProfiles);
  const [currentIP, setCurrentIP] = useState<IPProfile | undefined>(initialIPProfiles[0]);
  const [story, setStory] = useState<StoryScript | undefined>(initialStoryScript);
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Initial Sync from API
  useEffect(() => {
    fetch('/api/skills')
      .then(res => res.json())
      .then(data => {
        if (data.skills) setSkills(data.skills);
      })
      .catch(console.error);

    fetch('/api/ip')
      .then(res => res.json())
      .then(data => {
        if (data.ips !== undefined) {
          setAllIPs(data.ips);
          if (data.ips.length > 0) {
            setCurrentIP(data.ips[0]);
          } else {
            setCurrentIP(undefined);
          }
        }
      })
      .catch(console.error);

    fetch('/api/story')
      .then(res => res.json())
      .then(data => {
        if (data.stories !== undefined) {
          if (data.stories.length > 0) {
            setStory(data.stories[0]);
          } else {
            setStory(undefined);
          }
        }
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

  // Handle Batch Image Rendering
  const handleBatchRender = async () => {
    if (!story || !story.frames || story.frames.length === 0) return;
    setIsRendering(true);
    showToast('AI 正在批量渲染分镜配图...');

    setStory(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        frames: prev.frames.map(f => ({ ...f, status: 'generating' }))
      };
    });

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: story.frames,
          ipId: currentIP?.id,
          stylePreset: currentIP?.stylePreset || '3D Clay'
        })
      });

      const data = await res.json();
      if (data.success && data.frames) {
        setStory(prev => {
          if (!prev) return prev;
          const updated = { ...prev, frames: data.frames as StoryboardFrame[] };
          fetch('/api/story', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
          }).catch(console.error);
          return updated;
        });
        const okCount = (data.frames as StoryboardFrame[]).filter(f => f.status === 'completed' && f.imageUrl).length;
        const failCount = (data.frames as StoryboardFrame[]).length - okCount;
        showToast(failCount === 0
          ? '🎉 全部分镜渲染完成！'
          : `渲染完成：成功 ${okCount} 格，失败 ${failCount} 格（可点击失败格重试）`);
      }
    } catch {
      showToast('渲染失败，请重试');
    } finally {
      setIsRendering(false);
    }
  };

  // Handle Single Frame Rendering
  const handleSingleRender = async (frame: StoryboardFrame) => {
    if (!story) return;
    showToast(`正在重新渲染第 ${frame.frameNumber} 格分镜...`);

    setStory(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        frames: prev.frames.map(f => f.id === frame.id ? { ...f, status: 'generating' } : f)
      };
    });

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame,
          ipId: currentIP?.id,
          stylePreset: currentIP?.stylePreset || '3D Clay'
        })
      });

      const data = await res.json();
      if (data.success && data.frame) {
        const rendered = data.frame as StoryboardFrame;
        setStory(prev => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            frames: prev.frames.map(f => f.id === frame.id ? rendered : f)
          };
          fetch('/api/story', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
          }).catch(console.error);
          return updated;
        });
        showToast(rendered.imageUrl
          ? `第 ${frame.frameNumber} 格分镜重绘成功！`
          : `第 ${frame.frameNumber} 格重绘失败，请稍后重试`);
      }
    } catch {
      showToast('重绘失败，请重试');
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
  const handleSaveIP = (savedIP: IPProfile) => {
    setCurrentIP(savedIP);
    setAllIPs(prev => {
      const exists = prev.some(item => item.id === savedIP.id);
      return exists ? prev.map(item => item.id === savedIP.id ? savedIP : item) : [savedIP, ...prev];
    });
    fetch('/api/ip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(savedIP)
    }).catch(console.error);
  };

  // Delete IP
  const handleDeleteIP = (id: string) => {
    const remaining = allIPs.filter(item => item.id !== id);
    setAllIPs(remaining);
    if (currentIP?.id === id && remaining.length > 0) {
      setCurrentIP(remaining[0]);
    }
    fetch(`/api/ip?id=${id}`, { method: 'DELETE' }).catch(console.error);
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
  const handleGoToStoryStudio = (ip: IPProfile) => {
    setCurrentIP(ip);
    // Dynamically generate a fresh story for this character if needed
    const newStory = generateStoryboardForIP(ip, `${ip.name}的日常抓马翻车`, locale);
    setStory(newStory);
    persistNewStory(newStory);
    setActiveView('studio');
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
        onSwitchView={setActiveView}
        currentIP={currentIP}
        allIPs={allIPs}
        onSelectIP={setCurrentIP}
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
            onSelectIP={setCurrentIP}
            onSaveIP={handleSaveIP}
            onDeleteIP={handleDeleteIP}
            onGoToStoryStudio={handleGoToStoryStudio}
            onShowToast={showToast}
          />
        ) : (
          <StoryStudio
            currentIP={currentIP}
            allIPs={allIPs}
            onSelectIP={setCurrentIP}
            story={story}
            onUpdateStory={handleUpdateStory}
            onSetStory={(newStory: StoryScript) => {
              setStory(newStory);
              persistNewStory(newStory);
            }}
            skills={skills}
            activeSkillIds={activeSkillIds}
            chatMessages={chatMessages}
            onSendMessage={handleSendMessage}
            isChatLoading={isChatLoading}
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

      {/* Toast Notification Floating Pill */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-zinc-900/95 border border-violet-500/50 shadow-2xl text-xs font-semibold text-zinc-100 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
          {toastMessage}
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

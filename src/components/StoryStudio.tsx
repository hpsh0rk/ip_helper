'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { IPProfile, StoryScript, StoryboardFrame, Skill, ChatMessage } from '@/types';
import { AIChatPane } from '@/components/AIChatPane';
import { StoryboardCanvas } from '@/components/StoryboardCanvas';
import { XhsPreviewPane } from '@/components/XhsPreviewPane';
import { generateSuggestedTopicsForIP, generateStoryboardForIP } from '@/lib/agent/engine';
import { Sparkles, Wand2, Lightbulb, ChevronDown, Check, User } from 'lucide-react';

interface StoryStudioProps {
  currentIP?: IPProfile;
  allIPs: IPProfile[];
  onSelectIP: (ip: IPProfile) => void;
  story?: StoryScript;
  onUpdateStory: (updates: Partial<StoryScript>) => void;
  onSetStory: (story: StoryScript) => void;
  skills: Skill[];
  activeSkillIds: string[];
  chatMessages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  isChatLoading: boolean;
  onShowToast: (msg: string) => void;
  onBatchRender: () => void;
  onSingleRender: (frame: StoryboardFrame) => void;
  isRendering: boolean;
}

export function StoryStudio({
  currentIP,
  allIPs,
  onSelectIP,
  story,
  onUpdateStory,
  onSetStory,
  skills,
  activeSkillIds,
  chatMessages,
  onSendMessage,
  isChatLoading,
  onShowToast,
  onBatchRender,
  onSingleRender,
  isRendering
}: StoryStudioProps) {
  const { t, locale } = useI18n();
  const [selectedFrameId, setSelectedFrameId] = useState<string | undefined>(story?.frames[0]?.id);
  const [showIPMenu, setShowIPMenu] = useState(false);
  const [customTopic, setCustomTopic] = useState('');

  const suggestedTopics = currentIP
    ? generateSuggestedTopicsForIP(currentIP, locale)
    : ['咖啡馆打翻奶泡大翻车', '雨夜极速送外卖', '偷偷减肥半夜破功'];

  const handleGenerateTopicStory = (topicStr: string) => {
    if (!currentIP) {
      onShowToast('请先选择一个 IP 角色');
      return;
    }
    const newStory = generateStoryboardForIP(currentIP, topicStr, locale);
    onSetStory(newStory);
    if (newStory.frames.length > 0) {
      setSelectedFrameId(newStory.frames[0].id);
    }
    onShowToast(`已为 ${currentIP.name} 生成关于【${newStory.topic}】的 6 格分镜！`);
  };

  const handleUpdateFrame = (frameId: string, updates: Partial<StoryboardFrame>) => {
    if (!story) return;
    const updatedFrames = story.frames.map(f => f.id === frameId ? { ...f, ...updates } : f);
    onUpdateStory({ frames: updatedFrames });
  };

  const handleDeleteFrame = (frameId: string) => {
    if (!story) return;
    const filtered = story.frames.filter(f => f.id !== frameId);
    onUpdateStory({ frames: filtered.map((f, idx) => ({ ...f, frameNumber: idx + 1 })) });
    onShowToast('已删除该分镜');
  };

  const handleAddFrame = () => {
    if (!story) return;
    const newNum = story.frames.length + 1;
    const newFrame: StoryboardFrame = {
      id: `frame-${Date.now()}`,
      frameNumber: newNum,
      title: `P${newNum} 剧情发展`,
      visualPrompt: `${currentIP?.name || '角色'}在场景中展开新行动`,
      visualPromptEn: `Character in scene continuation, anime aesthetic, 3:4 portrait`,
      narration: '故事新进展...',
      dialogue: `${currentIP?.name || '角色'}："又有新发现了！"`,
      imageUrl: currentIP?.avatarUrl || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
      isCover: false,
      status: 'completed'
    };

    onUpdateStory({ frames: [...story.frames, newFrame] });
    setSelectedFrameId(newFrame.id);
    onShowToast(`已添加第 ${newNum} 格分镜`);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
      {/* Studio Header & Dynamic Topic Bar */}
      <div className="p-3.5 px-6 border-b border-zinc-800 bg-zinc-900/50 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Active IP Selector */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowIPMenu(!showIPMenu)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-100 text-xs font-semibold transition-all shadow-sm cursor-pointer"
            >
              {currentIP ? (
                <>
                  <img
                    src={currentIP.avatarUrl}
                    alt={currentIP.name}
                    className="w-5 h-5 rounded-full object-cover border border-violet-500"
                  />
                  <span>{currentIP.name}</span>
                </>
              ) : (
                <span className="text-zinc-400">选择 IP 角色</span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {showIPMenu && (
              <div className="absolute left-0 mt-2 w-64 rounded-xl bg-zinc-900 border border-zinc-700/90 shadow-2xl p-2 z-50">
                <span className="text-[11px] font-bold text-zinc-400 px-2 py-1 uppercase tracking-wider block">
                  切换创作角色
                </span>
                <div className="space-y-1 my-1">
                  {allIPs.map(ip => (
                    <div
                      key={ip.id}
                      onClick={() => {
                        onSelectIP(ip);
                        setShowIPMenu(false);
                      }}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        currentIP?.id === ip.id
                          ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                          : 'hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <img src={ip.avatarUrl} alt={ip.name} className="w-6 h-6 rounded-full object-cover" />
                        <span className="font-medium truncate">{ip.name}</span>
                      </div>
                      {currentIP?.id === ip.id && <Check className="w-3.5 h-3.5 text-violet-400" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick AI Topic Suggestions */}
          <div className="hidden lg:flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              灵感选题:
            </span>
            {suggestedTopics.slice(0, 3).map((topic, idx) => (
              <button
                key={idx}
                onClick={() => handleGenerateTopicStory(topic)}
                className="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-violet-950 hover:border-violet-500/50 border border-zinc-800 text-zinc-300 text-[11px] transition-all cursor-pointer truncate max-w-[200px]"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Custom Topic Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customTopic.trim()) {
                handleGenerateTopicStory(customTopic.trim());
                setCustomTopic('');
              }
            }}
            placeholder="输入任意故事主题 (如: 第一次看牙医翻车)..."
            className="w-64 bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
          />
          <button
            onClick={() => {
              if (customTopic.trim()) {
                handleGenerateTopicStory(customTopic.trim());
                setCustomTopic('');
              }
            }}
            disabled={!customTopic.trim()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            生成分镜
          </button>
        </div>
      </div>

      {/* 3-Column Studio Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: AI Chat Co-pilot */}
        <div className="w-80 lg:w-96 flex-shrink-0 h-full">
          <AIChatPane
            messages={chatMessages}
            onSendMessage={onSendMessage}
            isLoading={isChatLoading}
            activeSkills={skills.filter(s => activeSkillIds.includes(s.id))}
            currentIP={currentIP}
          />
        </div>

        {/* Center Column: 6-Panel Storyboard Canvas */}
        <StoryboardCanvas
          story={story}
          currentIP={currentIP}
          onUpdateFrame={handleUpdateFrame}
          onDeleteFrame={handleDeleteFrame}
          onAddFrame={handleAddFrame}
          onBatchRender={onBatchRender}
          onSingleRender={onSingleRender}
          isRendering={isRendering}
          selectedFrameId={selectedFrameId}
          onSelectFrame={setSelectedFrameId}
        />

        {/* Right Column: Xiaohongshu Phone Simulator & Cover Customizer */}
        <XhsPreviewPane
          story={story}
          currentIP={currentIP}
          onUpdateStory={onUpdateStory}
          onShowToast={onShowToast}
        />
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { StoryScript, StoryboardFrame, IPProfile } from '@/types';
import {
  Wand2,
  RefreshCw,
  Trash2,
  Plus,
  Star,
  Image as ImageIcon,
  ChevronDown,
  Check,
  Code,
  Copy,
  Terminal,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { compileDiffusionPrompt, translateAndRefineChinesePrompt } from '@/lib/i18n/promptTranslator';
import { buildDiffusionPromptString } from '@/lib/render/imageEngine';

interface StoryboardCanvasProps {
  story?: StoryScript;
  currentIP?: IPProfile;
  onUpdateFrame: (frameId: string, updates: Partial<StoryboardFrame>) => void;
  onDeleteFrame: (frameId: string) => void;
  onAddFrame: () => void;
  onBatchRender: () => void;
  onSingleRender: (frame: StoryboardFrame) => void;
  isRendering: boolean;
  selectedFrameId?: string;
  onSelectFrame: (frameId: string) => void;
  onResetStory?: () => void;
  onUpdateStory?: (updates: Partial<StoryScript>) => void;
}

export function StoryboardCanvas({
  story,
  currentIP,
  onUpdateFrame,
  onDeleteFrame,
  onAddFrame,
  onBatchRender,
  onSingleRender,
  isRendering,
  selectedFrameId,
  onSelectFrame,
  onResetStory,
  onUpdateStory
}: StoryboardCanvasProps) {
  const { t } = useI18n();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [showBaseImagePicker, setShowBaseImagePicker] = useState(false);
  const [expandedDebugFrames, setExpandedDebugFrames] = useState<Record<string, boolean>>({});
  const [copiedFrameId, setCopiedFrameId] = useState<string | null>(null);

  const handleCopyPrompt = async (frameId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFrameId(frameId);
      setTimeout(() => setCopiedFrameId(null), 2000);
    } catch {
      // ignore
    }
  };

  if (!story) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/40">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
          <ImageIcon className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-300">暂无分镜故事</h3>
        <p className="text-xs text-zinc-500 max-w-sm mt-1">
          在左侧与 AI 对话即可一键生成 6 格小红书爆款分镜故事！
        </p>
      </div>
    );
  }

  // Collect all available character reference images from asset library
  const availableBaseImages: Array<{ url: string; label: string }> = [];
  if (currentIP?.avatarUrl) {
    availableBaseImages.push({ url: currentIP.avatarUrl, label: '主头像' });
  }
  if (currentIP?.turnaroundSheets?.front) {
    availableBaseImages.push({ url: currentIP.turnaroundSheets.front, label: '正面立绘' });
  }
  if (currentIP?.turnaroundSheets?.side) {
    availableBaseImages.push({ url: currentIP.turnaroundSheets.side, label: '侧面立绘' });
  }
  if (currentIP?.turnaroundSheets?.back) {
    availableBaseImages.push({ url: currentIP.turnaroundSheets.back, label: '背面立绘' });
  }
  if (currentIP?.assets && currentIP.assets.length > 0) {
    currentIP.assets.forEach((asset, idx) => {
      if (!availableBaseImages.some(img => img.url === asset.url)) {
        availableBaseImages.push({ url: asset.url, label: asset.label || `资产 #${idx + 1}` });
      }
    });
  }

  const activeBaseImageUrl = story.baseImageUrl || availableBaseImages[0]?.url || '';
  const currentBaseImageLabel = availableBaseImages.find(img => img.url === activeBaseImageUrl)?.label || (activeBaseImageUrl ? '已选基图' : '未选基图');
  const isImg2Img = Boolean(activeBaseImageUrl);

  const allDebugExpanded = story.frames.length > 0 && story.frames.every(f => expandedDebugFrames[f.id]);
  const toggleAllDebugPrompts = () => {
    if (allDebugExpanded) {
      setExpandedDebugFrames({});
    } else {
      const next: Record<string, boolean> = {};
      story.frames.forEach(f => { next[f.id] = true; });
      setExpandedDebugFrames(next);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950/30">
      {/* Canvas Top Bar */}
      <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/40 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">
              {currentIP ? currentIP.name : 'IP'}
            </span>
            <h2 className="text-sm font-bold text-zinc-100 truncate max-w-md">{story.title}</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{story.summary}</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Base Reference Image Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBaseImagePicker(prev => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-violet-500/50 text-xs text-zinc-300 transition-all cursor-pointer shadow-xs"
              title="从当前角色的资源库中挑选分镜渲染基图"
            >
              <span className="text-[10px] text-zinc-400 font-medium">渲染基图:</span>
              {activeBaseImageUrl ? (
                <img
                  src={activeBaseImageUrl}
                  alt="Base"
                  className="w-4 h-4 rounded-full object-cover border border-violet-500/60"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500">
                  <ImageIcon className="w-2.5 h-2.5" />
                </div>
              )}
              <span className="font-semibold text-zinc-200 truncate max-w-[80px]">
                {currentBaseImageLabel}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {showBaseImagePicker && (
              <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-zinc-900/95 backdrop-blur-md rounded-xl border border-zinc-700/80 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[11px] font-bold text-zinc-200 mb-2 flex items-center justify-between">
                  <span>从【{currentIP?.name || '角色'}】资源库选择基图</span>
                  <span className="text-[10px] text-zinc-500 font-normal">{availableBaseImages.length} 张可用</span>
                </div>
                {availableBaseImages.length === 0 ? (
                  <div className="p-3 text-center text-xs text-zinc-500 bg-zinc-950/60 rounded-lg">
                    资源库暂无图片，将按构图描述文生图<br />
                    <span className="text-[10px] text-violet-400 mt-1 block">建议前往【IP 角色管理】生成或上传基准立绘</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto p-0.5">
                    {availableBaseImages.map((item, idx) => {
                      const isSelected = item.url === activeBaseImageUrl;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            onUpdateStory?.({ baseImageUrl: item.url });
                            setShowBaseImagePicker(false);
                          }}
                          className={`relative aspect-square rounded-lg overflow-hidden border transition-all cursor-pointer group ${
                            isSelected ? 'border-violet-500 ring-2 ring-violet-500/40 shadow-sm' : 'border-zinc-800 hover:border-zinc-600'
                          }`}
                        >
                          <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 bg-black/75 px-1 py-0.5 text-[9px] text-zinc-200 truncate text-center font-medium">
                            {item.label}
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center text-white shadow-sm">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Toggle All Prompt Debug Button */}
          <button
            type="button"
            onClick={toggleAllDebugPrompts}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all shadow-xs cursor-pointer ${
              allDebugExpanded
                ? 'bg-violet-950/60 border-violet-500/50 text-violet-300'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700/80 hover:border-violet-500/50 text-zinc-300'
            }`}
            title="一键展开或折叠所有分镜的生图 Prompt 调试面板"
          >
            <Terminal className="w-3.5 h-3.5 text-violet-400" />
            <span>{allDebugExpanded ? '折叠 Prompt' : 'Prompt 调试'}</span>
          </button>

          <button
            onClick={onAddFrame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            {t.workbench.addScene}
          </button>

          {onResetStory && (
            <button
              onClick={onResetStory}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/40 border border-zinc-700/80 hover:border-rose-700/50 text-zinc-400 hover:text-rose-300 text-xs font-medium transition-all shadow-xs cursor-pointer"
              title="清空重置当前分镜故事"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空
            </button>
          )}

          <button
            onClick={onBatchRender}
            disabled={isRendering}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all cursor-pointer"
          >
            {isRendering ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            {t.workbench.batchGenerate}
          </button>
        </div>
      </div>

      {/* Visual Canvas Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-6">
          {story.frames.map((frame, index) => {
            const isSelected = selectedFrameId === frame.id;
            const isDebugExpanded = Boolean(expandedDebugFrames[frame.id]);

            // Compute dynamic prompt preview
            const scenePromptEn = translateAndRefineChinesePrompt(frame.visualPrompt) || frame.visualPrompt;
            const stylePreset = currentIP?.stylePreset || '3D Clay';
            const { promptEn, negativePrompt } = compileDiffusionPrompt(frame.visualPrompt, currentIP, stylePreset);
            
            // Full target prompt compiled for rendering
            const fullPrompt = isImg2Img
              ? `${scenePromptEn}, featuring the character from the reference image, in ${stylePreset} style, single standalone image, single frame, no split screen, no grid, no multi-panel, no comic strip, no speech bubbles, no text, 3:4 vertical portrait aspect ratio composition, expressive action scene, masterpiece, best quality`
              : promptEn;

            return (
              <div
                key={frame.id}
                onClick={() => onSelectFrame(frame.id)}
                className={`group relative flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer ${
                  isSelected
                    ? 'border-violet-500 ring-2 ring-violet-500/20 bg-zinc-900/90 shadow-xl shadow-violet-500/5'
                    : 'border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/60'
                }`}
              >
                {/* Frame Header */}
                <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between gap-2 bg-zinc-900/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-300 font-bold text-xs flex items-center justify-center">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={frame.title}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdateFrame(frame.id, { title: e.target.value })}
                      className="text-xs font-semibold text-zinc-200 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-violet-500/50 rounded px-1 truncate w-full"
                    />
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {frame.isCover && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-semibold flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-amber-400" />
                        封面格
                      </span>
                    )}

                    {/* Single Frame Render / Retry Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageErrors(prev => ({ ...prev, [frame.id]: false }));
                        onSingleRender(frame);
                      }}
                      disabled={isRendering || frame.status === 'generating'}
                      title={frame.imageUrl ? '重新生成此格' : '生成此格图片'}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-violet-300 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${frame.status === 'generating' ? 'animate-spin text-violet-400' : ''}`} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFrame(frame.id);
                      }}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Image Area */}
                <div className="relative aspect-[3/4] w-full bg-zinc-950 overflow-hidden flex items-center justify-center">
                  {frame.status === 'generating' ? (
                    <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-4">
                      <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
                      <span className="text-[11px] text-violet-300 font-medium animate-pulse">渲染中...</span>
                    </div>
                  ) : frame.imageUrl && !imageErrors[frame.id] && frame.status !== 'error' ? (
                    <img
                      src={frame.imageUrl}
                      alt={frame.title}
                      onError={() => setImageErrors(prev => ({ ...prev, [frame.id]: true }))}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : frame.status === 'error' || imageErrors[frame.id] ? (
                    <div className="flex flex-col items-center justify-center gap-2 p-3 text-center w-full h-full bg-gradient-to-b from-rose-950/40 via-zinc-950 to-zinc-950 border-2 border-rose-500/30">
                      <div className="w-9 h-9 rounded-xl bg-rose-900/40 border border-rose-500/50 flex items-center justify-center text-rose-400">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 px-2">
                        <span className="text-[11px] font-semibold text-rose-300 block">
                          {imageErrors[frame.id] ? '图片加载失败' : '出图未成功'}
                        </span>
                        {frame.lastError && (
                          <p className="text-[9px] text-zinc-400 mt-1 line-clamp-2 leading-tight font-mono bg-zinc-900/90 px-1.5 py-1 rounded border border-rose-900/50 text-left">
                            {frame.lastError.includes('429') || frame.lastError.includes('RESOURCE_EXHAUSTED') 
                              ? '⚠️ 上游生图配额超限(429)，预计稍后自动恢复'
                              : frame.lastError.slice(0, 85)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageErrors(prev => ({ ...prev, [frame.id]: false }));
                          onSingleRender(frame);
                        }}
                        className="mt-1 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/50 text-rose-200 hover:text-white text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                      >
                        <RefreshCw className="w-3 h-3 text-rose-300" />
                        立即重试生成
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 p-4 text-center text-zinc-500 w-full h-full bg-gradient-to-b from-zinc-900/60 to-zinc-950/90">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400 group-hover:text-violet-300 group-hover:border-violet-500/50 transition-colors">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium text-zinc-400">待渲染配图</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageErrors(prev => ({ ...prev, [frame.id]: false }));
                          onSingleRender(frame);
                        }}
                        className="mt-0.5 px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-300 text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Wand2 className="w-3 h-3" />
                        生成此格
                      </button>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white">
                    {index + 1} / {story.frames.length}
                  </div>
                </div>

                {/* Prompt & Narration Inputs */}
                <div className="p-3 space-y-2.5 bg-zinc-900/60 text-xs">
                  <div>
                    <label className="text-[10px] font-medium text-zinc-400 block mb-1">
                      🎬 {t.workbench.sceneCard.visualPrompt}
                    </label>
                    <textarea
                      value={frame.visualPrompt}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const newZh = e.target.value;
                        const { promptEn: newCompiledEn } = compileDiffusionPrompt(newZh, currentIP, stylePreset);
                        onUpdateFrame(frame.id, {
                          visualPrompt: newZh,
                          visualPromptEn: newCompiledEn
                        });
                      }}
                      rows={2}
                      className="w-full bg-zinc-950/70 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs focus:border-violet-500 focus:outline-none resize-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-medium text-zinc-400 block mb-1">
                      💬 {t.workbench.sceneCard.narration}
                    </label>
                    <input
                      type="text"
                      value={frame.dialogue || frame.narration}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdateFrame(frame.id, { dialogue: e.target.value, narration: e.target.value })}
                      className="w-full bg-zinc-950/70 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:border-violet-500 focus:outline-none truncate"
                    />
                  </div>

                  {/* Prompt Debug Collapsible Panel */}
                  <div className="pt-1.5 border-t border-zinc-800/60">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDebugFrames(prev => ({
                          ...prev,
                          [frame.id]: !prev[frame.id]
                        }));
                      }}
                      className="w-full flex items-center justify-between py-1 px-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors group/debug cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <Code className="w-3 h-3 text-violet-400" />
                        <span className="font-mono text-[10px] text-zinc-400 group-hover/debug:text-violet-300">
                          Prompt Debug ({isImg2Img ? '垫图衍生模式' : '纯文生图'})
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <span>{isDebugExpanded ? '收起' : '展开'}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isDebugExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {isDebugExpanded && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90 space-y-2 animate-in fade-in zoom-in-95 duration-150 text-[10px]"
                      >
                        {/* Mode Badge & Copy Action */}
                        <div className="flex items-center justify-between text-zinc-400 pb-1.5 border-b border-zinc-800/60 gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              isImg2Img
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              {isImg2Img ? '📸 Image-to-Image (垫图衍生)' : '✍️ Text-to-Image (纯文本)'}
                            </span>
                            <span className="text-zinc-500 text-[9px]">画风: {stylePreset}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopyPrompt(frame.id, fullPrompt)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium transition-colors cursor-pointer"
                              title="复制最终发送给模型的完整英文 Prompt"
                            >
                              {copiedFrameId === frame.id ? (
                                <>
                                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                                  <span className="text-emerald-400">已复制</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>复制 Prompt</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Reference Image Info */}
                        {isImg2Img && (
                          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                            <img
                              src={activeBaseImageUrl}
                              alt="Reference"
                              className="w-7 h-7 rounded-md object-cover border border-violet-500/50 flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-[9px] text-zinc-400 truncate">
                                垫图基准: <span className="text-zinc-200 font-medium">{currentBaseImageLabel}</span>
                              </div>
                              <div className="text-[8px] text-zinc-500 truncate font-mono">
                                {activeBaseImageUrl.slice(0, 45)}...
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Compiled English Prompt Display & Edit */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-zinc-400 font-medium flex items-center gap-1">
                              <Terminal className="w-2.5 h-2.5 text-violet-400" />
                              发送给生图模型的英文 Prompt:
                            </span>
                            <span className="text-[9px] text-zinc-500 font-mono">
                              {fullPrompt.split(' ').length} words
                            </span>
                          </div>
                          <textarea
                            rows={3}
                            value={frame.visualPromptEn || fullPrompt}
                            onChange={(e) => onUpdateFrame(frame.id, { visualPromptEn: e.target.value })}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 font-mono text-[10px] text-zinc-300 focus:border-violet-500 focus:outline-none leading-relaxed resize-none"
                            placeholder="可直接在此微调英文生图词..."
                          />
                        </div>

                        {/* Negative Prompt Preview */}
                        <div>
                          <span className="text-zinc-500 block mb-0.5">系统负向提示词 (Negative Prompt):</span>
                          <div className="text-[9px] text-zinc-500 font-mono bg-zinc-900/40 p-1.5 rounded border border-zinc-800/40 line-clamp-2 select-all">
                            {negativePrompt}
                          </div>
                        </div>

                        {/* Observability & Diagnostic Info */}
                        {frame.logId && (
                          <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800/60 text-[9px]">
                            <span className="font-mono text-zinc-400">
                              排障诊断编号: <span className="text-violet-300 font-semibold">{frame.logId}</span>
                            </span>
                            {frame.status === 'completed' && (
                              <span className="text-emerald-400 font-medium">✓ 专属会话匹配成功</span>
                            )}
                            {frame.status === 'error' && (
                              <span className="text-rose-400 font-medium">✗ 生成异常</span>
                            )}
                          </div>
                        )}

                        {frame.lastError && (
                          <div className="p-1.5 rounded bg-rose-950/40 border border-rose-800/50 text-[9px] text-rose-300">
                            <span className="font-semibold text-rose-200 block mb-0.5">排障诊断反馈:</span>
                            {frame.lastError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

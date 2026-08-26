'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n/context';
import { StoryScript, StoryboardFrame, IPProfile } from '@/types';
import { Wand2, RefreshCw, Trash2, Plus, Star, Image as ImageIcon } from 'lucide-react';

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
  onSelectFrame
}: StoryboardCanvasProps) {
  const { t } = useI18n();

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
          <button
            onClick={onAddFrame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            {t.workbench.addScene}
          </button>

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

      {/* Storyboard Grid Canvas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {story.frames.map((frame, index) => {
            const isSelected = selectedFrameId === frame.id;
            return (
              <div
                key={frame.id}
                onClick={() => onSelectFrame(frame.id)}
                className={`group relative rounded-2xl bg-zinc-900/90 border transition-all duration-200 overflow-hidden flex flex-col cursor-pointer ${
                  isSelected
                    ? 'border-violet-500 ring-2 ring-violet-500/20 shadow-xl'
                    : 'border-zinc-800/80 hover:border-zinc-700/90 shadow-md'
                }`}
              >
                {/* Frame Header */}
                <div className="p-2.5 px-3 bg-zinc-950/60 border-b border-zinc-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 text-[10px] font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-xs font-medium text-zinc-200 truncate max-w-[120px]">
                      {frame.title}
                    </span>
                    {frame.isCover && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-semibold">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        {t.workbench.sceneCard.coverTag}
                      </span>
                    )}
                  </div>

                  {/* Card Quick Actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    {!frame.isCover && (
                      <button
                        title={t.workbench.sceneCard.setAsCover}
                        onClick={(e) => {
                          e.stopPropagation();
                          story.frames.forEach(f => onUpdateFrame(f.id, { isCover: f.id === frame.id }));
                        }}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 text-[10px]"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      title={t.workbench.sceneCard.regenerate}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSingleRender(frame);
                      }}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-violet-400"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      title={t.workbench.sceneCard.delete}
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

                {/* 3:4 Aspect Ratio Image Box */}
                <div className="relative aspect-[3/4] w-full bg-zinc-950/90 overflow-hidden flex items-center justify-center">
                  {frame.status === 'generating' ? (
                    <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-4 text-center">
                      <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
                      <span className="text-[11px] text-violet-300 font-medium animate-pulse">
                        {t.workbench.sceneCard.generating}
                      </span>
                    </div>
                  ) : frame.imageUrl ? (
                    <img
                      src={frame.imageUrl}
                      alt={frame.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-zinc-500">
                      <ImageIcon className="w-8 h-8 opacity-40" />
                      <span className="text-[10px]">待渲染配图</span>
                    </div>
                  )}

                  {/* Frame Number Badge on Image */}
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
                      onChange={(e) => onUpdateFrame(frame.id, { visualPrompt: e.target.value })}
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

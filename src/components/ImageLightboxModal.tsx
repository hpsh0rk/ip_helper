'use client';

import React, { useEffect } from 'react';
import { X, Download, Copy, Tag, Sparkles } from 'lucide-react';
import { TagDefinition } from '@/types';
import { SYSTEM_PRESET_TAGS, getTagInfo } from '@/lib/render/taggingEngine';

interface ImageLightboxModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  title?: string;
  prompt?: string;
  tags?: string[];
  customTags?: TagDefinition[];
  onClose: () => void;
  onShowToast?: (msg: string) => void;
  onDeriveImage?: (url: string, prompt?: string) => void;
}

export function ImageLightboxModal({
  isOpen,
  imageUrl,
  title = '图片大图预览',
  prompt,
  tags = [],
  customTags = [],
  onClose,
  onShowToast,
  onDeriveImage
}: ImageLightboxModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const allAvailableTags = [...SYSTEM_PRESET_TAGS, ...customTags];

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `ip_asset_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast?.('已开始下载高清原图');
  };

  const handleCopyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    onShowToast?.('已复制 Prompt 到剪切板');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in select-none"
      onClick={onClose}
    >
      <div 
        className="relative max-w-5xl w-full max-h-[92vh] flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="w-full flex items-center justify-between py-2.5 px-4 mb-2 bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-700/60 shadow-xl">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="p-1.5 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30 flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold text-zinc-100 truncate">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onDeriveImage && (
              <button
                type="button"
                onClick={() => {
                  onDeriveImage(imageUrl, prompt);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-violet-600/30 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>🧬 基于此图衍生生图</span>
              </button>
            )}

            {prompt && (
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all cursor-pointer border border-zinc-700"
              >
                <Copy className="w-3 h-3" />
                <span>复制 Prompt</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all border border-zinc-700 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>下载原图</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer border border-zinc-700 ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Main Image */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 shadow-2xl bg-zinc-950 flex items-center justify-center max-h-[72vh]">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[72vh] max-w-full w-auto h-auto object-contain rounded-2xl"
          />
        </div>

        {/* Bottom Details Bar (Tags & Prompt) */}
        {(tags.length > 0 || prompt) && (
          <div className="w-full mt-2.5 p-3 px-4 rounded-2xl bg-zinc-900/90 backdrop-blur-md border border-zinc-800 space-y-2 text-xs">
            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 mr-1">
                  <Tag className="w-3 h-3 text-violet-400" />
                  <span>归属标签:</span>
                </span>
                {tags.map(tid => {
                  const info = getTagInfo(tid, allAvailableTags);
                  return (
                    <span
                      key={tid}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        info.color || 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}
                    >
                      🏷️ {info.label}
                    </span>
                  );
                })}
              </div>
            )}

            {prompt && (
              <div className="text-[11px] text-zinc-400 font-mono line-clamp-2 leading-relaxed bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/80">
                <span className="text-zinc-500 mr-1.5 font-bold">Prompt:</span>
                {prompt}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

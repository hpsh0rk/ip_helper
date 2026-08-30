'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { StoryScript, IPProfile } from '@/types';
import JSZip from 'jszip';
import { 
  Copy, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  Bookmark, 
  MessageCircle, 
  Share2, 
  Sparkles, 
  Type, 
  Check,
  Image as ImageIcon
} from 'lucide-react';

interface XhsPreviewPaneProps {
  story?: StoryScript;
  currentIP?: IPProfile;
  onUpdateStory: (updates: Partial<StoryScript>) => void;
  onShowToast: (msg: string) => void;
}

export function XhsPreviewPane({
  story,
  currentIP,
  onUpdateStory,
  onShowToast
}: XhsPreviewPaneProps) {
  const { t } = useI18n();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isZipping, setIsZipping] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  if (!story || !story.frames || story.frames.length === 0) {
    return (
      <div className="w-80 lg:w-96 flex flex-col items-center justify-center p-6 text-center bg-zinc-950/60 border-l border-zinc-800/80 text-zinc-500 text-xs">
        <p>暂无小红书发布内容</p>
      </div>
    );
  }

  const currentFrame = story.frames[currentSlideIndex] || story.frames[0];
  const isCoverSlide = currentSlideIndex === 0 || currentFrame.isCover;

  const handleCopyContent = async () => {
    const textToCopy = `${story.xhsSelectedTitle}\n\n${story.xhsContent}\n\n${story.xhsTags.join(' ')}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      onShowToast(t.xhs.copySuccess);
    } catch {
      onShowToast('复制失败，请手动选择复制');
    }
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      onShowToast(t.xhs.downloading);
      const zip = new JSZip();

      // Add Markdown post file
      const postMd = `# ${story.xhsSelectedTitle}\n\n${story.xhsContent}\n\n${story.xhsTags.join(' ')}`;
      zip.file('post_content.md', postMd);

      // Add images: embed real bytes when the frame holds a data: URL,
      // otherwise fall back to a text reference for remote URLs.
      const imgFolder = zip.folder('images');
      if (imgFolder) {
        story.frames.forEach((f, idx) => {
          const baseName = `0${idx + 1}_frame_${f.frameNumber}`;
          const dataUrlMatch = f.imageUrl?.match(/^data:image\/(\w+);base64,(.+)$/);
          if (dataUrlMatch) {
            const ext = dataUrlMatch[1] === 'jpeg' ? 'jpg' : dataUrlMatch[1];
            imgFolder.file(`${baseName}.${ext}`, dataUrlMatch[2], { base64: true });
          } else {
            imgFolder.file(`${baseName}.txt`, `Image URL: ${f.imageUrl}\nPrompt: ${f.visualPrompt}\nEnglish Prompt: ${f.visualPromptEn}`);
          }
        });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${story.title.replace(/\s+/g, '_')}_xhs_pack.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onShowToast(t.xhs.downloadSuccess);
    } catch {
      onShowToast('打包下载异常');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="w-80 lg:w-[380px] flex flex-col h-full bg-zinc-950/60 border-l border-zinc-800/80 overflow-y-auto">
      {/* Pane Header */}
      <div className="p-3.5 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold text-zinc-100">{t.xhs.title}</h2>
          <p className="text-[10px] text-zinc-400">{t.xhs.subtitle}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Real-time 3:4 Mobile Phone Simulator */}
        <div className="relative mx-auto w-full max-w-[320px] rounded-[32px] bg-zinc-900 p-2.5 shadow-2xl border-4 border-zinc-800 ring-1 ring-zinc-700/50 overflow-hidden text-zinc-100">
          {/* Phone Speaker & Notch */}
          <div className="mx-auto w-24 h-4 bg-zinc-950 rounded-full mb-1.5 flex items-center justify-center">
            <div className="w-8 h-1 bg-zinc-800 rounded-full" />
          </div>

          {/* Social Media Screen Container */}
          <div className="rounded-[22px] bg-zinc-950 overflow-hidden flex flex-col">
            {/* Xiaohongshu Header Bar */}
            <div className="px-3 py-2 flex items-center justify-between text-[11px] text-zinc-300 border-b border-zinc-900 bg-zinc-950/90">
              <span className="font-bold tracking-tight text-coral-500 text-xs">小红书</span>
              <span className="text-[10px] text-zinc-400 font-medium">
                {currentSlideIndex + 1} / {story.frames.length}
              </span>
            </div>

            <div className="relative aspect-[3/4] w-full bg-zinc-900 overflow-hidden group flex items-center justify-center">
              {currentFrame.imageUrl && !imageErrors[currentFrame.id] ? (
                <img
                  src={currentFrame.imageUrl}
                  alt={currentFrame.title}
                  onError={() => setImageErrors(prev => ({ ...prev, [currentFrame.id]: true }))}
                  className="w-full h-full object-cover select-none"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-2.5 p-6 text-center bg-gradient-to-b from-zinc-800/90 via-zinc-900 to-zinc-950">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400">
                    <ImageIcon className="w-6 h-6 opacity-60" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-300">
                    {isCoverSlide ? '待生成封面配图' : `P${currentSlideIndex + 1} 待生成分镜配图`}
                  </span>
                  <span className="text-[10px] text-zinc-500 max-w-[200px]">
                    点击中间栏顶部【批量渲染全部配图】即可一键出图
                  </span>
                </div>
              )}

              {/* Cover Typography Overlay (Rendered on Cover Slide) */}
              {isCoverSlide && (
                <div
                  className={`absolute inset-x-0 p-3 pointer-events-none flex flex-col ${
                    story.coverOverlay.position === 'top'
                      ? 'top-2'
                      : story.coverOverlay.position === 'center'
                      ? 'top-1/2 -translate-y-1/2'
                      : 'bottom-4'
                  }`}
                >
                  {story.coverOverlay.badgeText && (
                    <div className="inline-flex self-start px-2 py-0.5 rounded-full bg-coral-500 text-white text-[10px] font-bold shadow-lg mb-1">
                      {story.coverOverlay.badgeText}
                    </div>
                  )}
                  <h1
                    style={{
                      fontSize: `${story.coverOverlay.fontSize || 24}px`,
                      color: story.coverOverlay.textColor || '#FFFFFF',
                      textShadow: '0 2px 8px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)'
                    }}
                    className="font-black leading-tight tracking-tight drop-shadow-md"
                  >
                    {story.coverOverlay.mainTitle || story.xhsSelectedTitle}
                  </h1>
                  {story.coverOverlay.subtitle && (
                    <p className="text-xs font-semibold text-zinc-200 mt-1 drop-shadow-md bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded self-start">
                      {story.coverOverlay.subtitle}
                    </p>
                  )}
                </div>
              )}

              {/* Carousel Arrows */}
              {currentSlideIndex > 0 && (
                <button
                  onClick={() => setCurrentSlideIndex(currentSlideIndex - 1)}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              {currentSlideIndex < story.frames.length - 1 && (
                <button
                  onClick={() => setCurrentSlideIndex(currentSlideIndex + 1)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Carousel Pagination Dots */}
              <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1">
                {story.frames.map((_, i) => (
                  <span
                    key={i}
                    onClick={() => setCurrentSlideIndex(i)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      i === currentSlideIndex ? 'w-4 bg-coral-500' : 'w-1.5 bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Post Author Bar */}
            <div className="p-3 bg-zinc-950 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={currentIP?.avatarUrl || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&auto=format&fit=crop&q=80'}
                    alt="avatar"
                    className="w-6 h-6 rounded-full object-cover border border-coral-500/40"
                  />
                  <div>
                    <p className="text-xs font-bold text-zinc-100">{currentIP?.name || '原创小猫'}</p>
                    <p className="text-[9px] text-zinc-400">已关注</p>
                  </div>
                </div>
                <button className="px-2.5 py-1 rounded-full bg-coral-500/15 border border-coral-500/30 text-coral-400 text-[10px] font-bold">
                  关注
                </button>
              </div>

              {/* Post Title */}
              <h3 className="text-xs font-bold text-zinc-100 leading-snug">
                {story.xhsSelectedTitle}
              </h3>

              {/* Post Body Snippet */}
              <p className="text-[11px] text-zinc-300 leading-relaxed line-clamp-3 whitespace-pre-line">
                {story.xhsContent}
              </p>

              {/* Hashtag list */}
              <div className="flex flex-wrap gap-1 pt-1">
                {story.xhsTags.map((tag, idx) => (
                  <span key={idx} className="text-[10px] text-violet-400 font-medium">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Interaction Mock Icons */}
              <div className="pt-2 flex items-center justify-between text-zinc-400 text-[11px] border-t border-zinc-900">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 hover:text-coral-400 cursor-pointer">
                    <Heart className="w-3.5 h-3.5" /> 8.6k
                  </span>
                  <span className="flex items-center gap-1 hover:text-amber-400 cursor-pointer">
                    <Bookmark className="w-3.5 h-3.5" /> 3.2k
                  </span>
                  <span className="flex items-center gap-1 hover:text-blue-400 cursor-pointer">
                    <MessageCircle className="w-3.5 h-3.5" /> 520
                  </span>
                </div>
                <Share2 className="w-3.5 h-3.5 hover:text-zinc-200 cursor-pointer" />
              </div>
            </div>
          </div>
        </div>

        {/* Cover Overlay Typography Editor */}
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-violet-400" />
              {t.xhs.coverOverlayTitle}
            </span>
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">主标题大字</label>
            <input
              type="text"
              value={story.coverOverlay.mainTitle}
              onChange={(e) =>
                onUpdateStory({
                  coverOverlay: { ...story.coverOverlay, mainTitle: e.target.value }
                })
              }
              placeholder={t.xhs.mainTitlePlaceholder}
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">副标题</label>
              <input
                type="text"
                value={story.coverOverlay.subtitle}
                onChange={(e) =>
                  onUpdateStory({
                    coverOverlay: { ...story.coverOverlay, subtitle: e.target.value }
                  })
                }
                placeholder="小字副标题"
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">角标</label>
              <input
                type="text"
                value={story.coverOverlay.badgeText}
                onChange={(e) =>
                  onUpdateStory({
                    coverOverlay: { ...story.coverOverlay, badgeText: e.target.value }
                  })
                }
                placeholder="角标"
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-400">位置:</span>
              {(['top', 'center', 'bottom'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() =>
                    onUpdateStory({
                      coverOverlay: { ...story.coverOverlay, position: pos }
                    })
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    story.coverOverlay.position === pos
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {pos === 'top' ? '顶部' : pos === 'center' ? '居中' : '底部'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-400">字号:</span>
              <input
                type="number"
                min={18}
                max={36}
                value={story.coverOverlay.fontSize}
                onChange={(e) =>
                  onUpdateStory({
                    coverOverlay: { ...story.coverOverlay, fontSize: Number(e.target.value) }
                  })
                }
                className="w-12 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-0.5 text-center text-xs text-zinc-200"
              />
            </div>
          </div>
        </div>

        {/* AI Title Variations Selector */}
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2 text-xs">
          <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {t.xhs.titleOptions}
          </span>
          <div className="space-y-1.5">
            {story.xhsTitleOptions.map((titleOpt, idx) => {
              const isSelected = story.xhsSelectedTitle === titleOpt;
              return (
                <div
                  key={idx}
                  onClick={() => onUpdateStory({ xhsSelectedTitle: titleOpt })}
                  className={`p-2 rounded-lg cursor-pointer text-xs transition-colors flex items-center justify-between ${
                    isSelected
                      ? 'bg-violet-600/20 border border-violet-500/40 text-violet-300 font-medium'
                      : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                  }`}
                >
                  <span className="truncate pr-2">{titleOpt}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Export Buttons */}
        <div className="space-y-2 pt-1 pb-4">
          <button
            onClick={handleCopyContent}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.99] border border-zinc-700 text-zinc-100 text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <Copy className="w-4 h-4 text-violet-400" />
            {t.xhs.copyButton}
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-coral-500 to-rose-500 hover:from-coral-600 hover:to-rose-600 active:scale-[0.99] text-white text-xs font-bold shadow-lg shadow-coral-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {t.xhs.downloadZip}
          </button>
        </div>
      </div>
    </div>
  );
}

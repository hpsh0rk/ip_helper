'use client';

import React, { useState } from 'react';
import { TagDefinition, CharacterAsset } from '@/types';
import { SYSTEM_PRESET_TAGS, searchTags, getTagInfo, aiInferTags } from '@/lib/render/taggingEngine';
import { X, Plus, Search, Tag, Check, Sparkles, Save } from 'lucide-react';

interface AssetTagEditModalProps {
  isOpen: boolean;
  asset: CharacterAsset | null;
  customTags: TagDefinition[];
  onClose: () => void;
  onSaveTags: (assetId: string, newTags: string[], customTagsCreated?: TagDefinition[]) => void;
  onAddCustomTag?: (tag: TagDefinition) => void;
}

export function AssetTagEditModal({
  isOpen,
  asset,
  customTags,
  onClose,
  onSaveTags
}: AssetTagEditModalProps) {
  if (!isOpen || !asset) return null;

  const initialTags = asset.tags || (asset.tag ? [asset.tag] : ['front']);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTags);
  const [searchQuery, setSearchQuery] = useState('');
  const [allCustomTags, setAllCustomTags] = useState<TagDefinition[]>(customTags);

  const combinedTags = [...SYSTEM_PRESET_TAGS, ...allCustomTags];
  const filteredTags = searchTags(searchQuery, combinedTags);

  const exactMatchExists = combinedTags.some(
    t => t.label.toLowerCase() === searchQuery.trim().toLowerCase() ||
         t.id.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(prev => prev.filter(id => id !== tagId));
    } else {
      setSelectedTagIds(prev => [...prev, tagId]);
    }
  };

  const handleCreateCustomTag = () => {
    const cleanLabel = searchQuery.trim();
    if (!cleanLabel) return;

    const newTagId = `custom-${Date.now()}`;
    const newTag: TagDefinition = {
      id: newTagId,
      label: cleanLabel,
      category: 'custom',
      color: 'bg-violet-500/20 text-violet-300 border-violet-500/30'
    };

    setAllCustomTags(prev => [...prev, newTag]);
    setSelectedTagIds(prev => [...prev, newTagId]);
    setSearchQuery('');
  };

  // Run AI Re-inference
  const handleAIReinfer = () => {
    const aiTags = aiInferTags(asset.prompt, undefined, allCustomTags);
    setSelectedTagIds(aiTags);
  };

  const handleSave = () => {
    onSaveTags(asset.id, selectedTagIds, allCustomTags);
    onClose();
  };

  const categories = [
    { key: 'angle', label: '📐 视角方向' },
    { key: 'type', label: '🎨 资产类型' },
    { key: 'style', label: '✨ 艺术画风' },
    { key: 'emotion', label: '🎭 情绪与状态' },
    { key: 'custom', label: '🏷️ 自定义标签' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 px-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
              <Tag className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <span>编辑资产多标签 (Multi-Tagging)</span>
                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                  已选 {selectedTagIds.length} 个
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                支持为图片打上多个标签，支持防重搜索与自定义标签
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Asset Preview Mini Banner */}
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            {asset.url ? (
              <img
                src={asset.url}
                alt="asset preview"
                className="w-14 h-16 object-cover rounded-lg border border-zinc-700 flex-shrink-0"
              />
            ) : null}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-300">Prompt 提示词依据</span>
                <button
                  type="button"
                  onClick={handleAIReinfer}
                  className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 font-bold cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>✨ 重新触发 AI 智能打标</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono line-clamp-2 mt-0.5">
                {asset.prompt || '用户手动上传图片'}
              </p>
            </div>
          </div>

          {/* Currently Selected Tags Bar */}
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              已选标签 (点击 ✕ 移除)
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-zinc-950/80 border border-zinc-800 min-h-[42px] items-center">
              {selectedTagIds.length > 0 ? (
                selectedTagIds.map(tagId => {
                  const info = getTagInfo(tagId, combinedTags);
                  return (
                    <span
                      key={tagId}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${info.color || 'bg-violet-500/20 text-violet-300 border-violet-500/30'}`}
                    >
                      <span>🏷️ {info.label}</span>
                      <button
                        type="button"
                        onClick={() => toggleTag(tagId)}
                        className="hover:text-red-400 cursor-pointer ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })
              ) : (
                <span className="text-xs text-zinc-500 pl-1">未选择任何标签（请在下方点击选择）</span>
              )}
            </div>
          </div>

          {/* Tag Search & Custom Tag Creation Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 block">
              搜索已有标签 / 创建新标签 (防重检索)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索标签（如：正视、表情、黏土、私服）..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-9 pr-24 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
              />

              {searchQuery.trim() && !exactMatchExists && (
                <button
                  type="button"
                  onClick={handleCreateCustomTag}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold shadow cursor-pointer transition-all"
                >
                  <Plus className="w-3 h-3" />
                  <span>新建 "{searchQuery.trim()}"</span>
                </button>
              )}
            </div>
          </div>

          {/* Tag Pool by Category */}
          <div className="space-y-3 pt-1">
            {categories.map(cat => {
              const tagsInCat = filteredTags.filter(t => (t.category || 'custom') === cat.key);
              if (tagsInCat.length === 0) return null;

              return (
                <div key={cat.key} className="space-y-1.5">
                  <span className="text-[11px] font-bold text-zinc-400 block">{cat.label}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {tagsInCat.map(t => {
                      const isSelected = selectedTagIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTag(t.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-violet-600 border-violet-400 text-white shadow font-bold ring-1 ring-violet-400/40'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-5 border-t border-zinc-800 flex items-center justify-end gap-2.5 bg-zinc-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>保存标签修改</span>
          </button>
        </div>
      </div>
    </div>
  );
}

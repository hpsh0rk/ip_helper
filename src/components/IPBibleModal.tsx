'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { IPProfile, StylePreset } from '@/types';
import { X, Sparkles, Sliders, Palette, Image as ImageIcon, Save, ArrowRight } from 'lucide-react';

interface IPBibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  ips: IPProfile[];
  currentIP?: IPProfile;
  onSaveIP: (ip: IPProfile) => void;
  onSelectAndStartStory: (ip: IPProfile) => void;
}

const stylePresets: StylePreset[] = [
  '3D Clay',
  'Anime',
  'Cyberpunk',
  'Ghibli Watercolor',
  'Retro Comic',
  'Chibi 2D'
];

export function IPBibleModal({
  isOpen,
  onClose,
  ips,
  currentIP,
  onSaveIP,
  onSelectAndStartStory
}: IPBibleModalProps) {
  const { t } = useI18n();
  const [selectedIP, setSelectedIP] = useState<IPProfile | null>(currentIP || (ips.length > 0 ? ips[0] : null));

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

  if (!isOpen) return null;

  const handleUpdate = <K extends keyof IPProfile>(field: K, value: IPProfile[K]) => {
    if (!selectedIP) return;
    const updated = { ...selectedIP, [field]: value };
    setSelectedIP(updated);
  };

  const handleVisualAnchorUpdate = (field: keyof IPProfile['visualAnchors'], value: string | string[]) => {
    if (!selectedIP) return;
    const updated = {
      ...selectedIP,
      visualAnchors: {
        ...selectedIP.visualAnchors,
        [field]: value
      }
    };
    setSelectedIP(updated);
  };

  const handleSave = () => {
    if (selectedIP) {
      onSaveIP(selectedIP);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              {t.bible.title}
            </h2>
            <p className="text-xs text-zinc-400">{t.bible.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - 2 Columns */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          {/* Left Column: IP List Selector & Profile */}
          <div className="w-full md:w-80 border-r border-zinc-800 p-4 space-y-4 bg-zinc-950/40">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              角色列表
            </span>

            {ips.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">暂无角色档案</p>
            ) : (
              <div className="space-y-1.5">
                {ips.map((ip) => (
                  <div
                    key={ip.id}
                    onClick={() => setSelectedIP(ip)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                      selectedIP?.id === ip.id
                        ? 'bg-violet-600/20 border border-violet-500/50 text-white shadow-md'
                        : 'hover:bg-zinc-800/80 text-zinc-300 border border-transparent'
                    }`}
                  >
                    {ip.avatarUrl ? (
                      <img
                        src={ip.avatarUrl}
                        alt={ip.name}
                        className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-violet-800/40 border border-zinc-700 flex items-center justify-center font-bold text-violet-300 flex-shrink-0 text-xs">
                        {ip.name ? ip.name.slice(0, 1) : 'IP'}
                      </div>
                    )}
                    <div className="truncate">
                      <p className="font-bold text-xs truncate">{ip.name}</p>
                      <p className="text-[11px] text-zinc-400 truncate">{ip.archetype}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedIP && (
              <div className="pt-4 border-t border-zinc-800 space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    {t.bible.name}
                  </label>
                  <input
                    type="text"
                    value={selectedIP.name}
                    onChange={(e) => handleUpdate('name', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    {t.bible.archetype}
                  </label>
                  <input
                    type="text"
                    value={selectedIP.archetype}
                    onChange={(e) => handleUpdate('archetype', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    {t.bible.tagline}
                  </label>
                  <textarea
                    value={selectedIP.personality.tagline}
                    onChange={(e) =>
                      handleUpdate('personality', {
                        ...selectedIP.personality,
                        tagline: e.target.value
                      })
                    }
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-100 text-xs focus:border-violet-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Visual Anchors, Turnarounds, Style Presets */}
          {selectedIP ? (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              {/* Visual Anchors */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-violet-400" />
                  {t.bible.visualAnchors}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">{t.bible.hair}</label>
                    <input
                      type="text"
                      value={selectedIP.visualAnchors.hair}
                      onChange={(e) => handleVisualAnchorUpdate('hair', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">{t.bible.clothing}</label>
                    <input
                      type="text"
                      value={selectedIP.visualAnchors.clothing}
                      onChange={(e) => handleVisualAnchorUpdate('clothing', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">{t.bible.accessories}</label>
                    <input
                      type="text"
                      value={selectedIP.visualAnchors.accessories}
                      onChange={(e) => handleVisualAnchorUpdate('accessories', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">外貌辨识特征</label>
                    <input
                      type="text"
                      value={selectedIP.visualAnchors.distinctiveFeatures}
                      onChange={(e) => handleVisualAnchorUpdate('distinctiveFeatures', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Style Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider block">
                  {t.bible.stylePreset}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {stylePresets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleUpdate('stylePreset', preset)}
                      className={`p-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        selectedIP.stylePreset === preset
                          ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-600/30 font-bold'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3-View Turnarounds & Expressions */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-violet-400" />
                  {t.bible.turnarounds} & 表情库
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-2 text-center space-y-1.5">
                    {selectedIP.avatarUrl ? (
                      <img
                        src={selectedIP.avatarUrl}
                        alt="front"
                        className="aspect-[3/4] w-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="aspect-[3/4] w-full bg-zinc-900 rounded-lg flex items-center justify-center text-zinc-500 text-xs">
                        暂无头像
                      </div>
                    )}
                    <span className="text-[10px] text-zinc-400 font-medium">{t.bible.front} (正视)</span>
                  </div>
                  <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-2 text-center space-y-1.5">
                    {selectedIP.turnaroundSheets?.side ? (
                      <img
                        src={selectedIP.turnaroundSheets.side}
                        alt="side"
                        className="aspect-[3/4] w-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="aspect-[3/4] w-full bg-zinc-900 rounded-lg flex items-center justify-center text-zinc-500 text-xs">
                        暂无侧视
                      </div>
                    )}
                    <span className="text-[10px] text-zinc-400 font-medium">{t.bible.side} (侧视)</span>
                  </div>
                  <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-2 text-center space-y-1.5">
                    {selectedIP.turnaroundSheets?.back ? (
                      <img
                        src={selectedIP.turnaroundSheets.back}
                        alt="back"
                        className="aspect-[3/4] w-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="aspect-[3/4] w-full bg-zinc-900 rounded-lg flex items-center justify-center text-zinc-500 text-xs">
                        暂无后视
                      </div>
                    )}
                    <span className="text-[10px] text-zinc-400 font-medium">{t.bible.back} (后视)</span>
                  </div>
                </div>
              </div>

              {/* Consistency & LoRA Weights */}
              <div className="space-y-3 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-violet-400" />
                  {t.bible.consistencySettings}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                      <span>{t.bible.facialWeight}</span>
                      <span className="text-violet-400 font-bold">{selectedIP.loraWeights.face}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedIP.loraWeights.face}
                      onChange={(e) =>
                        handleUpdate('loraWeights', {
                          ...selectedIP.loraWeights,
                          face: parseFloat(e.target.value)
                        })
                      }
                      className="w-full accent-violet-600"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                      <span>{t.bible.clothingWeight}</span>
                      <span className="text-violet-400 font-bold">{selectedIP.loraWeights.costume}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedIP.loraWeights.costume}
                      onChange={(e) =>
                        handleUpdate('loraWeights', {
                          ...selectedIP.loraWeights,
                          costume: parseFloat(e.target.value)
                        })
                      }
                      className="w-full accent-violet-600"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                      <span>{t.bible.styleWeight}</span>
                      <span className="text-violet-400 font-bold">{selectedIP.loraWeights.style}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedIP.loraWeights.style}
                      onChange={(e) =>
                        handleUpdate('loraWeights', {
                          ...selectedIP.loraWeights,
                          style: parseFloat(e.target.value)
                        })
                      }
                      className="w-full accent-violet-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 text-xs">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-2">
                <Sparkles className="w-5 h-5" />
              </div>
              <p>暂无选中的 IP 角色设定</p>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 px-6 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
          >
            {t.common.cancel}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (selectedIP) {
                  onSelectAndStartStory(selectedIP);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-bold transition-all"
            >
              {t.bible.startStoryWithThis}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              {t.bible.saveChanges}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

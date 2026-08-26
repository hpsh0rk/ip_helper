'use client';

import React, { useState } from 'react';
import { ImageModelProviderId, ImageEngineConfig } from '@/types';
import { IMAGE_MODEL_PROVIDERS } from '@/lib/render/modelProviders';
import { 
  Sparkles, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Settings2, 
  ExternalLink,
  ShieldCheck,
  Zap,
  Sliders,
  Image as ImageIcon
} from 'lucide-react';

interface ImageModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ImageEngineConfig;
  onSaveConfig: (newConfig: ImageEngineConfig) => void;
  onShowToast: (msg: string) => void;
}

export function ImageModelSettingsModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onShowToast
}: ImageModelSettingsModalProps) {
  const [activeProviderId, setActiveProviderId] = useState<ImageModelProviderId>(config.activeProviderId);
  const [generationMode, setGenerationMode] = useState<'text-to-image' | 'image-to-image'>(config.generationMode);
  const [customApiKeys, setCustomApiKeys] = useState<Partial<Record<ImageModelProviderId, string>>>(
    config.customApiKeys || {}
  );
  const [customEndpoints, setCustomEndpoints] = useState<Partial<Record<ImageModelProviderId, string>>>(
    config.customEndpoints || {}
  );

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig({
      activeProviderId,
      generationMode,
      customApiKeys,
      customEndpoints
    });
    const provider = IMAGE_MODEL_PROVIDERS.find(p => p.id === activeProviderId);
    onShowToast(`✅ 已切换生图引擎为：${provider?.name || activeProviderId}`);
    onClose();
  };

  const selectedProvider = IMAGE_MODEL_PROVIDERS.find(p => p.id === activeProviderId) || IMAGE_MODEL_PROVIDERS[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 px-6 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
              <Cpu className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <span>🎨 生图模型中枢与能力矩阵 (Image Engine Hub)</span>
                <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-bold">
                  一期：Antigravity CLI 原生支持
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                支持切换不同的生图大模型，清晰区分「文生图」与「图生图」能力
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Concept Notice Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/40 to-purple-950/40 border border-violet-500/30 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-violet-300">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span>文生图 (Text-to-Image)</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                依据自然语言人设与画风 Prompt 从零生成视觉资产。适用场景：<strong>角色标准三视图定妆、首张视觉概念探索</strong>。
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-pink-300">
                <Layers className="w-4 h-4 text-pink-400" />
                <span>图生图 / 垫图 (Image-to-Image)</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                传入角色三视图作为参考垫图（Reference），锁定五官与衣服，仅改变场景动作。适用场景：<strong>故事创意工坊 6 格分镜角色连贯性</strong>。
              </p>
            </div>
          </div>

          {/* Model Selector Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-violet-400" />
                选择激活的生图模型引擎
              </h3>
              <span className="text-[11px] text-zinc-400">
                🟢 绿色为已就绪可用 · 🔒 灰色变淡为需填 API Key 激活
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {IMAGE_MODEL_PROVIDERS.map((provider) => {
                const isSelected = activeProviderId === provider.id;
                const isReady =
                  provider.id === 'antigravity-cli' ||
                  Boolean(customApiKeys[provider.id]?.trim()) ||
                  (provider.id === 'comfyui-local' && Boolean(customEndpoints[provider.id]?.trim()));

                return (
                  <div
                    key={provider.id}
                    onClick={() => setActiveProviderId(provider.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                      isSelected
                        ? 'bg-violet-950/40 border-violet-500 shadow-xl shadow-violet-950/40 ring-1 ring-violet-500/50'
                        : isReady
                          ? 'bg-zinc-900/80 border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-900'
                          : 'bg-zinc-950/30 border-dashed border-zinc-800/80 opacity-55 hover:opacity-85 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-xs font-bold ${isReady ? 'text-zinc-100' : 'text-zinc-400'}`}>
                            {provider.name}
                          </h4>
                          {isSelected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                          )}
                        </div>

                        {/* Status Tag: Available vs Requires Key */}
                        {isReady ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{provider.id === 'antigravity-cli' ? '内置已就绪' : '已配置 Key'}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/90 text-zinc-400 font-medium border border-zinc-700/60 flex items-center gap-1 flex-shrink-0">
                            <span>🔒 待填 Key</span>
                          </span>
                        )}
                      </div>

                      <p className={`text-[11px] leading-relaxed mb-3 ${isReady ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {provider.description}
                      </p>
                    </div>

                    {/* Capability Badges */}
                    <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
                      <div className="flex items-center gap-1">
                        <span className={`px-1.5 py-0.2 rounded font-medium ${
                          provider.capabilities.textToImage
                            ? isReady ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-zinc-800/60 text-zinc-500'
                            : 'bg-zinc-800 text-zinc-600'
                        }`}>
                          文生图
                        </span>

                        <span className={`px-1.5 py-0.2 rounded font-medium ${
                          provider.capabilities.imageToImage
                            ? isReady ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-zinc-800/60 text-zinc-500'
                            : 'bg-zinc-800 text-zinc-600'
                        }`}>
                          图生图
                        </span>

                        <span className={`px-1.5 py-0.2 rounded font-medium ${
                          provider.capabilities.ipAdapterLock
                            ? isReady ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-zinc-800/60 text-zinc-500'
                            : 'bg-zinc-800 text-zinc-600'
                        }`}>
                          角色锁
                        </span>
                      </div>

                      {!isReady && (
                        <span className="text-[10px] text-amber-400/80 font-medium">
                          需在下方填 Key 激活 ➔
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Provider Details & Configuration */}
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-violet-400" />
                <span>当前模型配置：{selectedProvider.name}</span>
              </h3>
              <span className="text-[11px] text-zinc-400">
                默认模型节点: <code className="text-violet-300 font-mono">{selectedProvider.defaultModel}</code>
              </span>
            </div>

            {/* Mode Picker for Story Studio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1.5">
                  默认生成模式 (Generation Mode)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGenerationMode('text-to-image')}
                    className={`p-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      generationMode === 'text-to-image'
                        ? 'bg-violet-600 border-violet-400 text-white font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    📝 纯文生图 (Prompt)
                  </button>

                  <button
                    type="button"
                    disabled={!selectedProvider.capabilities.imageToImage}
                    onClick={() => setGenerationMode('image-to-image')}
                    className={`p-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      generationMode === 'image-to-image'
                        ? 'bg-violet-600 border-violet-400 text-white font-bold'
                        : selectedProvider.capabilities.imageToImage
                          ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          : 'bg-zinc-900/40 border-zinc-800/40 text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    🖼️ 图生图 (垫角色定妆照)
                  </button>
                </div>
                {!selectedProvider.capabilities.imageToImage && (
                  <span className="text-[10px] text-amber-400/90 mt-1 block">
                    * 当前选择的模型不支持图生图垫图，将自动采用高保真文生图锁词模式
                  </span>
                )}
              </div>

              {/* API Key / Custom Endpoint if configurable */}
              <div>
                {selectedProvider.id === 'antigravity-cli' ? (
                  <div className="h-full flex flex-col justify-center p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>内置官方原生授权 · 免费免配置</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      已由 Antigravity CLI 本地运行环境直接驱动 Google Imagen 3 引擎，无需输入任何 Key。
                    </p>
                  </div>
                ) : selectedProvider.id === 'comfyui-local' ? (
                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 block mb-1.5 flex items-center justify-between">
                      <span>本地 WebUI / ComfyUI 服务地址</span>
                      <span className="text-[10px] text-amber-400 font-normal">需先在本地终端启动服务</span>
                    </label>
                    <input
                      type="text"
                      value={customEndpoints[selectedProvider.id] || ''}
                      onChange={(e) =>
                        setCustomEndpoints({
                          ...customEndpoints,
                          [selectedProvider.id]: e.target.value
                        })
                      }
                      placeholder="http://127.0.0.1:8188/prompt"
                      className="w-full bg-zinc-900 border border-zinc-700 focus:border-violet-500 rounded-xl p-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 block mb-1.5 flex items-center justify-between">
                      <span>{selectedProvider.name} API Key</span>
                      <span className="text-[10px] text-amber-400 font-normal">填入后立即激活可用</span>
                    </label>
                    <input
                      type="password"
                      value={customApiKeys[selectedProvider.id] || ''}
                      onChange={(e) =>
                        setCustomApiKeys({
                          ...customApiKeys,
                          [selectedProvider.id]: e.target.value
                        })
                      }
                      placeholder={`sk-... 填入你的 ${selectedProvider.name.split(' ')[0]} 密钥`}
                      className="w-full bg-zinc-900 border border-zinc-700 focus:border-violet-500 rounded-xl p-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>一期已由 Antigravity CLI 原生调度商业级 Imagen 3 引擎</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition-all cursor-pointer"
            >
              保存并应用模型
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n/context';
import { IPProfile, Skill } from '@/types';
import { BookOpen, Layers, Globe, ChevronDown, Check, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeView: 'characters' | 'studio';
  onSwitchView: (view: 'characters' | 'studio') => void;
  currentIP?: IPProfile;
  allIPs: IPProfile[];
  onSelectIP: (ip: IPProfile) => void;
  onOpenSkills: () => void;
  onOpenModelSettings: () => void;
  skills: Skill[];
  activeSkillIds: string[];
  onToggleSkill: (skillId: string) => void;
  activeProviderName?: string;
}

export function Header({
  activeView,
  onSwitchView,
  currentIP,
  allIPs,
  onSelectIP,
  onOpenSkills,
  onOpenModelSettings,
  skills,
  activeSkillIds,
  onToggleSkill,
  activeProviderName = 'Antigravity CLI (Imagen 3)'
}: HeaderProps) {
  const { t, locale, toggleLocale } = useI18n();
  const [showSkillMenu, setShowSkillMenu] = React.useState(false);

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Brand Logo */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-purple-500 to-coral-500 flex items-center justify-center shadow-lg shadow-violet-500/20 text-white font-bold text-lg">
            IP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-100 text-lg tracking-tight">IP Helper</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Studio
              </span>
            </div>
          </div>
        </div>

        {/* Top-level Page Navigation Switcher */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => onSwitchView('characters')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'characters'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>🎭 IP 角色管理</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
              {allIPs.length}
            </span>
          </button>

          <button
            onClick={() => onSwitchView('studio')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'studio'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>🎬 故事创作工坊</span>
            {currentIP && (
              <span className="text-[10px] text-violet-300 bg-violet-950/60 px-1.5 py-0.5 rounded border border-violet-500/30 max-w-[100px] truncate">
                {currentIP.name}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Right: Actions & Tools */}
      <div className="flex items-center gap-3">
        {/* Image Engine Hub Switcher Button */}
        <button
          onClick={onOpenModelSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-950/40 hover:bg-violet-900/50 border border-violet-500/40 text-violet-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          title="配置生图大模型与能力矩阵"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">🎨 生图模型:</span>
          <span className="font-bold text-violet-300 truncate max-w-[130px]">{activeProviderName}</span>
        </button>

        {/* Skills Hub Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSkillMenu(!showSkillMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden md:inline">{t.nav.skills}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-violet-500/30 text-violet-300 text-[10px] font-bold">
              {activeSkillIds.length}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {showSkillMenu && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-zinc-900 border border-zinc-700/80 shadow-2xl p-2.5 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-xs font-semibold text-zinc-300">{t.skills.title}</span>
                <button
                  onClick={() => {
                    setShowSkillMenu(false);
                    onOpenSkills();
                  }}
                  className="text-[11px] text-violet-400 hover:underline cursor-pointer"
                >
                  管理
                </button>
              </div>
              <div className="space-y-1.5 py-2">
                {skills.map(skill => {
                  const isActive = activeSkillIds.includes(skill.id);
                  return (
                    <div
                      key={skill.id}
                      onClick={() => onToggleSkill(skill.id)}
                      className={`flex items-start justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        isActive
                          ? 'bg-violet-950/40 border border-violet-600/40 text-zinc-200'
                          : 'hover:bg-zinc-800/80 text-zinc-400 border border-transparent'
                      }`}
                    >
                      <div className="pr-2">
                        <p className="font-medium text-zinc-200">{skill.title}</p>
                        <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{skill.description}</p>
                      </div>
                      <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-violet-600 text-white' : 'border border-zinc-600'
                      }`}>
                        {isActive && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Language Switcher Toggle */}
        <button
          onClick={toggleLocale}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium transition-all cursor-pointer"
          title="Switch Language (ZH/EN)"
        >
          <Globe className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-semibold">{locale === 'zh' ? 'EN' : '中文'}</span>
        </button>
      </div>
    </header>
  );
}

'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Skill } from '@/types';
import { X, Layers } from 'lucide-react';

interface SkillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  skills: Skill[];
  activeSkillIds: string[];
  onToggleSkill: (skillId: string) => void;
}

export function SkillsModal({
  isOpen,
  onClose,
  skills,
  activeSkillIds,
  onToggleSkill
}: SkillsModalProps) {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-400" />
              {t.skills.title}
            </h2>
            <p className="text-xs text-zinc-400">
              {activeSkillIds.length} {t.skills.activeCount}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {skills.map((skill) => {
            const isActive = activeSkillIds.includes(skill.id);
            return (
              <div
                key={skill.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-violet-950/20 border-violet-500/50 shadow-lg shadow-violet-900/10'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-zinc-100">{skill.title}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {skill.id}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          已激活
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{skill.description}</p>

                    {/* Collapsible/Preview of prompt */}
                    <div className="mt-2 p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 text-[11px] text-zinc-400 font-mono line-clamp-3">
                      {skill.systemPrompt}
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleSkill(skill.id)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-md'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                    }`}
                  >
                    {isActive ? t.skills.disable : t.skills.enable}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md transition-all"
          >
            完成配置
          </button>
        </div>
      </div>
    </div>
  );
}

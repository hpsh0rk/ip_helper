'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { ChatMessage, IPProfile, Skill } from '@/types';
import { Send, Bot, User, Sparkles, Wand2, RefreshCw } from 'lucide-react';

interface AIChatPaneProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  isLoading: boolean;
  activeSkills: Skill[];
  currentIP?: IPProfile;
}

export function AIChatPane({
  messages,
  onSendMessage,
  isLoading,
  activeSkills,
  currentIP
}: AIChatPaneProps) {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handlePillClick = (pillText: string) => {
    // Strip leading emoji
    const cleanText = pillText.replace(/^[^\s]+\s+/, '');
    onSendMessage(cleanText);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/60 border-r border-zinc-800/80">
      {/* Pane Header */}
      <div className="p-3.5 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-zinc-100">{t.chat.title}</h2>
            <p className="text-[10px] text-zinc-400">{t.chat.subtitle}</p>
          </div>
        </div>

        {/* Active Skill Indicator */}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-[10px] text-violet-300">
            <Sparkles className="w-2.5 h-2.5 text-violet-400 animate-pulse" />
            {activeSkills.length > 0 ? activeSkills[0].name.replace(/^agency-/, '') : 'AI Copilot'}
          </span>
        </div>
      </div>

      {/* Quick Prompt Pills Carousel/List */}
      <div className="px-3 pt-2.5 pb-1 border-b border-zinc-800/40 bg-zinc-950/30">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {t.chat.pills.map((pill, idx) => (
            <button
              key={idx}
              onClick={() => handlePillClick(pill)}
              disabled={isLoading}
              className="flex-shrink-0 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-violet-950/50 hover:border-violet-500/50 border border-zinc-800 text-zinc-300 text-[11px] font-medium transition-all shadow-xs disabled:opacity-50"
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Welcome Message */}
        <div className="flex gap-2.5 items-start">
          <div className="w-7 h-7 rounded-lg bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300 flex-shrink-0 mt-0.5">
            <Bot className="w-4 h-4" />
          </div>
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl rounded-tl-none p-3 text-zinc-200 leading-relaxed shadow-sm max-w-[90%] space-y-2">
            <p>{t.chat.systemWelcome}</p>
            {currentIP && (
              <div className="p-2 rounded-xl bg-violet-950/30 border border-violet-500/30 flex items-center gap-2 mt-2">
                <img src={currentIP.avatarUrl} alt={currentIP.name} className="w-6 h-6 rounded-full object-cover" />
                <div>
                  <span className="text-zinc-200 font-semibold text-[11px]">{currentIP.name}</span>
                  <p className="text-[10px] text-zinc-400">{currentIP.archetype}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Chat Messages */}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-2.5 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                msg.role === 'user'
                  ? 'bg-zinc-800 border border-zinc-700 text-zinc-300'
                  : 'bg-violet-600/30 border border-violet-500/40 text-violet-300'
              }`}
            >
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`rounded-2xl p-3 leading-relaxed shadow-sm max-w-[85%] whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white rounded-tr-none'
                  : 'bg-zinc-900 border border-zinc-800/80 text-zinc-200 rounded-tl-none'
              }`}
            >
              {msg.content}

              {/* Action Badges */}
              {msg.action?.type === 'ip_created' && (
                <div className="mt-2.5 pt-2 border-t border-violet-500/20 flex items-center gap-1.5 text-[11px] text-violet-300 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t.chat.extractedIpBadge}
                </div>
              )}
              {msg.action?.type === 'story_generated' && (
                <div className="mt-2.5 pt-2 border-t border-violet-500/20 flex items-center gap-1.5 text-[11px] text-violet-300 font-medium">
                  <Wand2 className="w-3.5 h-3.5" />
                  {t.chat.generatedStoryBadge}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Thinking Indicator */}
        {isLoading && (
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-lg bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300 flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none p-3 text-zinc-400 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-400" />
              <span>{t.chat.thinking}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800/80 bg-zinc-950/80">
        <div className="relative flex items-center">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={t.chat.placeholder}
            rows={2}
            className="w-full bg-zinc-900/90 border border-zinc-700/80 hover:border-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-zinc-100 placeholder:text-zinc-500 text-xs rounded-xl p-3 pr-10 resize-none outline-none transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2.5 bottom-2.5 p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white transition-all shadow-md shadow-violet-600/30"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

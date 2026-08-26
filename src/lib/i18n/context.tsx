'use client';

import React, { createContext, useContext, useState, useSyncExternalStore } from 'react';
import { Locale } from '@/types';
import { translations, TranslationKey } from './translations';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: TranslationKey;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot(): Locale {
  if (typeof window === 'undefined') return 'zh';
  const saved = localStorage.getItem('ip_helper_locale');
  return saved === 'en' ? 'en' : 'zh';
}

function getServerSnapshot(): Locale {
  return 'zh';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const storedLocale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [localOverride, setLocalOverride] = useState<Locale | null>(null);

  const locale = localOverride ?? storedLocale;

  const setLocale = (newLocale: Locale) => {
    setLocalOverride(newLocale);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ip_helper_locale', newLocale);
        window.dispatchEvent(new Event('storage'));
      }
    } catch {
      // ignore storage error
    }
  };

  const toggleLocale = () => {
    const next = locale === 'zh' ? 'en' : 'zh';
    setLocale(next);
  };

  const t = (translations[locale] || translations.zh) as TranslationKey;

  return (
    <I18nContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}


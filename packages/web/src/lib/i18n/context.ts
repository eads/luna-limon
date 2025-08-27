import { setContext, getContext } from 'svelte';

export type MessageEntry = { text: string; html?: string };
export type Messages = Record<string, MessageEntry>;

const KEY = Symbol('i18n');

export function setupI18n(messages: Messages) {
  setContext(KEY, messages);
}

export function useI18n() {
  const messages = getContext<Messages>(KEY) ?? {};
  const t = (key: string) => messages[key]?.text ?? key;
  const ht = (key: string) => {
    const entry = messages[key];
    if (!entry) return escapeHtml(key);
    return entry.html ?? escapeHtml(entry.text);
  };
  return { t, ht, messages };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


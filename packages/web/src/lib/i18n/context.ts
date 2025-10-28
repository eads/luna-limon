import { getContext, setContext } from 'svelte';

export type MessageEntry = { text: string; html?: string };
export type Messages = Record<string, MessageEntry>;

const KEY = Symbol('i18n');

type LookupMap = Map<string, string[]>;
type LookupEntry = { key: string; normalized: string; segments: string[] };
type LookupIndex = { map: LookupMap; entries: LookupEntry[] };
type I18nContext = { messages: Messages; debug: boolean; lookup?: LookupIndex };

export function setupI18n(messages: Messages, options: { debug?: boolean } = {}) {
  const debug = !!options.debug;
  const lookup = debug ? buildLookup(messages) : undefined;
  setContext<I18nContext>(KEY, { messages, debug, lookup });
}

export function useI18n() {
  const ctx = getContext<I18nContext>(KEY) ?? { messages: {}, debug: false, lookup: undefined };
  const t = (key: string) => {
    return ctx.messages[key]?.text ?? key;
  };
  const ht = (key: string) => {
    const entry = ctx.messages[key];
    if (!entry) {
      const raw = escapeHtml(key);
      return ctx.debug ? wrapDebugHtml(key, raw, false) : raw;
    }
    const hasHtml = entry.html != null;
    const raw = hasHtml ? entry.html! : escapeHtml(entry.text);
    return ctx.debug ? wrapDebugHtml(key, raw, hasHtml) : raw;
  };
  const annotateDebug =
    ctx.debug && typeof document !== 'undefined' && ctx.lookup
      ? (root?: ParentNode | null) => annotateTree(root ?? document.body, ctx.lookup!)
      : undefined;
  return { t, ht, messages: ctx.messages, debug: ctx.debug, annotateDebug };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function wrapDebugHtml(key: string, html: string, trusted: boolean): string {
  const display = formatDisplayKey(key);
  const open = `<span class="i18n-debug-label" data-i18n-key="${escapeAttr(display)}">`;
  const close = '</span>';
  return trusted ? `${open}${html}${close}` : `${open}${html}${close}`;
}

function buildLookup(messages: Messages): LookupIndex {
  const map: LookupMap = new Map();
  const entries: LookupEntry[] = [];
  for (const [key, entry] of Object.entries(messages)) {
    const value = entry?.text;
    if (!value) continue;
    for (const variant of buildVariants(value)) {
      if (!variant) continue;
      const bucket = map.get(variant) ?? [];
      if (!bucket.includes(key)) {
        if (key.includes('.')) bucket.unshift(key);
        else bucket.push(key);
      }
      map.set(variant, bucket);
    }
    const normalized = normalizeText(value);
    const segments = extractSegments(value);
    entries.push({ key, normalized, segments });
  }
  return { map, entries };
}

function buildVariants(value: string): string[] {
  const variants = new Set<string>();
  variants.add(value);
  const trimmed = value.trim();
  if (trimmed && trimmed !== value) variants.add(trimmed);
  const plain = stripFormatting(value);
  if (plain) {
    variants.add(plain);
    const plainTrimmed = plain.trim();
    if (plainTrimmed && plainTrimmed !== plain) variants.add(plainTrimmed);
  }
  for (const segment of extractSegments(value)) {
    if (segment.length) variants.add(segment);
  }
  return Array.from(variants);
}

function annotateTree(root: ParentNode, lookup: LookupIndex) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.nodeValue ?? '';
      if (!text.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
      if (parent.classList.contains('i18n-debug-label') || parent.closest('.i18n-debug-label')) {
        return NodeFilter.FILTER_REJECT;
      }
      const direct = findKeyForText(text, lookup, node as Text);
      if (!direct) return NodeFilter.FILTER_REJECT;
      const trimmed = text.trim();
      if (!lookup.map.has(text) && !lookup.map.has(trimmed)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const seen = new WeakSet<Node>();
  while (true) {
    const node = walker.nextNode();
    if (!node) break;
    if (!(node instanceof Text)) continue;
    if (seen.has(node)) continue;
    const original = node.nodeValue ?? '';
    const trimmed = original.trim();
    const keys = lookup.map.get(original) ?? lookup.map.get(trimmed);
    const key = keys?.[0] ?? findKeyForText(original, lookup, node);
    if (!key) continue;
    const parent = node.parentElement;
    if (!parent) continue;
        const span = document.createElement('span');
    span.className = 'i18n-debug-label';
    span.dataset.i18nKey = formatDisplayKey(key);
        span.textContent = original;
        parent.replaceChild(span, node);
        seen.add(span);
  }
}

function findKeyForText(text: string, lookup: LookupIndex, node?: Text): string | undefined {
  const direct = lookup.map.get(text) ?? lookup.map.get(text.trim());
  if (direct && direct.length) return direct[0];
  if (node && node.parentElement) {
    const parentText = node.parentElement.textContent ?? '';
    const parentDirect = lookup.map.get(parentText) ?? lookup.map.get(parentText.trim());
    if (parentDirect && parentDirect.length) return parentDirect[0];
  }
  const normalized = normalizeText(text);
  if (!normalized) return undefined;
  if (normalized.length < 3) return undefined;
  for (const entry of lookup.entries) {
    if (node && node.parentElement) {
      const parentNormalized = normalizeText(node.parentElement.textContent ?? '');
      if (parentNormalized === entry.normalized) {
        return entry.key;
      }
    }
    if (entry.segments.some((segment) => segment === text || segment === text.trim())) {
      return entry.key;
    }
    if (entry.normalized.includes(normalized) && normalized.length / entry.normalized.length >= 0.2) {
      return entry.key;
    }
  }
  return undefined;
}

function stripFormatting(value: string): string {
  let plain = value.replace(/\r\n?/g, '\n');
  plain = plain.replace(/\*\*(.+?)\*\*/gs, '$1');
  plain = plain.replace(/__(.+?)__/gs, '$1');
  plain = plain.replace(/\*(\S[^*]*?\S)\*/g, '$1');
  plain = plain.replace(/_(\S[^_]*?\S)_/g, '$1');
  plain = plain.replace(/\\([*_])/g, '$1');
  return plain;
}

function extractSegments(value: string): string[] {
  const segments = new Set<string>();
  const plain = stripFormatting(value);
  const normalized = plain.replace(/\n+/g, ' ').split(/<br\s*\/?>/i)[0];
  const pieces = plain.split(/\n+/);
  for (const piece of pieces) {
    const trimmed = piece.trim();
    if (trimmed) segments.add(trimmed);
  }
  const words = plain.split(/\s{2,}/);
  for (const word of words) {
    const trimmed = word.trim();
    if (trimmed) segments.add(trimmed);
  }
  if (normalized) segments.add(normalized.trim());
  return Array.from(segments);
}

function normalizeText(value: string): string {
  return stripFormatting(value).replace(/\s+/g, ' ').trim().toLowerCase();
}

function formatDisplayKey(key: string): string {
  const dotIndex = key.indexOf('.');
  if (dotIndex === -1) return `global|${key}`;
  const namespace = key.slice(0, dotIndex);
  const rest = key.slice(dotIndex + 1);
  return `${namespace}|${rest}`;
}

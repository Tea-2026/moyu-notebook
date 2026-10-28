/* ==========================================================================
   摸鱼笔记本 · Moyu — local-first capture & notes
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- 0. Constants & tiny helpers ---------- */
  const VERSION = '3.3.4';
  const VAULT_KEY = 'moyu.vault.v1';
  const BACKUP_KEY = 'moyu.vault.backup.v1';
  const SETTINGS_KEY = 'moyu.settings.v1';
  const IS_NATIVE = !!(window.chrome && window.chrome.webview);
  const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || '');
  const MOD = IS_MAC ? '⌘' : 'Ctrl';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const ICONS = {
    search: '<circle cx="11" cy="11" r="6.4"/><path d="M15.8 15.8 20 20"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2.6"/><path d="M8.2 10V7.4a3.8 3.8 0 0 1 7.6 0V10"/><circle cx="12" cy="15" r="1"/>',
    key: '<circle cx="8" cy="15.5" r="3.6"/><path d="M10.7 13 19 4.7M16.4 7.3l2 2M14.2 9.5l2 2"/>',
    globe: '<circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8M12 3.6c2.4 2.3 3.7 5.2 3.7 8.4s-1.3 6.1-3.7 8.4c-2.4-2.3-3.7-5.2-3.7-8.4S9.6 5.9 12 3.6Z"/>',
    note: '<path d="M6.5 3.6h7.2l3.8 3.8v13H6.5z"/><path d="M13.7 3.6v3.8h3.8M9.6 12h4.8M9.6 15.4h4.8"/>',
    bookmark: '<path d="M7 4.2h10v15.6l-5-3.2-5 3.2z"/>',
    pin: '<path d="M9.2 3.4h5.6l-.8 4.3 2.8 2.9v1.7H7.2v-1.7l2.8-2.9-.8-4.3Z"/><path d="M12 12.3v7.6"/>',
    pinFill: '<path d="M9.2 3.4h5.6l-.8 4.3 2.8 2.9v1.7H7.2v-1.7l2.8-2.9-.8-4.3Z" fill="currentColor"/><path d="M12 12.3v7.6"/>',
    trash: '<path d="M4.8 7h14.4M9.4 7V4.6h5.2V7M6.7 7l.9 12.2h8.8L17.3 7M10.2 10.8v5.4M13.8 10.8v5.4"/>',
    settings: '<path d="M4 7h8.5M16.5 7H20M4 17h3.5M11.5 17H20"/><circle cx="14.5" cy="7" r="2.1"/><circle cx="9.5" cy="17" r="2.1"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4"/>',
    moon: '<path d="M20 13.6A8.5 8.5 0 0 1 10.4 4 8.5 8.5 0 1 0 20 13.6Z"/>',
    monitor: '<rect x="3.2" y="4.5" width="17.6" height="11.6" rx="2"/><path d="M8.5 20h7M12 16.1V20"/>',
    help: '<circle cx="12" cy="12" r="8.4"/><path d="M9.7 9.6a2.4 2.4 0 1 1 3.4 2.2c-.7.4-1.1.8-1.1 1.7"/><circle cx="12" cy="16.7" r=".7" fill="currentColor" stroke="none"/>',
    copy: '<rect x="8.4" y="8.4" width="11.2" height="11.2" rx="2"/><path d="M15.6 8.4V6.2a2 2 0 0 0-2-2H6.2a2 2 0 0 0-2 2v7.4a2 2 0 0 0 2 2h2.2"/>',
    external: '<path d="M14 4.5h5.5V10M19.5 4.5 11 13"/><path d="M18 14.2v4.3a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18.5V7.5A1.5 1.5 0 0 1 5.5 6h4.3"/>',
    eye: '<path d="M2.8 12s3.3-5.7 9.2-5.7S21.2 12 21.2 12s-3.3 5.7-9.2 5.7S2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.7"/>',
    eyeOff: '<path d="M4 4l16 16"/><path d="M9.8 6.6A9.9 9.9 0 0 1 12 6.4c5.9 0 9.2 5.6 9.2 5.6a17 17 0 0 1-3.1 3.6M6.2 8.2A17.4 17.4 0 0 0 2.8 12s3.3 5.6 9.2 5.6c1.3 0 2.5-.3 3.6-.7"/><path d="M10.2 10.2a2.5 2.5 0 0 0 3.6 3.6"/>',
    dice: '<rect x="4.2" y="4.2" width="15.6" height="15.6" rx="3.4"/><circle cx="9" cy="9" r="1.05" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.05" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.05" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1.05" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.05" fill="currentColor" stroke="none"/>',
    check: '<path d="M4.8 12.6l4.6 4.6L19.3 6.8"/>',
    chevron: '<path d="M8.5 10 12 13.5 15.5 10"/>',
    chevronLeft: '<path d="M14.5 6.5 9 12l5.5 5.5"/>',
    chevronRight: '<path d="M9.5 6.5 15 12l-5.5 5.5"/>',
    more: '<circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
    menu: '<path d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15"/>',
    drag: '<circle cx="9" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="17" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="1" fill="currentColor" stroke="none"/>',
    sort: '<path d="M4.5 7.5h15M7 12h10M10 16.5h4"/>',
    filter: '<path d="M4.2 5.2h15.6l-6 7.1v5.3l-3.6 2v-7.3z"/>',
    clock: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.5V12l3 2"/>',
    tag: '<path d="M4 4.6h6.2L20 14.4 14.4 20 4 9.6z"/><circle cx="8.1" cy="8.2" r="1.15" fill="currentColor" stroke="none"/>',
    sparkle: '<path d="M12 3.2l1.7 5.1 5.1 1.7-5.1 1.7L12 16.8l-1.7-5.1L5.2 10l5.1-1.7z"/><path d="M18.2 15.2l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    shield: '<path d="M12 3.4 19 6v5.3c0 4.7-3.4 8-7 9.3-3.6-1.3-7-4.6-7-9.3V6z"/><path d="M9 12l2 2 4-4"/>',
    download: '<path d="M12 4.2v10.6M7.7 10.5 12 14.8l4.3-4.3M4.8 19.2h14.4"/>',
    upload: '<path d="M12 15.2V4.6M7.7 8.9 12 4.6l4.3 4.3M4.8 19.2h14.4"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    inbox: '<path d="M4.2 5h15.6v14H4.2z"/><path d="M4.2 13.2h4.1l1.5 2.4h4.4l1.5-2.4h4.1"/>',
    book: '<path d="M5 4.6h10.4A2.6 2.6 0 0 1 18 7.2v12.2H7.4A2.4 2.4 0 0 1 5 17z"/><path d="M5 16.8a2.6 2.6 0 0 1 2.6-2.6H18M8.4 8.2h6.2M8.4 11.4h4.2"/>',
    quote: '<path d="M9.8 6.8H5.6v5.4h4.2c0 2.3-1.2 4-3.4 5M20 6.8h-4.2v5.4H20c0 2.3-1.2 4-3.4 5"/>',
    pen: '<path d="M4.7 19.3 5.6 15 17 3.6a2.2 2.2 0 0 1 3.1 3.1L8.7 18.2l-4 .9Z"/><path d="M14.8 5.8 17.9 8.9"/>',
    calendar: '<rect x="4" y="5.4" width="16" height="14.4" rx="2"/><path d="M4 10.2h16M8 3.4v4M16 3.4v4M8.2 14h2M13.8 14h2M8.2 17h2"/>',
    plan: '<rect x="4.2" y="4" width="15.6" height="16" rx="2.2"/><path d="M8 8h8M8 12h5M8 16h3"/><path d="m14.8 16 1.5 1.5 2.7-3"/>',
    folder: '<path d="M3.8 6.4h5.4l1.6 2h9.4v10.2H3.8z"/>',
    restore: '<path d="M4.8 9.2A8 8 0 1 1 4 14"/><path d="M4.4 4.4v5h5"/>',
    share: '<circle cx="17.5" cy="6" r="2.4"/><circle cx="6.5" cy="12" r="2.4"/><circle cx="17.5" cy="18" r="2.4"/><path d="M8.7 10.9l6.6-3.6M8.7 13.1l6.6 3.6"/>',
    command: '<path d="M9 8V6.5A2.5 2.5 0 1 0 6.5 9H18M9 8v8M9 8h6M15 8V6.5A2.5 2.5 0 1 1 17.5 9M15 16v1.5a2.5 2.5 0 1 0 2.5-2.5H6M9 16h6"/>',
    link: '<path d="M10.2 13.8a4.2 4.2 0 0 0 6 0l2.2-2.2a4.2 4.2 0 0 0-6-6l-1.2 1.2"/><path d="M13.8 10.2a4.2 4.2 0 0 0-6 0l-2.2 2.2a4.2 4.2 0 0 0 6 6l1.2-1.2"/>',
    clip: '<path d="M8.6 12.4 15 6a3.1 3.1 0 0 1 4.4 4.4l-7.6 7.6a4.6 4.6 0 0 1-6.5-6.5l7-7"/>',
    scissors: '<circle cx="6.5" cy="7" r="2.2"/><circle cx="6.5" cy="17" r="2.2"/><path d="M8.4 8.4 19 18M8.4 15.6 19 6"/>',
    fish: '<path d="M3.5 12c2.8-4.2 7-6.2 11.3-5.3 3.3.7 5.5 2.6 6.7 5.3-1.2 2.7-3.4 4.6-6.7 5.3C10.5 18.2 6.3 16.2 3.5 12Z"/><path d="M6 12 2 8v8l4-4Z"/><circle cx="16.8" cy="10.6" r=".55" fill="currentColor" stroke="none"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4.5 17l4.8-4.5 3.6 3.2 2.8-2.4 3.8 3.4"/>',
    audio: '<path d="M4.5 9.5h3l4.2-3.8v12.6l-4.2-3.8h-3z"/><path d="M15.4 8.6a4.8 4.8 0 0 1 0 6.8M18 6.2a8.4 8.4 0 0 1 0 11.6"/>'
  };

  const icon = (name, cls = '') =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.note}</svg>`;

  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'n-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9));
  const pad = (n) => String(n).padStart(2, '0');
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function debounce(fn, wait = 250) {
    let t;
    const wrapped = (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
    wrapped.cancel = () => clearTimeout(t);
    return wrapped;
  }

  /* ---------- 1. URL / date / text helpers ---------- */
  function normalizeUrl(raw) {
    let input = String(raw || '').trim();
    if (!input) return '';
    // A whole pasted chunk: take the first URL-looking token.
    const found = input.match(/https?:\/\/[^\s<>"'）)】]+/i);
    if (found) input = found[0];
    if (!/^[a-z][a-z0-9+.-]*:/i.test(input)) input = 'https://' + input;
    try {
      const u = new URL(input);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
      if (!u.hostname || (!u.hostname.includes('.') && u.hostname !== 'localhost')) return '';
      return u.href;
    } catch { return ''; }
  }

  function domainOf(url) {
    if (!url) return '';
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch { return ''; }
  }

  function faviconFor(url) {
    const host = domainOf(url);
    if (!host) return '';
    return `https://${host}/favicon.ico`;
  }

  function prettyUrl(url) {
    if (!url) return '';
    try {
      const u = new URL(url);
      const path = (u.pathname === '/' ? '' : u.pathname) + (u.search || '');
      return (u.hostname.replace(/^www\./, '') + path).replace(/\/$/, '');
    } catch { return url; }
  }

  function extractUrls(text) {
    const matches = String(text || '').match(/https?:\/\/[^\s<>"'）)】]+/gi) || [];
    const seen = new Set();
    const out = [];
    for (const raw of matches) {
      const url = normalizeUrl(raw.replace(/[.,;:!?]+$/, ''));
      if (!url) continue;
      const key = url.replace(/\/$/, '').toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(url);
    }
    return out;
  }

  function isProbablyUrl(text) {
    const s = String(text || '').trim();
    return !!normalizeUrl(s) && !/\s/.test(s) && /https?:\/\/|^[\w-]+(\.[\w-]+)+/i.test(s);
  }

  function relativeTime(ts) {
    const time = Number(ts) || Date.now();
    const diff = Date.now() - time;
    if (diff < 45 * 1000) return '刚刚';
    if (diff < 3600 * 1000) return Math.max(1, Math.floor(diff / 60000)) + ' 分钟前';
    const d = new Date(time);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return pad(d.getHours()) + ':' + pad(d.getMinutes());
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return '昨天';
    if (diff < 7 * 86400000) return '周' + '日一二三四五六'[d.getDay()];
    if (d.getFullYear() === now.getFullYear()) return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
  }

  function fullDate(ts) {
    const d = new Date(Number(ts) || Date.now());
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function shortDate(ts) {
    const d = new Date(Number(ts) || Date.now());
    const now = new Date();
    const date = d.getFullYear() === now.getFullYear()
      ? `${d.getMonth() + 1}月${d.getDate()}日`
      : `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function dayStamp(ts = Date.now()) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function parseDayKey(key) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    const day = Number(m[3]);
    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
    return date;
  }

  function isDayKey(key) {
    return !!parseDayKey(key);
  }

  function monthKeyOf(dateKey) {
    return String(dateKey || '').slice(0, 7);
  }

  function weekdayCN(date) {
    return '日一二三四五六'[date.getDay()];
  }

  function diaryDateLabel(dateKey, withYear = true) {
    const d = parseDayKey(dateKey);
    if (!d) return dateKey;
    return `${withYear ? d.getFullYear() + '年' : ''}${d.getMonth() + 1}月${d.getDate()}日 · 周${weekdayCN(d)}`;
  }

  function clipText(text, len = 120) {
    const s = String(text || '').replace(/\s+/g, ' ').trim();
    return s.length > len ? s.slice(0, len) + '…' : s;
  }

  function firstLine(text) {
    return String(text || '').split('\n').map((s) => s.trim()).find(Boolean) || '';
  }

  function wordCount(text) {
    return String(text || '').replace(/\s/g, '').length;
  }

  function parseTagInput(value) {
    return String(value || '')
      .split(/[,，]/)
      .map((s) => s.trim().replace(/^#/, ''))
      .filter(Boolean)
      .slice(0, 24);
  }

  function uniqueTags(tags) {
    const out = [];
    for (const raw of tags || []) {
      const t = String(raw || '').trim().replace(/^#/, '').slice(0, 24);
      if (t && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
    }
    return out.slice(0, 24);
  }

  function isEditable(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function isSecureEnoughForCrypto() {
    return !!(window.crypto && window.crypto.subtle && window.crypto.getRandomValues);
  }

  function makeFilter() {
    return { type: 'all', tag: null, pinned: false, attachments: false, days: 0 };
  }

  /* ---------- 2. State ---------- */
  const defaultSettings = () => ({
    v: 1,
    theme: 'system',
    favicon: true,
    seeded: false,
    lastSelectedId: null,
    lockEnabled: false,
    autoLock: 5,
    sort: 'updated'
  });

  const state = {
    notes: [],
    diaries: [],
    noteFolders: [],
    noteItems: [],
    scheduleEvents: [],
    plans: [],
    diary: { month: monthKeyOf(dayStamp()), date: dayStamp() },
    notesSpace: { folder: 'all', selectedId: null, draft: null, expanded: {}, edit: null },
    schedule: { view: 'month', anchor: dayStamp() },
    planSpace: { selectedId: null, draft: null },
    trash: { tab: 'all', returnSpace: 'memo' },
    selectedId: null,
    filter: makeFilter(),
    query: '',
    sort: 'updated',
    settings: defaultSettings(),
    platform: {
      native: IS_NATIVE,
      hotkey: IS_MAC ? '⌘⇧Space' : 'Ctrl Alt N',
      hotkeyRegistered: true,
      autostart: false,
      version: VERSION
    },
    crypto: {
      encrypted: false,
      locked: false,
      key: null,
      salt: null,
      envelope: null,
      busy: false
    },
    ui: {
      overlay: null,
      captureOpen: false,
      filterOpen: false,
      space: 'memo',
      revealPasswordId: null,
      passForm: null,
      passError: '',
      settingsTab: 'appearance',
      settingsScroll: 0,
      importMode: null,
      credentials: [],
      credentialsLoaded: false,
      credentialsLoading: false,
      credentialsError: '',
      credentialKey: '',
      credentialRenameId: null,
      credentialDeleteId: null,
      contextMenu: null
    },
    save: { timer: null, chain: Promise.resolve(), pending: false },
    lastActivity: Date.now()
  };

  /* ---------- 3. Storage ---------- */
  let storageBroken = false;

  function storageGet(key) {
    try { return localStorage.getItem(key); }
    catch { storageBroken = true; return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); return true; }
    catch (err) {
      storageBroken = true;
      if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
        toast('本地存储空间不足，请先导出备份', { icon: 'shield', duration: 5000 });
      }
      return false;
    }
  }

  function readJSON(key, fallback = null) {
    const raw = storageGet(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  function saveSettings() {
    storageSet(SETTINGS_KEY, JSON.stringify(state.settings));
  }

  function loadSettings() {
    const loaded = readJSON(SETTINGS_KEY, null);
    const s = Object.assign(defaultSettings(), loaded && typeof loaded === 'object' ? loaded : {});
    if (!['light', 'dark', 'system'].includes(s.theme)) s.theme = 'system';
    if (!['updated', 'created', 'title'].includes(s.sort)) s.sort = 'updated';
    s.autoLock = Number(s.autoLock);
    if (!Number.isFinite(s.autoLock)) s.autoLock = 5;
    return s;
  }

  /* ---------- 4. Crypto (optional whole-vault lock) ---------- */
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  function bytesToB64(bytes) {
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < arr.length; i += chunk) {
      binary += String.fromCharCode.apply(null, arr.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function b64ToBytes(value) {
    const binary = atob(value);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }

  async function deriveVaultKey(passphrase, saltBytes) {
    const baseKey = await crypto.subtle.importKey(
      'raw', textEncoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations: 250000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptVault(notes, diaries, noteFolders, noteItems, scheduleEvents, plans, key, saltB64) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const payload = textEncoder.encode(JSON.stringify({ notes, diaries, noteFolders, noteItems, scheduleEvents, plans, savedAt: Date.now() }));
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);
    return {
      v: 1,
      enc: true,
      salt: saltB64,
      iv: bytesToB64(iv),
      data: bytesToB64(cipher),
      updatedAt: Date.now()
    };
  }

  async function decryptVault(envelope, passphrase) {
    if (!envelope || !envelope.salt || !envelope.iv || !envelope.data) throw new Error('损坏的加密数据');
    const salt = b64ToBytes(envelope.salt);
    const key = await deriveVaultKey(passphrase, salt);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64ToBytes(envelope.iv) }, key, b64ToBytes(envelope.data)
    );
    const data = JSON.parse(textDecoder.decode(plain));
    return { data, key, salt: envelope.salt };
  }

  /* ---------- 5. Seed & vault loading ---------- */
  function demoNotes() {
    const t = Date.now();
    const h = 3600 * 1000;
    return [
      {
        id: uid(), kind: 'site', title: 'Figma 设计稿',
        url: 'https://www.figma.com/', domain: 'figma.com',
        body: '团队文件都在 Drafts 里。\n每周五整理一次组件库，顺手把旧的探索稿归档。',
        tags: ['工作', '设计'], pinned: true, demo: true,
        createdAt: t - 30 * h, updatedAt: t - 32 * 60 * 1000
      },
      {
        id: uid(), kind: 'password', title: 'Vercel',
        url: 'https://vercel.com/', domain: 'vercel.com',
        username: 'studio@example.com', password: 'moyu-demo-9F2k',
        body: '团队空间的管理员账号。双因素验证器在手机里。',
        tags: ['开发', '示例'], pinned: false, demo: true,
        createdAt: t - 52 * h, updatedAt: t - 5 * h
      },
      {
        id: uid(), kind: 'site', title: 'Linear',
        url: 'https://linear.app/', domain: 'linear.app',
        body: '⌘K 搜索，C 新建 issue。\n这周的重点是收尾「收集箱」的动效。',
        tags: ['工作'], pinned: false, demo: true,
        createdAt: t - 72 * h, updatedAt: t - 20 * h
      },
      {
        id: uid(), kind: 'memo', title: '今日摸鱼计划',
        url: '', domain: '', body: '□ 把收藏夹里那篇长文看完\n□ 下楼买杯咖啡\n□ 假装很忙',
        tags: ['生活'], pinned: false, demo: true,
        createdAt: t - 96 * h, updatedAt: t - 26 * h
      }
    ];
  }

  function hydrateNote(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const kind = ['site', 'password', 'memo'].includes(raw.kind) ? raw.kind : 'memo';
    const url = normalizeUrl(raw.url || '');
    const createdAt = Number(raw.createdAt) || Date.now();
    return {
      id: typeof raw.id === 'string' && /^[\w-]{1,80}$/.test(raw.id) ? raw.id : uid(),
      kind,
      title: String(raw.title == null ? '' : raw.title).slice(0, 300),
      url,
      domain: domainOf(url),
      body: String(raw.body == null ? '' : raw.body).slice(0, 200000),
      username: String(raw.username == null ? '' : raw.username).slice(0, 300),
      password: String(raw.password == null ? '' : raw.password).slice(0, 500),
      tags: uniqueTags(Array.isArray(raw.tags) ? raw.tags : []),
      pinned: !!raw.pinned,
      demo: !!raw.demo,
      mediaType: ['image', 'audio', 'file'].includes(raw.mediaType) ? raw.mediaType : '',
      sourceUrl: normalizeUrl(raw.sourceUrl || ''),
      localPath: String(raw.localPath == null ? '' : raw.localPath).slice(0, 1000),
      local: !!raw.local,
      createdAt,
      updatedAt: Number(raw.updatedAt) || createdAt,
      deletedAt: Number(raw.deletedAt) || null
    };
  }

  function hydrateDiary(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const createdAt = Number(raw.createdAt) || Date.now();
    const fallbackDate = dayStamp(createdAt);
    const date = isDayKey(raw.date) ? raw.date : fallbackDate;
    return {
      id: typeof raw.id === 'string' && /^[\w-]{1,80}$/.test(raw.id) ? raw.id : uid(),
      date,
      title: String(raw.title == null ? '' : raw.title).slice(0, 300),
      body: String(raw.body == null ? '' : raw.body).slice(0, 200000),
      createdAt,
      updatedAt: Number(raw.updatedAt) || createdAt,
      deletedAt: Number(raw.deletedAt) || null
    };
  }

  function hydrateNoteFolder(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const createdAt = Number(raw.createdAt) || Date.now();
    return {
      id: typeof raw.id === 'string' && /^[\w-]{1,80}$/.test(raw.id) ? raw.id : uid(),
      name: String(raw.name == null ? '' : raw.name).trim().slice(0, 60),
      parentId: typeof raw.parentId === 'string' && /^[\w-]{1,80}$/.test(raw.parentId) ? raw.parentId : null,
      order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : createdAt,
      createdAt,
      updatedAt: Number(raw.updatedAt) || createdAt
    };
  }

  function hydrateNoteItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const createdAt = Number(raw.createdAt) || Date.now();
    return {
      id: typeof raw.id === 'string' && /^[\w-]{1,80}$/.test(raw.id) ? raw.id : uid(),
      folderId: typeof raw.folderId === 'string' && /^[\w-]{1,80}$/.test(raw.folderId) ? raw.folderId : null,
      title: String(raw.title == null ? '' : raw.title).slice(0, 300),
      body: String(raw.body == null ? '' : raw.body).slice(0, 200000),
      reference: String(raw.reference == null ? '' : raw.reference).slice(0, 200),
      createdAt,
      updatedAt: Number(raw.updatedAt) || createdAt,
      deletedAt: Number(raw.deletedAt) || null
    };
  }

  function validClockTime(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || '')) ? String(value) : '';
  }

  function hydratePlan(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const createdAt = Number(raw.createdAt) || Date.now();
    return {
      id: typeof raw.id === 'string' && /^[\w-]{1,80}$/.test(raw.id) ? raw.id : uid(),
      title: String(raw.title == null ? '' : raw.title).slice(0, 300),
      body: String(raw.body == null ? '' : raw.body).slice(0, 500000),
      createdAt,
      updatedAt: Number(raw.updatedAt) || createdAt,
      deletedAt: Number(raw.deletedAt) || null
    };
  }

  function hydrateScheduleEvent(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const createdAt = Number(raw.createdAt) || Date.now();
    const date = isDayKey(raw.date) ? raw.date : dayStamp(createdAt);
    const time = validClockTime(raw.time);
    const remind = Number.isFinite(Number(raw.remind)) ? Number(raw.remind) : (time ? 10 : 0);
    return {
      id: typeof raw.id === 'string' && /^[\w-]{1,80}$/.test(raw.id) ? raw.id : uid(),
      date,
      time,
      title: String(raw.title == null ? '' : raw.title).slice(0, 300),
      notes: String(raw.notes == null ? '' : raw.notes).slice(0, 20000),
      location: String(raw.location == null ? '' : raw.location).slice(0, 200),
      remind: remind >= -1 && remind <= 10080 ? remind : -1,
      createdAt,
      updatedAt: Number(raw.updatedAt) || createdAt,
      deletedAt: Number(raw.deletedAt) || null
    };
  }

  function sanitizeNoteStore() {
    const folderIds = new Set();
    const folders = [];
    for (const folder of state.noteFolders) {
      if (!folder || folderIds.has(folder.id)) continue;
      folderIds.add(folder.id);
      folders.push(folder);
    }
    for (const folder of folders) {
      if (folder.parentId && !folderIds.has(folder.parentId)) folder.parentId = null;
      if (folder.parentId === folder.id) folder.parentId = null;
    }
    for (const folder of folders) {
      const seen = new Set([folder.id]);
      let parentId = folder.parentId;
      while (parentId) {
        if (seen.has(parentId)) { folder.parentId = null; break; }
        seen.add(parentId);
        const parent = folders.find((f) => f.id === parentId);
        parentId = parent ? parent.parentId : null;
      }
    }
    state.noteFolders = folders;
    const itemIds = new Set();
    state.noteItems = state.noteItems.filter((item) => {
      if (!item || itemIds.has(item.id)) return false;
      itemIds.add(item.id);
      if (item.folderId && !folderIds.has(item.folderId)) item.folderId = null;
      return true;
    });
  }

  function noteFolderById(id) {
    return state.noteFolders.find((folder) => folder.id === id) || null;
  }

  function noteFolderPath(id, separator = ' / ') {
    if (!id) return '未分类';
    const parts = [];
    const seen = new Set();
    let folder = noteFolderById(id);
    while (folder && !seen.has(folder.id)) {
      seen.add(folder.id);
      parts.unshift(folder.name);
      folder = folder.parentId ? noteFolderById(folder.parentId) : null;
    }
    return parts.length ? parts.join(separator) : '未分类';
  }

  function noteFolderChildren(parentId, folders = state.noteFolders) {
    return folders
      .filter((folder) => folder.parentId === parentId)
      .sort((a, b) => (Number.isFinite(Number(a.order)) ? Number(a.order) : (a.createdAt || 0)) - (Number.isFinite(Number(b.order)) ? Number(b.order) : (b.createdAt || 0)) || (a.createdAt || 0) - (b.createdAt || 0) || a.name.localeCompare(b.name, 'zh-Hans-CN'));
  }

  function noteFolderDescendants(id) {
    const ids = new Set();
    const walk = (parentId) => {
      for (const child of noteFolderChildren(parentId)) {
        if (ids.has(child.id)) continue;
        ids.add(child.id);
        walk(child.id);
      }
    };
    if (id) { ids.add(id); walk(id); }
    return ids;
  }

  function noteItemsForScope(scope = state.notesSpace.folder) {
    let items = state.noteItems.filter((item) => !item.deletedAt);
    if (scope === 'unfiled' || !scope) items = items.filter((item) => !item.folderId);
    else if (scope !== 'all') {
      const ids = noteFolderDescendants(scope);
      items = items.filter((item) => item.folderId && ids.has(item.folderId));
    }
    return items.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  }

  function noteSubtreeCount(folderId) {
    const ids = noteFolderDescendants(folderId);
    return state.noteItems.filter((item) => !item.deletedAt && item.folderId && ids.has(item.folderId)).length;
  }

  function flattenNoteFolders(folders = state.noteFolders) {
    const out = [];
    const walk = (parentId, depth) => {
      for (const folder of noteFolderChildren(parentId, folders)) {
        out.push({ folder, depth });
        walk(folder.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }

  function currentNoteItem() {
    return state.noteItems.find((item) => item.id === state.notesSpace.selectedId && !item.deletedAt) || null;
  }

  function currentNoteDraft() {
    return state.notesSpace.draft;
  }

  function loadVault() {
    const raw = storageGet(VAULT_KEY);
    if (!raw) {
      if (!state.settings.seeded) {
        state.notes = demoNotes();
        state.diaries = [];
        state.noteFolders = [];
        state.noteItems = [];
        state.scheduleEvents = [];
        state.plans = [];
        state.settings.seeded = true;
        saveSettings();
        setTimeout(() => persist(), 60);
      } else {
        state.notes = [];
        state.diaries = [];
        state.noteFolders = [];
        state.noteItems = [];
        state.scheduleEvents = [];
        state.plans = [];
      }
      return;
    }

    let data = null;
    try { data = JSON.parse(raw); }
    catch {
      const backup = storageGet(BACKUP_KEY);
      if (backup) {
        try {
          data = JSON.parse(backup);
          setTimeout(() => toast('主数据读取失败，已从备份恢复', { icon: 'shield', duration: 5000 }), 500);
        } catch { data = null; }
      }
    }

    if (!data) {
      state.notes = [];
      state.diaries = [];
      state.noteFolders = [];
      state.noteItems = [];
      state.scheduleEvents = [];
      state.plans = [];
      setTimeout(() => toast('数据文件无法读取，请从备份导入', { icon: 'shield', duration: 6000 }), 500);
      return;
    }

    if (data.enc) {
      state.crypto.encrypted = true;
      state.crypto.locked = true;
      state.crypto.envelope = data;
      state.crypto.salt = data.salt;
      state.crypto.key = null;
      state.notes = [];
      state.diaries = [];
      state.noteFolders = [];
      state.noteItems = [];
      state.scheduleEvents = [];
      state.plans = [];
      return;
    }

    state.notes = Array.isArray(data.notes) ? data.notes.map(hydrateNote).filter(Boolean) : [];
    state.diaries = Array.isArray(data.diaries) ? data.diaries.map(hydrateDiary).filter(Boolean) : [];
    state.noteFolders = Array.isArray(data.noteFolders) ? data.noteFolders.map(hydrateNoteFolder).filter(Boolean) : [];
    state.noteItems = Array.isArray(data.noteItems) ? data.noteItems.map(hydrateNoteItem).filter(Boolean) : [];
    state.scheduleEvents = Array.isArray(data.scheduleEvents) ? data.scheduleEvents.map(hydrateScheduleEvent).filter(Boolean) : [];
    state.plans = Array.isArray(data.plans) ? data.plans.map(hydratePlan).filter(Boolean) : [];
    sanitizeNoteStore();
    state.crypto.encrypted = false;
    state.crypto.locked = false;
    state.settings.lockEnabled = false;
  }

  function hasPasswordData() {
    return state.notes.some((n) => n.kind === 'password' && n.password);
  }

  async function persist() {
    if (state.crypto.locked) return;
    if (state.crypto.encrypted && !state.crypto.key) return;
    const snapshot = JSON.parse(JSON.stringify(state.notes));
    const diarySnapshot = JSON.parse(JSON.stringify(state.diaries));
    const folderSnapshot = JSON.parse(JSON.stringify(state.noteFolders));
    const noteSnapshot = JSON.parse(JSON.stringify(state.noteItems));
    const scheduleSnapshot = JSON.parse(JSON.stringify(state.scheduleEvents));
    const planSnapshot = JSON.parse(JSON.stringify(state.plans));
    state.save.pending = false;
    state.save.chain = state.save.chain.then(async () => {
      try {
        let payload;
        if (state.crypto.encrypted && state.crypto.key) {
          payload = await encryptVault(snapshot, diarySnapshot, folderSnapshot, noteSnapshot, scheduleSnapshot, planSnapshot, state.crypto.key, state.crypto.salt);
        } else {
          payload = {
            v: 1,
            enc: false,
            notes: snapshot,
            diaries: diarySnapshot,
            noteFolders: folderSnapshot,
            noteItems: noteSnapshot,
            scheduleEvents: scheduleSnapshot,
            plans: planSnapshot,
            updatedAt: Date.now()
          };
        }
        const serialized = JSON.stringify(payload);
        const previous = storageGet(VAULT_KEY);
        if (previous) storageSet(BACKUP_KEY, previous);
        if (storageSet(VAULT_KEY, serialized)) {
          flashSaved();
          const hasSecrets = snapshot.some((n) => n.kind === 'password' && n.password);
          if (IS_NATIVE && (!hasSecrets || state.crypto.encrypted)) {
            sendNative({ type: 'backup', data: serialized });
          }
        }
      } catch (err) {
        console.error(err);
        toast('保存失败，请检查存储空间', { icon: 'shield', duration: 5000 });
      }
    });
    return state.save.chain;
  }

  function scheduleSave(delay = 260) {
    state.save.pending = true;
    clearTimeout(state.save.timer);
    state.save.timer = setTimeout(() => persist(), delay);
  }

  let savedTimer = null;
  function flashSaved() {
    // Saving is intentionally silent in the notebook UI.
  }

  /* ---------- 6. Theme & shell ---------- */
  function resolvedTheme() {
    if (state.settings.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return state.settings.theme;
  }

  function applyTheme(notifyNative = true) {
    const mode = resolvedTheme();
    document.documentElement.dataset.theme = mode;
    $$('meta[name="theme-color"]').forEach((m) => {
      m.setAttribute('content', mode === 'dark' ? '#1b1c19' : '#f2efe6');
    });
    if (notifyNative && IS_NATIVE) sendNative({ type: 'theme', dark: mode === 'dark' });
  }

  function paintStaticIcons() {
    $$('[data-icon]').forEach((node) => {
      if (node.dataset.iconPainted) return;
      node.innerHTML = icon(node.dataset.icon);
      node.dataset.iconPainted = '1';
    });
  }

  function renderVaultLine() {
    const lockBtn = $('#lockNowBtn');
    if (lockBtn) lockBtn.hidden = !state.crypto.encrypted;
  }

  /* ---------- 7. Spaces & filters ---------- */
  const SPACES = {
    memo: { label: '备忘', icon: 'inbox' },
    diary: { label: '日记', icon: 'book' },
    notes: { label: '笔记', icon: 'pen' },
    plan: { label: '计划', icon: 'plan' },
    schedule: { label: '日程', icon: 'calendar' },
    trash: { label: '纸篓', icon: 'trash' }
  };

  function renderSpaceNav() {
    $$('.rail-item[data-space]').forEach((button) => {
      const active = button.dataset.space === state.ui.space;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function renderSpaceStage(space) {
    const info = SPACES[space] || SPACES.memo;
    const iconBox = $('#spaceStageIcon');
    if (iconBox) iconBox.innerHTML = icon(info.icon);
    const kicker = $('#spaceStageKicker');
    if (kicker) kicker.textContent = info.kicker || '';
    const title = $('#spaceStageTitle');
    if (title) title.textContent = info.label;
    const text = $('#spaceStageText');
    if (text) text.textContent = info.text || '';
  }

  function setSpace(space, options = {}) {
    closeContextMenu();
    const target = SPACES[space] ? space : 'memo';
    state.ui.space = target;
    const isDiary = target === 'diary';
    const isNotes = target === 'notes';
    const isPlan = target === 'plan';
    const isSchedule = target === 'schedule';
    const isTrash = target === 'trash';
    const preview = !['memo', 'diary', 'notes', 'plan', 'schedule', 'trash'].includes(target);
    $('#app').classList.toggle('diary-mode', isDiary);
    $('#app').classList.toggle('notes-mode', isNotes);
    $('#app').classList.toggle('plan-mode', isPlan);
    $('#app').classList.toggle('schedule-mode', isSchedule);
    $('#app').classList.toggle('trash-mode', isTrash);
    $('#app').classList.toggle('space-mode', preview);
    $('#app').classList.remove('show-detail', 'show-diary-detail', 'show-note-detail', 'show-plan-detail', 'show-schedule-side');
    closeFilterPanel();
    const stage = $('#spaceStage');
    if (stage) stage.setAttribute('aria-hidden', String(!preview));
    renderSpaceNav();
    renderChrome();
    document.title = target === 'memo' ? '摸鱼笔记本' : `摸鱼笔记本 · ${SPACES[target].label}`;
    if (isDiary) {
      renderDiary();
      return;
    }
    if (isNotes) {
      renderNotesSpace();
      return;
    }
    if (isPlan) {
      renderPlanSpace();
      return;
    }
    if (isSchedule) {
      renderScheduleSpace();
      return;
    }
    if (isTrash) {
      renderTrash();
      return;
    }
    if (preview) {
      renderSpaceStage(target);
      return;
    }
    if (!options.silent) {
      renderChrome();
      renderList();
      renderDetail();
    }
  }

  function diaryEntryByDate(date) {
    return state.diaries.find((entry) => entry.date === date && !entry.deletedAt) || null;
  }

  function currentDiary() {
    return diaryEntryByDate(state.diary.date);
  }

  function ensureDiary() {
    let entry = currentDiary();
    if (!entry) {
      entry = {
        id: uid(),
        date: state.diary.date,
        title: '',
        body: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      state.diaries.push(entry);
    }
    return entry;
  }

  function renderDiary() {
    if (!isDayKey(state.diary.date)) state.diary.date = dayStamp();
    if (!/^\d{4}-\d{2}$/.test(state.diary.month || '')) {
      state.diary.month = monthKeyOf(state.diary.date);
    }
    renderDiarySide();
    renderDiaryDetail();
  }

  function renderDiarySide() {
    const calendar = $('#diaryCalendar');
    const list = $('#diaryList');
    if (!calendar || !list) return;
    const month = state.diary.month;
    const first = parseDayKey(month + '-01');
    if (!first) return;
    const year = first.getFullYear();
    const monthNumber = first.getMonth() + 1;
    const today = dayStamp();
    const selected = state.diary.date;
    const days = new Date(year, monthNumber, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const byDate = new Map();
    for (const entry of state.diaries) {
      if (!entry.deletedAt && isDayKey(entry.date)) byDate.set(entry.date, entry);
    }
    const entries = state.diaries
      .filter((entry) => !entry.deletedAt && isDayKey(entry.date) && monthKeyOf(entry.date) === month)
      .sort((a, b) => b.date.localeCompare(a.date));

    const cells = [];
    for (let i = 0; i < offset; i++) cells.push('<span class="diary-day blank"></span>');
    for (let day = 1; day <= days; day++) {
      const date = `${year}-${pad(monthNumber)}-${pad(day)}`;
      const entry = byDate.get(date);
      const future = date > today;
      const classes = ['diary-day'];
      if (entry) classes.push('has-entry');
      if (date === today) classes.push('today');
      if (date === selected) classes.push('selected');
      if (future) classes.push('future');
      const label = `${year}年${monthNumber}月${day}日，周${weekdayCN(new Date(year, monthNumber - 1, day))}${entry ? '，有日记' : ''}${future ? '，还没到' : ''}`;
      cells.push(`<button class="${classes.join(' ')}" type="button" data-diary-date="${date}" aria-label="${label}" aria-pressed="${date === selected}" ${date === today ? 'aria-current="date"' : ''} ${future ? 'disabled' : ''}>
        <span>${day}</span>${entry ? '<i class="diary-day-dot" aria-hidden="true"></i>' : ''}
      </button>`);
    }
    const totalCells = Math.ceil((offset + days) / 7) * 7;
    for (let i = offset + days; i < totalCells; i++) cells.push('<span class="diary-day blank"></span>');

    calendar.innerHTML = `
      <div class="diary-cal-head">
        <button class="diary-cal-nav" type="button" data-diary-action="prev" aria-label="上个月">${icon('chevronLeft')}</button>
        <strong>${year}年${monthNumber}月</strong>
        <button class="diary-cal-nav" type="button" data-diary-action="next" aria-label="下个月">${icon('chevronRight')}</button>
      </div>
      <div class="diary-cal-week" aria-hidden="true">
        <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
      </div>
      <div class="diary-cal-grid">${cells.join('')}</div>`;

    const monthLabel = $('#diaryMonthLabel');
    if (monthLabel) monthLabel.textContent = `${monthNumber}月`;
    const monthCount = $('#diaryMonthCount');
    if (monthCount) monthCount.textContent = `${entries.length} 篇`;

    const previousTop = list.scrollTop;
    if (!entries.length) {
      list.innerHTML = '<div class="diary-list-empty"><strong>这个月还没写</strong><span>点日历上的日子开始。</span></div>';
    } else {
      list.innerHTML = entries.map((entry) => {
        const date = parseDayKey(entry.date);
        const day = Number(entry.date.slice(8));
        const bodyLines = String(entry.body || '').split('\n').map((line) => line.trim()).filter(Boolean);
        const title = String(entry.title || '').trim() || bodyLines[0] || '无题';
        let excerpt = String(entry.title || '').trim()
          ? clipText(String(entry.body || '').replace(/\s+/g, ' ').trim(), 52)
          : clipText(bodyLines.slice(1).join(' '), 52);
        if (!excerpt) excerpt = String(entry.title || '').trim() ? '只写了标题' : (bodyLines.length ? '只有一行' : '空白');
        return `<button class="diary-item ${entry.date === selected ? 'active' : ''}" type="button" data-diary-date="${entry.date}" aria-label="${esc(diaryDateLabel(entry.date))}">
          <span class="diary-item-day">${day}<span>周${weekdayCN(date)}</span></span>
          <span class="diary-item-main">
            <span class="diary-item-title">${esc(clipText(title, 30))}</span>
            <span class="diary-item-excerpt">${esc(excerpt)}</span>
          </span>
        </button>`;
      }).join('');
    }
    list.scrollTop = previousTop;
  }

  function renderDiaryDetail(options = {}) {
    const pane = $('#diaryDetail');
    if (!pane) return;
    const date = parseDayKey(state.diary.date) || new Date();
    const key = dayStamp(date.getTime());
    const entry = diaryEntryByDate(key);
    const isToday = key === dayStamp();
    const title = entry ? entry.title : '';
    const body = entry ? entry.body : '';
    pane.innerHTML = `
      <div class="detail-toolbar">
        <button class="icon-btn back-btn diary-back" type="button" data-diary-action="back" aria-label="返回日历">${icon('back')}</button>
        <div class="tool-group">
          <button class="icon-btn" type="button" data-diary-action="export" aria-label="导出这一天的日记" title="导出 Markdown" ${entry ? '' : 'disabled'}>${icon('download')}</button>
          <button class="icon-btn" type="button" data-diary-action="delete" aria-label="删掉这篇日记" title="删掉这天" ${entry ? '' : 'hidden'}>${icon('trash')}</button>
        </div>
      </div>
      <div class="detail-scroll diary-scroll">
        <div class="diary-date-line">
          <span>${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日</span>
          <span class="diary-date-dot">·</span>
          <span>周${weekdayCN(date)}</span>
          ${isToday ? '<span class="diary-today-tag">今天</span>' : ''}
        </div>
        <textarea class="diary-title" id="diaryTitle" data-diary-field="title" rows="1" maxlength="300"
          placeholder="${isToday ? '给今天起个名字' : '给这天起个名字'}" aria-label="日记标题">${esc(title)}</textarea>
        <textarea class="diary-body" id="diaryBody" data-diary-field="body" maxlength="200000"
          placeholder="${isToday ? '今天怎么样？' : '这天，想记点什么？'}" aria-label="日记正文">${esc(body)}</textarea>
        <div class="diary-foot">
          <span class="diary-save-state">${entry ? '自动保存' : '开始写就会保存'}</span>
          <span class="foot-spacer"></span>
          <span id="diaryWordCount">${wordCount(body)} 字</span>
        </div>
      </div>`;
    autoGrow($('#diaryTitle'));
    autoGrow($('#diaryBody'));
    pane.scrollTop = 0;
    if (options.focusBody) {
      const bodyEl = $('#diaryBody');
      if (bodyEl) {
        bodyEl.focus();
        const len = bodyEl.value.length;
        bodyEl.setSelectionRange(len, len);
      }
    }
  }

  function selectDiaryDate(date, options = {}) {
    if (!isDayKey(date)) return;
    if (date > dayStamp()) {
      toast('还没到那天');
      return;
    }
    const entry = diaryEntryByDate(date);
    state.diary.date = date;
    state.diary.month = monthKeyOf(date);
    if (window.innerWidth <= 760) $('#app').classList.add('show-diary-detail');
    renderDiarySide();
    renderDiaryDetail({ focusBody: options.focusBody !== undefined ? options.focusBody : !entry });
    const active = $('.diary-item.active', $('#diaryList'));
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function diaryToday() {
    const today = dayStamp();
    selectDiaryDate(today, { focusBody: !diaryEntryByDate(today) });
  }

  function changeDiaryMonth(delta) {
    const first = parseDayKey(state.diary.month + '-01');
    if (!first) return;
    first.setMonth(first.getMonth() + delta);
    state.diary.month = monthKeyOf(dayStamp(first.getTime()));
    renderDiarySide();
  }

  function backToDiaryCalendar() {
    $('#app').classList.remove('show-diary-detail');
    const selected = $('.diary-day.selected', $('#diaryCalendar'));
    if (selected) selected.focus();
  }

  let diarySideTimer = null;
  function scheduleDiarySideRefresh() {
    clearTimeout(diarySideTimer);
    diarySideTimer = setTimeout(renderDiarySide, 280);
  }

  function onDiaryInput(e) {
    const field = e.target.closest('[data-diary-field]');
    if (!field) return;
    const entry = ensureDiary();
    if (field.dataset.diaryField === 'title') entry.title = field.value.slice(0, 300);
    else entry.body = field.value.slice(0, 200000);
    entry.updatedAt = Date.now();
    scheduleSave();
    autoGrow(field);
    const count = $('#diaryWordCount');
    if (count) count.textContent = `${wordCount(entry.body)} 字`;
    const stateText = $('.diary-save-state');
    if (stateText) stateText.textContent = '自动保存';
    $$('[data-diary-action="export"], [data-diary-action="delete"]', $('#diaryDetail')).forEach((button) => {
      button.disabled = false;
      button.hidden = false;
    });
    scheduleDiarySideRefresh();
  }

  async function deleteCurrentDiary() {
    const entry = currentDiary();
    if (!entry) return;
    const ok = await confirmAction({
      title: '删掉这篇日记？',
      message: `${diaryDateLabel(entry.date)} 会先放进纸篓，之后可以恢复。`,
      confirmLabel: '移到纸篓'
    });
    if (!ok) return;
    entry.deletedAt = Date.now();
    entry.updatedAt = Date.now();
    scheduleSave(10);
    renderDiarySide();
    renderDiaryDetail();
    renderChrome();
    toast('日记移到纸篓了', {
      actionLabel: '撤销', duration: 5000,
      onAction: () => {
        entry.deletedAt = null;
        entry.updatedAt = Date.now();
        scheduleSave(10);
        renderDiarySide();
        renderDiaryDetail();
        renderChrome();
      }
    });
  }

  function exportCurrentDiary() {
    const entry = currentDiary();
    if (!entry) { toast('这天还没写'); return; }
    exportDiariesMarkdown(entry);
  }

  function onDiarySideClick(e) {
    const action = e.target.closest('[data-diary-action]');
    if (action) {
      if (action.dataset.diaryAction === 'today') diaryToday();
      else if (action.dataset.diaryAction === 'prev') changeDiaryMonth(-1);
      else if (action.dataset.diaryAction === 'next') changeDiaryMonth(1);
      return;
    }
    const day = e.target.closest('[data-diary-date]');
    if (day && !day.disabled) selectDiaryDate(day.dataset.diaryDate);
  }

  function onDiaryDetailClick(e) {
    const action = e.target.closest('[data-diary-action]');
    if (!action) return;
    if (action.dataset.diaryAction === 'back') backToDiaryCalendar();
    else if (action.dataset.diaryAction === 'export') exportCurrentDiary();
    else if (action.dataset.diaryAction === 'delete') deleteCurrentDiary();
  }

  function renderNotesSpace() {
    const scope = state.notesSpace.folder;
    if (scope !== 'all' && scope !== 'unfiled' && !noteFolderById(scope)) state.notesSpace.folder = 'all';
    if (state.notesSpace.selectedId && !currentNoteItem()) state.notesSpace.selectedId = null;
    renderNotesTree();
    renderNotesList();
    renderNoteDetail();
  }

  function notesScopeLabel(scope = state.notesSpace.folder) {
    if (scope === 'all') return '全部';
    if (scope === 'unfiled') return '未分类';
    const folder = noteFolderById(scope);
    return folder ? folder.name : '全部';
  }

  function renderNotesTree() {
    const tree = $('#notesTree');
    if (!tree) return;
    const scope = state.notesSpace.folder;
    const edit = state.notesSpace.edit;
    const parts = [];
    const scopeRow = (value, iconName, label, count) => `
      <button class="note-scope-row ${scope === value ? 'active' : ''}" type="button" data-note-scope="${value}">
        <span class="note-scope-icon">${icon(iconName)}</span>
        <span class="note-scope-name">${label}</span>
        <span class="note-scope-count">${count}</span>
      </button>`;
    parts.push(scopeRow('all', 'inbox', '全部笔记', state.noteItems.filter((item) => !item.deletedAt).length));
    parts.push(scopeRow('unfiled', 'note', '未分类', state.noteItems.filter((item) => !item.deletedAt && !item.folderId).length));
    parts.push('<div class="notes-tree-sep"></div>');
    if (edit && edit.mode === 'new' && !edit.parentId) {
      parts.push(`<div class="note-folder-edit" style="padding-left:8px">
        <input class="note-folder-input" id="notesFolderInput" type="text" maxlength="60" value="${esc(edit.value || '')}" placeholder="文件夹名字" aria-label="文件夹名字">
      </div>`);
    }

    const folderRows = (parentId, depth) => {
      const folders = noteFolderChildren(parentId);
      const html = [];
      for (const folder of folders) {
        const children = noteFolderChildren(folder.id);
        const expanded = state.notesSpace.expanded[folder.id] !== false;
        const count = noteSubtreeCount(folder.id);
        if (edit && edit.mode === 'rename' && edit.id === folder.id) {
          html.push(`<div class="note-folder-edit" style="padding-left:${8 + depth * 14}px">
            <input class="note-folder-input" id="notesFolderInput" type="text" maxlength="60" value="${esc(edit.value || '')}" placeholder="文件夹名字" aria-label="文件夹名字">
          </div>`);
        } else {
          const toggle = children.length
            ? `<button class="note-folder-toggle" type="button" data-note-toggle="${folder.id}" aria-label="${expanded ? '收起' : '展开'}" aria-expanded="${expanded}">
                ${icon(expanded ? 'chevron' : 'chevronRight')}
              </button>`
            : '<span class="note-folder-toggle" aria-hidden="true"></span>';
          html.push(`<div class="note-folder-row ${scope === folder.id ? 'active' : ''}" style="padding-left:${8 + depth * 14}px" data-note-folder-row="${folder.id}" draggable="true" title="拖动可以移动或嵌套">
            ${toggle}
            <button class="note-folder-name" type="button" draggable="true" data-note-scope="${folder.id}">
              <span class="note-folder-icon">${icon('folder')}</span>
              <span class="note-folder-label">${esc(folder.name || '未命名')}</span>
              <span class="note-folder-count">${count}</span>
            </button>
            <span class="note-folder-actions">
              <button type="button" data-note-action="add-child" data-folder-id="${folder.id}" title="新建子文件夹" aria-label="在 ${esc(folder.name)} 下新建文件夹">${icon('plus')}</button>
              <button type="button" data-note-action="rename-folder" data-folder-id="${folder.id}" title="重命名" aria-label="重命名 ${esc(folder.name)}">${icon('pen')}</button>
              <button type="button" data-note-action="delete-folder" data-folder-id="${folder.id}" title="删除文件夹" aria-label="删除 ${esc(folder.name)}">${icon('trash')}</button>
            </span>
          </div>`);
        }
        if (expanded) {
          if (edit && edit.mode === 'new' && edit.parentId === folder.id) {
            html.push(`<div class="note-folder-edit" style="padding-left:${8 + (depth + 1) * 14}px">
              <input class="note-folder-input" id="notesFolderInput" type="text" maxlength="60" value="${esc(edit.value || '')}" placeholder="子文件夹名字" aria-label="子文件夹名字">
            </div>`);
          }
          html.push(folderRows(folder.id, depth + 1));
        }
      }
      return html.join('');
    };

    parts.push(folderRows(null, 0));
    parts.push(`<div class="note-root-drop" data-note-drop-root>${icon('folder')}移到顶层</div>`);
    if (!state.noteFolders.length && !(edit && edit.mode === 'new')) {
      parts.push('<div class="notes-tree-empty">还没有文件夹。可以建一本「书」，再在下面分章节。</div>');
    }
    tree.innerHTML = parts.join('');
    if (edit) {
      requestAnimationFrame(() => {
        const input = $('#notesFolderInput');
        if (!input) return;
        input.focus();
        input.select();
      });
    }
  }

  function renderNotesList() {
    const list = $('#notesList');
    if (!list) return;
    const scope = state.notesSpace.folder;
    const items = noteItemsForScope(scope);
    const label = $('#notesScopeLabel');
    if (label) label.textContent = notesScopeLabel(scope);
    const count = $('#notesCount');
    if (count) count.textContent = `${items.length} 条`;
    if (!items.length) {
      list.innerHTML = `<div class="notes-list-empty"><strong>${scope === 'all' ? '还没有笔记' : '这里还没有笔记'}</strong><span>${scope === 'all' ? '写一条，或者先建一个文件夹。' : '换一个文件夹，或者写一条。'}</span></div>`;
      return;
    }
    list.innerHTML = items.map((item) => {
      const title = item.title.trim() || firstLine(item.body) || '无题';
      const excerpt = clipText(item.body || '', 68) || '还没写正文';
      const path = noteFolderPath(item.folderId);
      const source = item.reference.trim() ? `${path} · ${item.reference.trim()}` : path;
      return `<button class="note-item-card ${item.id === state.notesSpace.selectedId ? 'active' : ''}" type="button" data-note-id="${item.id}" aria-label="${esc(title)}">
        <span class="note-item-top">
          <span class="note-item-title">${esc(clipText(title, 40))}</span>
          <time>${esc(relativeTime(item.updatedAt || item.createdAt))}</time>
        </span>
        <span class="note-item-excerpt">${esc(excerpt)}</span>
        <span class="note-item-source">${esc(source)}</span>
      </button>`;
    }).join('');
  }

  function noteFolderOptions(selectedId) {
    const rows = [`<option value="" ${selectedId ? '' : 'selected'}>未分类</option>`];
    for (const { folder } of flattenNoteFolders()) {
      rows.push(`<option value="${folder.id}" ${folder.id === selectedId ? 'selected' : ''}>${esc(noteFolderPath(folder.id))}</option>`);
    }
    return rows.join('');
  }

  function renderNoteDetail(options = {}) {
    const pane = $('#notesDetail');
    if (!pane) return;
    const item = currentNoteItem();
    const draft = state.notesSpace.draft;
    const data = item || draft;
    if (!data) {
      pane.innerHTML = `<div class="notes-empty-detail">
        <span class="notes-empty-icon">${icon('note')}</span>
        <strong>选一条，或者写一条。</strong>
        <p>按书、诗、题分文件夹；一本书下面还能再分章节。</p>
        <button class="btn" type="button" data-note-action="new-note">写一条</button>
      </div>`;
      return;
    }
    const isDraft = !item;
    const folderId = data.folderId || '';
    pane.innerHTML = `
      <div class="detail-toolbar">
        <button class="icon-btn back-btn notes-back" type="button" data-note-action="back" aria-label="返回笔记列表">${icon('back')}</button>
        <div class="tool-group">
          <button class="icon-btn" type="button" data-note-action="export-note" aria-label="导出这条笔记" title="导出 Markdown" ${isDraft ? 'disabled' : ''}>${icon('download')}</button>
          <button class="icon-btn" type="button" data-note-action="delete-note" aria-label="删掉这条笔记" title="删掉" ${isDraft ? 'hidden' : ''}>${icon('trash')}</button>
        </div>
      </div>
      <div class="detail-scroll note-scroll">
        <div class="note-source-line">
          <span class="note-source-label">来源</span>
          <select class="note-folder-select" id="noteFolderSelect" title="${esc(noteFolderPath(folderId))}" aria-label="笔记所属文件夹">${noteFolderOptions(folderId)}</select>
          <span class="note-source-sep">·</span>
          <input class="note-ref-input" id="noteReference" data-note-field="reference" type="text" maxlength="200"
            value="${esc(data.reference || '')}" placeholder="页码 / 位置（可选）" aria-label="页码或位置">
        </div>
        <textarea class="note-entry-title" id="noteTitle" data-note-field="title" rows="1" maxlength="300"
          placeholder="标题" aria-label="笔记标题">${esc(data.title || '')}</textarea>
        <textarea class="note-entry-body" id="noteBody" data-note-field="body" maxlength="200000"
          placeholder="摘抄、想法、解题过程……" aria-label="笔记正文">${esc(data.body || '')}</textarea>
        <div class="note-foot">
          <span class="note-save-state">${isDraft ? '开始写就会保存' : '自动保存'}</span>
          <span class="foot-spacer"></span>
          <span id="noteWordCount">${wordCount(data.body || '')} 字</span>
        </div>
      </div>`;
    autoGrow($('#noteTitle'));
    autoGrow($('#noteBody'));
    pane.scrollTop = 0;
    if (options.focusTitle) {
      const title = $('#noteTitle');
      if (title) { title.focus(); const len = title.value.length; title.setSelectionRange(len, len); }
    }
  }

  function discardEmptyNoteDraft() {
    const draft = state.notesSpace.draft;
    if (!draft) return;
    if (!String(draft.title || '').trim() && !String(draft.body || '').trim() && !String(draft.reference || '').trim()) {
      state.notesSpace.draft = null;
    }
  }

  function ensureNoteItem() {
    const existing = currentNoteItem();
    if (existing) return existing;
    const draft = state.notesSpace.draft;
    if (!draft) return null;
    const item = {
      id: uid(),
      folderId: draft.folderId || null,
      title: String(draft.title || '').slice(0, 300),
      body: String(draft.body || '').slice(0, 200000),
      reference: String(draft.reference || '').slice(0, 200),
      createdAt: draft.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    state.noteItems.push(item);
    state.notesSpace.selectedId = item.id;
    state.notesSpace.draft = null;
    return item;
  }

  function newNote() {
    discardEmptyNoteDraft();
    const scope = state.notesSpace.folder;
    const folderId = scope === 'all' || scope === 'unfiled' ? null : scope;
    state.notesSpace.selectedId = null;
    state.notesSpace.draft = {
      folderId,
      title: '',
      body: '',
      reference: '',
      createdAt: Date.now()
    };
    if (window.innerWidth <= 760) $('#app').classList.add('show-note-detail');
    renderNotesList();
    renderNoteDetail({ focusTitle: true });
  }

  function selectNoteItem(id) {
    if (!state.noteItems.some((item) => item.id === id)) return;
    discardEmptyNoteDraft();
    state.notesSpace.selectedId = id;
    state.notesSpace.draft = null;
    if (window.innerWidth <= 760) $('#app').classList.add('show-note-detail');
    renderNotesList();
    renderNoteDetail();
  }

  function selectNotesScope(scope) {
    if (scope !== 'all' && scope !== 'unfiled' && !noteFolderById(scope)) return;
    discardEmptyNoteDraft();
    state.notesSpace.folder = scope;
    state.notesSpace.edit = null;
    const visible = noteItemsForScope(scope);
    if (state.notesSpace.selectedId && !visible.some((item) => item.id === state.notesSpace.selectedId)) {
      state.notesSpace.selectedId = null;
    }
    if (!state.notesSpace.selectedId) $('#app').classList.remove('show-note-detail');
    renderNotesTree();
    renderNotesList();
    renderNoteDetail();
  }

  function startFolderEdit(mode, folderId = null, parentId = null) {
    state.notesSpace.edit = { mode, id: folderId, parentId: parentId || null, value: '', committing: false };
    if (mode === 'rename') {
      const folder = noteFolderById(folderId);
      if (!folder) return;
      state.notesSpace.edit.value = folder.name;
    } else if (parentId) {
      state.notesSpace.expanded[parentId] = true;
    }
    renderNotesTree();
  }

  let noteFolderDragId = null;

  function clearNoteDropMarks() {
    const tree = $('#notesTree');
    if (!tree) return;
    tree.classList.remove('dragging');
    $$('.note-folder-row', tree).forEach((row) => row.classList.remove('dragging', 'drop-before', 'drop-after', 'drop-inside', 'drop-not'));
    $$('.note-root-drop', tree).forEach((row) => row.classList.remove('drop-root'));
  }

  function onNoteFolderDragStart(e) {
    const row = e.target.closest('[data-note-folder-row]');
    if (!row || e.target.closest('[data-note-action]') || e.target.closest('input')) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    clearTimeout(dropVeilTimer);
    hideDropVeil();
    noteFolderDragId = row.dataset.noteFolderRow;
    try {
      e.dataTransfer.setData('text/plain', noteFolderDragId);
      e.dataTransfer.effectAllowed = 'move';
    } catch {}
    $('#notesTree')?.classList.add('dragging');
    row.classList.add('dragging');
  }

  function onNoteFolderDragOver(e) {
    if (!noteFolderDragId) return;
    e.stopPropagation();
    const tree = $('#notesTree');
    if (!tree) return;
    const rootDrop = e.target.closest('[data-note-drop-root]');
    if (rootDrop) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      $$('.note-folder-row', tree).forEach((row) => row.classList.remove('drop-before', 'drop-after', 'drop-inside', 'drop-not'));
      rootDrop.classList.add('drop-root');
      return;
    }
    const row = e.target.closest('[data-note-folder-row]');
    if (!row) return;
    const targetId = row.dataset.noteFolderRow;
    const blocked = targetId === noteFolderDragId || noteFolderDescendants(noteFolderDragId).has(targetId);
    $$('.note-folder-row', tree).forEach((entry) => entry.classList.remove('drop-before', 'drop-after', 'drop-inside', 'drop-not'));
    $$('.note-root-drop', tree).forEach((entry) => entry.classList.remove('drop-root'));
    if (blocked) {
      row.classList.add('drop-not');
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = row.getBoundingClientRect();
    const ratio = rect.height ? (e.clientY - rect.top) / rect.height : 0.5;
    row.classList.add(ratio < 0.28 ? 'drop-before' : ratio > 0.72 ? 'drop-after' : 'drop-inside');
  }

  function onNoteFolderDragLeave(e) {
    const tree = $('#notesTree');
    if (!tree) return;
    if (e.relatedTarget && tree.contains(e.relatedTarget)) return;
    clearNoteDropMarks();
    tree.classList.add('dragging');
  }

  function onNoteFolderDrop(e) {
    if (!noteFolderDragId) return;
    e.preventDefault();
    e.stopPropagation();
    const tree = $('#notesTree');
    const sourceId = noteFolderDragId;
    const rootDrop = e.target.closest('[data-note-drop-root]');
    const row = e.target.closest('[data-note-folder-row]');
    if (!tree) return;
    if (rootDrop) {
      clearNoteDropMarks();
      moveNoteFolder(sourceId, null, null, 'end');
      noteFolderDragId = null;
      return;
    }
    if (!row) { clearNoteDropMarks(); noteFolderDragId = null; return; }
    const targetId = row.dataset.noteFolderRow;
    const target = noteFolderById(targetId);
    if (!target || targetId === sourceId || noteFolderDescendants(sourceId).has(targetId)) {
      toast('不能放进自己里面');
      clearNoteDropMarks();
      noteFolderDragId = null;
      return;
    }
    const rect = row.getBoundingClientRect();
    const ratio = rect.height ? (e.clientY - rect.top) / rect.height : 0.5;
    const position = ratio < 0.28 ? 'before' : ratio > 0.72 ? 'after' : 'inside';
    clearNoteDropMarks();
    noteFolderDragId = null;
    if (position === 'inside') moveNoteFolder(sourceId, targetId, null, 'end');
    else moveNoteFolder(sourceId, target.parentId || null, targetId, position);
  }

  function onNoteFolderDragEnd() {
    noteFolderDragId = null;
    clearNoteDropMarks();
  }
  function moveNoteFolder(sourceId, parentId, targetId, position) {
    const source = noteFolderById(sourceId);
    if (!source) return;
    if (parentId && (parentId === sourceId || noteFolderDescendants(sourceId).has(parentId))) {
      toast('不能放进自己里面');
      return;
    }
    if (targetId === sourceId) return;
    const previousFolders = JSON.parse(JSON.stringify(state.noteFolders));
    const previousExpanded = { ...state.notesSpace.expanded };
    const siblings = noteFolderChildren(parentId).filter((folder) => folder.id !== sourceId);
    let index = siblings.length;
    if (targetId) {
      const targetIndex = siblings.findIndex((folder) => folder.id === targetId);
      if (targetIndex >= 0) index = targetIndex + (position === 'after' ? 1 : 0);
    }
    source.parentId = parentId || null;
    siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, source);
    siblings.forEach((folder, order) => { folder.order = order * 10; });
    source.updatedAt = Date.now();
    if (parentId) state.notesSpace.expanded[parentId] = true;
    state.notesSpace.edit = null;
    scheduleSave(10);
    renderNotesSpace();
    toast('文件夹挪好了', {
      actionLabel: '撤销', duration: 5000,
      onAction: () => {
        state.noteFolders = previousFolders;
        state.notesSpace.expanded = previousExpanded;
        scheduleSave(10);
        renderNotesSpace();
      }
    });
  }

  function cancelFolderEdit() {
    state.notesSpace.edit = null;
    renderNotesTree();
  }

  function commitFolderEdit() {
    const edit = state.notesSpace.edit;
    if (!edit || edit.committing) return;
    edit.committing = true;
    const input = $('#notesFolderInput');
    const name = String(input ? input.value : edit.value || '').trim().slice(0, 60);
    if (!name) { state.notesSpace.edit = null; renderNotesTree(); return; }
    if (edit.mode === 'rename') {
      const folder = noteFolderById(edit.id);
      if (folder) {
        folder.name = name;
        folder.updatedAt = Date.now();
      }
      state.notesSpace.edit = null;
      scheduleSave(10);
      renderNotesTree();
      renderNotesList();
      renderNoteDetail();
      return;
    }
    const siblings = noteFolderChildren(edit.parentId || null);
    const maxOrder = siblings.reduce((max, folder) => Math.max(max, Number(folder.order) || 0), 0);
    const folder = {
      id: uid(),
      name,
      parentId: edit.parentId || null,
      order: maxOrder + 10,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    state.noteFolders.push(folder);
    if (folder.parentId) state.notesSpace.expanded[folder.parentId] = true;
    state.notesSpace.folder = folder.id;
    state.notesSpace.selectedId = null;
    state.notesSpace.edit = null;
    discardEmptyNoteDraft();
    scheduleSave(10);
    renderNotesSpace();
  }

  async function deleteNoteFolder(folderId) {
    const folder = noteFolderById(folderId);
    if (!folder) return;
    const ids = noteFolderDescendants(folderId);
    const affected = state.noteItems.filter((item) => item.folderId && ids.has(item.folderId));
    const targetId = folder.parentId || null;
    const targetName = targetId ? noteFolderPath(targetId) : '未分类';
    const ok = await confirmAction({
      title: '删掉这个文件夹？',
      message: `${folder.name}${ids.size > 1 ? '和它的子文件夹' : ''}会删掉。${affected.length ? `里面的 ${affected.length} 条笔记会移到「${targetName}」，不会删内容。` : '里面没有笔记。'}`,
      confirmLabel: '删掉文件夹'
    });
    if (!ok) return;
    const previousFolders = JSON.parse(JSON.stringify(state.noteFolders));
    const previousItems = JSON.parse(JSON.stringify(state.noteItems));
    const previousScope = state.notesSpace.folder;
    const previousSelected = state.notesSpace.selectedId;
    const previousDraft = state.notesSpace.draft;
    for (const item of state.noteItems) {
      if (item.folderId && ids.has(item.folderId)) {
        item.folderId = targetId;
        item.updatedAt = Date.now();
      }
    }
    state.noteFolders = state.noteFolders.filter((entry) => !ids.has(entry.id));
    if (ids.has(previousScope)) state.notesSpace.folder = targetId || 'all';
    if (state.notesSpace.draft) state.notesSpace.draft.folderId = targetId;
    state.notesSpace.edit = null;
    scheduleSave(10);
    renderNotesSpace();
    toast('文件夹删掉了，笔记还在', {
      actionLabel: '撤销', duration: 6000,
      onAction: () => {
        state.noteFolders = previousFolders;
        state.noteItems = previousItems;
        state.notesSpace.folder = previousScope;
        state.notesSpace.selectedId = previousSelected;
        state.notesSpace.draft = previousDraft;
        scheduleSave(10);
        renderNotesSpace();
      }
    });
  }

  let noteSideTimer = null;
  function scheduleNoteSideRefresh() {
    clearTimeout(noteSideTimer);
    noteSideTimer = setTimeout(() => {
      renderNotesTree();
      renderNotesList();
    }, 280);
  }

  function onNotesSideClick(e) {
    const action = e.target.closest('[data-note-action]');
    if (action) {
      const type = action.dataset.noteAction;
      if (type === 'new-note') newNote();
      else if (type === 'new-folder') startFolderEdit('new', null, null);
      else if (type === 'add-child') startFolderEdit('new', null, action.dataset.folderId);
      else if (type === 'rename-folder') startFolderEdit('rename', action.dataset.folderId);
      else if (type === 'delete-folder') deleteNoteFolder(action.dataset.folderId);
      return;
    }
    const toggle = e.target.closest('[data-note-toggle]');
    if (toggle) {
      const id = toggle.dataset.noteToggle;
      state.notesSpace.expanded[id] = state.notesSpace.expanded[id] === false;
      renderNotesTree();
      return;
    }
    const scope = e.target.closest('[data-note-scope]');
    if (scope) { selectNotesScope(scope.dataset.noteScope); return; }
    const item = e.target.closest('[data-note-id]');
    if (item) selectNoteItem(item.dataset.noteId);
  }

  function onNotesSideKeydown(e) {
    if (!state.notesSpace.edit || e.target.id !== 'notesFolderInput') return;
    if (e.key === 'Enter') {
      e.preventDefault();
      commitFolderEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelFolderEdit();
    }
  }

  function onNotesDetailClick(e) {
    const action = e.target.closest('[data-note-action]');
    if (!action) return;
    const type = action.dataset.noteAction;
    if (type === 'back') $('#app').classList.remove('show-note-detail');
    else if (type === 'new-note') newNote();
    else if (type === 'export-note') exportCurrentNote();
    else if (type === 'delete-note') deleteCurrentNoteItem();
  }

  function onNotesDetailInput(e) {
    const field = e.target.closest('[data-note-field]');
    if (!field) return;
    const item = ensureNoteItem();
    if (!item) return;
    if (field.dataset.noteField === 'title') item.title = field.value.slice(0, 300);
    else if (field.dataset.noteField === 'body') item.body = field.value.slice(0, 200000);
    else if (field.dataset.noteField === 'reference') item.reference = field.value.slice(0, 200);
    item.updatedAt = Date.now();
    scheduleSave();
    if (field.id === 'noteTitle' || field.id === 'noteBody') autoGrow(field);
    const count = $('#noteWordCount');
    if (count) count.textContent = `${wordCount(item.body)} 字`;
    const saveState = $('.note-save-state');
    if (saveState) saveState.textContent = '自动保存';
    $$('[data-note-action="export-note"], [data-note-action="delete-note"]', $('#notesDetail')).forEach((button) => {
      button.disabled = false;
      button.hidden = false;
    });
    scheduleNoteSideRefresh();
  }

  function onNotesDetailChange(e) {
    if (e.target.id !== 'noteFolderSelect') return;
    const value = e.target.value || null;
    e.target.title = noteFolderPath(value);
    const item = currentNoteItem();
    if (item) {
      item.folderId = value;
      item.updatedAt = Date.now();
      scheduleSave();
      scheduleNoteSideRefresh();
    } else if (state.notesSpace.draft) {
      state.notesSpace.draft.folderId = value;
    }
  }

  async function deleteCurrentNoteItem() {
    const item = currentNoteItem();
    if (!item) return;
    const ok = await confirmAction({
      title: '删掉这条笔记？',
      message: '会先放进纸篓，之后可以恢复。',
      confirmLabel: '移到纸篓'
    });
    if (!ok) return;
    item.deletedAt = Date.now();
    item.updatedAt = Date.now();
    state.notesSpace.selectedId = null;
    state.notesSpace.draft = null;
    if (window.innerWidth <= 760) $('#app').classList.remove('show-note-detail');
    scheduleSave(10);
    renderNotesSpace();
    renderChrome();
    toast('笔记移到纸篓了', {
      actionLabel: '撤销', duration: 5000,
      onAction: () => {
        item.deletedAt = null;
        item.updatedAt = Date.now();
        state.notesSpace.selectedId = item.id;
        if (window.innerWidth <= 760) $('#app').classList.add('show-note-detail');
        scheduleSave(10);
        renderNotesSpace();
        renderChrome();
      }
    });
  }

  function exportCurrentNote() {
    const item = currentNoteItem();
    if (!item) { toast('这条还没写'); return; }
    exportNotesMarkdown(item);
  }

  /* ---------- Plans ---------- */
  function activePlans() {
    return state.plans
      .filter((plan) => !plan.deletedAt)
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  }

  function planTitle(plan) {
    return String(plan.title || '').trim() || firstLine(plan.body) || '无题';
  }

  function currentPlan() {
    return state.plans.find((plan) => plan.id === state.planSpace.selectedId && !plan.deletedAt) || null;
  }

  function renderPlanSpace() {
    if (state.planSpace.selectedId && !currentPlan()) state.planSpace.selectedId = null;
    renderPlanList();
    renderPlanDetail();
  }

  function renderPlanList() {
    const list = $('#planList');
    if (!list) return;
    const plans = activePlans();
    const count = $('#planCount');
    if (count) count.textContent = `${plans.length} 个`;
    if (!plans.length) {
      list.innerHTML = `<div class="plan-list-empty"><strong>还没有计划</strong><span>写一个标题，下面就是一大张纸。</span></div>`;
      return;
    }
    list.innerHTML = plans.map((plan) => `
      <button class="plan-card ${plan.id === state.planSpace.selectedId ? 'active' : ''}" type="button" data-plan-id="${plan.id}" aria-label="${esc(planTitle(plan))}">
        <span class="plan-card-top"><strong>${esc(clipText(planTitle(plan), 50))}</strong><time>${esc(relativeTime(plan.updatedAt || plan.createdAt))}</time></span>
        <span class="plan-card-excerpt">${esc(clipText(plan.body || '', 90) || '还没写正文')}</span>
      </button>`).join('');
  }

  function renderPlanDetail(options = {}) {
    const pane = $('#planDetail');
    if (!pane) return;
    const plan = currentPlan();
    const draft = state.planSpace.draft;
    const data = plan || draft;
    if (!data) {
      pane.innerHTML = `<div class="plan-empty">
        <span class="plan-empty-icon">${icon('plan')}</span>
        <strong>写一个计划。</strong>
        <p>一个标题，一张很大的纸。左侧会收好所有计划。</p>
        <button class="btn" type="button" data-plan-action="new">新建计划</button>
      </div>`;
      return;
    }
    const isDraft = !plan;
    pane.innerHTML = `
      <div class="detail-toolbar">
        <button class="icon-btn back-btn plan-back" type="button" data-plan-action="back" aria-label="返回计划列表">${icon('back')}</button>
        <div class="tool-group">
          <button class="icon-btn" type="button" data-plan-action="export" aria-label="导出这个计划" title="导出 Markdown" ${isDraft ? 'disabled' : ''}>${icon('download')}</button>
          <button class="icon-btn" type="button" data-plan-action="delete" aria-label="删掉这个计划" title="删掉" ${isDraft ? 'hidden' : ''}>${icon('trash')}</button>
        </div>
      </div>
      <div class="detail-scroll plan-scroll">
        <textarea class="plan-entry-title" id="planTitle" data-plan-field="title" rows="1" maxlength="300"
          placeholder="计划标题" aria-label="计划标题">${esc(data.title || '')}</textarea>
        <textarea class="plan-entry-body" id="planBody" data-plan-field="body" maxlength="500000"
          placeholder="把想法、步骤、时间、担心的事，都写在这张纸上……" aria-label="计划正文">${esc(data.body || '')}</textarea>
        <div class="plan-foot">
          <span class="plan-save-state">${isDraft ? '开始写就会保存' : '自动保存'}</span>
          <span class="foot-spacer"></span>
          <span id="planWordCount">${wordCount(data.body || '')} 字</span>
        </div>
      </div>`;
    autoGrow($('#planTitle'));
    autoGrow($('#planBody'));
    pane.scrollTop = 0;
    if (options.focusTitle) {
      const title = $('#planTitle');
      if (title) { title.focus(); const len = title.value.length; title.setSelectionRange(len, len); }
    }
  }

  function discardEmptyPlanDraft() {
    const draft = state.planSpace.draft;
    if (!draft) return;
    if (!String(draft.title || '').trim() && !String(draft.body || '').trim()) state.planSpace.draft = null;
  }

  function newPlan() {
    discardEmptyPlanDraft();
    state.planSpace.selectedId = null;
    state.planSpace.draft = { title: '', body: '', createdAt: Date.now() };
    if (window.innerWidth <= 760) $('#app').classList.add('show-plan-detail');
    renderPlanList();
    renderPlanDetail({ focusTitle: true });
  }

  function selectPlan(id) {
    const plan = state.plans.find((entry) => entry.id === id && !entry.deletedAt);
    if (!plan) return;
    discardEmptyPlanDraft();
    state.planSpace.selectedId = id;
    state.planSpace.draft = null;
    if (window.innerWidth <= 760) $('#app').classList.add('show-plan-detail');
    renderPlanList();
    renderPlanDetail();
  }

  function ensurePlan() {
    const existing = currentPlan();
    if (existing) return existing;
    const draft = state.planSpace.draft;
    if (!draft) return null;
    const plan = {
      id: uid(),
      title: String(draft.title || '').slice(0, 300),
      body: String(draft.body || '').slice(0, 500000),
      createdAt: draft.createdAt || Date.now(),
      updatedAt: Date.now(),
      deletedAt: null
    };
    state.plans.push(plan);
    state.planSpace.selectedId = plan.id;
    state.planSpace.draft = null;
    return plan;
  }

  function onPlanInput(e) {
    const field = e.target.closest('[data-plan-field]');
    if (!field) return;
    const plan = ensurePlan();
    if (!plan) return;
    if (field.dataset.planField === 'title') plan.title = field.value.slice(0, 300);
    else plan.body = field.value.slice(0, 500000);
    plan.updatedAt = Date.now();
    scheduleSave();
    autoGrow(field);
    const count = $('#planWordCount');
    if (count) count.textContent = `${wordCount(plan.body)} 字`;
    const saveState = $('.plan-save-state');
    if (saveState) saveState.textContent = '自动保存';
    $$('[data-plan-action="export"], [data-plan-action="delete"]', $('#planDetail')).forEach((button) => {
      button.disabled = false;
      button.hidden = false;
    });
    schedulePlanListRefresh();
  }

  let planListTimer = null;
  function schedulePlanListRefresh() {
    clearTimeout(planListTimer);
    planListTimer = setTimeout(() => {
      renderPlanList();
    }, 260);
  }

  function onPlanClick(e) {
    const action = e.target.closest('[data-plan-action]');
    if (action) {
      const type = action.dataset.planAction;
      if (type === 'new') newPlan();
      else if (type === 'back') $('#app').classList.remove('show-plan-detail');
      else if (type === 'export') exportCurrentPlan();
      else if (type === 'delete') deleteCurrentPlan();
      return;
    }
    const card = e.target.closest('[data-plan-id]');
    if (card) selectPlan(card.dataset.planId);
  }

  async function deleteCurrentPlan() {
    const plan = currentPlan();
    if (!plan) return;
    const ok = await confirmAction({
      title: '删掉这个计划？',
      message: '会先放进纸篓，之后可以恢复。',
      confirmLabel: '移到纸篓'
    });
    if (!ok) return;
    plan.deletedAt = Date.now();
    plan.updatedAt = Date.now();
    state.planSpace.selectedId = null;
    state.planSpace.draft = null;
    if (window.innerWidth <= 760) $('#app').classList.remove('show-plan-detail');
    scheduleSave(10);
    renderPlanSpace();
    renderChrome();
    toast('计划移到纸篓了', {
      actionLabel: '撤销', duration: 5000,
      onAction: () => {
        plan.deletedAt = null;
        plan.updatedAt = Date.now();
        state.planSpace.selectedId = plan.id;
        if (window.innerWidth <= 760) $('#app').classList.add('show-plan-detail');
        scheduleSave(10);
        renderPlanSpace();
        renderChrome();
      }
    });
  }

  function planMarkdown(plan) {
    return [`## ${planTitle(plan)}`, '', String(plan.body || '').trim() || '（这个计划还没有正文）', ''].join('\n');
  }

  function exportCurrentPlan() {
    const plan = currentPlan();
    if (!plan) { toast('这个计划还没写'); return; }
    exportPlansMarkdown(plan);
  }

  function exportPlansMarkdown(one = null) {
    const plans = (one ? [one] : activePlans()).filter(Boolean);
    if (!plans.length) { toast('还没有计划可导出'); return; }
    const text = one
      ? `# 摸鱼计划\n\n${planMarkdown(one)}`
      : `# 摸鱼计划\n\n导出时间：${fullDate(Date.now())}\n\n${plans.map(planMarkdown).join('\n---\n\n')}`;
    const name = one
      ? `摸鱼计划-${(planTitle(one) || '无题').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40)}.md`
      : `摸鱼计划-${dayStamp()}.md`;
    downloadFile(name, text, 'text/markdown;charset=utf-8');
    toast('计划已导出 · 明文 .md');
  }

  /* ---------- Trash ---------- */
  function trashCounts() {
    const counts = {
      memo: state.notes.filter((note) => note.deletedAt).length,
      diary: state.diaries.filter((entry) => entry.deletedAt).length,
      note: state.noteItems.filter((item) => item.deletedAt).length,
      plan: state.plans.filter((plan) => plan.deletedAt).length,
      schedule: state.scheduleEvents.filter((event) => event.deletedAt).length
    };
    counts.all = counts.memo + counts.diary + counts.note + counts.plan + counts.schedule;
    return counts;
  }

  function allTrashCount() {
    return trashCounts().all;
  }

  function trashEntries() {
    const entries = [];
    for (const note of state.notes) {
      if (!note.deletedAt) continue;
      entries.push({
        type: 'memo',
        id: note.id,
        label: note.kind === 'password' ? '密码' : note.kind === 'site' ? '网站' : '备忘',
        title: note.title.trim() || (note.url ? prettyUrl(note.url) : '') || firstLine(note.body) || '无题',
        subtitle: note.username || (note.url ? prettyUrl(note.url) : '') || '备忘',
        preview: note.kind === 'password' ? (note.username ? `账号 ${note.username}` : '密码记录') : (note.url ? prettyUrl(note.url) : clipText(note.body || '', 100)),
        deletedAt: note.deletedAt,
        raw: note
      });
    }
    for (const entry of state.diaries) {
      if (!entry.deletedAt) continue;
      entries.push({
        type: 'diary',
        id: entry.id,
        label: '日记',
        title: entry.title.trim() || firstLine(entry.body) || '无题',
        subtitle: diaryDateLabel(entry.date),
        preview: clipText(entry.body || '', 100) || '这一天空着',
        deletedAt: entry.deletedAt,
        raw: entry
      });
    }
    for (const item of state.noteItems) {
      if (!item.deletedAt) continue;
      entries.push({
        type: 'note',
        id: item.id,
        label: '笔记',
        title: item.title.trim() || firstLine(item.body) || '无题',
        subtitle: noteFolderPath(item.folderId),
        preview: clipText(item.body || '', 100) || (item.reference ? item.reference : '空笔记'),
        deletedAt: item.deletedAt,
        raw: item
      });
    }
    for (const plan of state.plans) {
      if (!plan.deletedAt) continue;
      entries.push({
        type: 'plan',
        id: plan.id,
        label: '计划',
        title: plan.title.trim() || firstLine(plan.body) || '无题',
        subtitle: '计划',
        preview: clipText(plan.body || '', 100) || '空计划',
        deletedAt: plan.deletedAt,
        raw: plan
      });
    }
    for (const event of state.scheduleEvents) {
      if (!event.deletedAt) continue;
      entries.push({
        type: 'schedule',
        id: event.id,
        label: '日程',
        title: event.title.trim() || '未命名',
        subtitle: `${diaryDateLabel(event.date)}${event.time ? ' ' + event.time : ' · 全天'}`,
        preview: [event.location, event.notes ? clipText(firstLine(event.notes), 80) : ''].filter(Boolean).join(' · '),
        deletedAt: event.deletedAt,
        raw: event
      });
    }
    return entries.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  }

  function renderTrash() {
    const counts = trashCounts();
    const tabs = [
      ['all', '全部', counts.all],
      ['memo', '备忘', counts.memo],
      ['diary', '日记', counts.diary],
      ['note', '笔记', counts.note],
      ['plan', '计划', counts.plan],
      ['schedule', '日程', counts.schedule]
    ];
    if (!tabs.some(([key]) => key === state.trash.tab)) state.trash.tab = 'all';
    const summary = $('#trashSummary');
    if (summary) summary.textContent = counts.all ? `${counts.all} 件东西` : '空的';
    const emptyButton = $('[data-trash-action="empty"]');
    if (emptyButton) emptyButton.disabled = counts.all === 0;
    const tabBar = $('#trashTabs');
    if (tabBar) {
      tabBar.innerHTML = tabs.map(([key, label, count]) => `<button class="trash-tab ${state.trash.tab === key ? 'active' : ''}" type="button" role="tab" aria-selected="${state.trash.tab === key}" data-trash-tab="${key}">${label}<span class="trash-tab-count">${count}</span></button>`).join('');
    }
    const body = $('#trashBody');
    if (!body) return;
    const entries = trashEntries().filter((entry) => state.trash.tab === 'all' || entry.type === state.trash.tab);
    if (!entries.length) {
      body.innerHTML = `<div class="trash-empty"><span>${icon('trash')}</span><strong>${counts.all ? '这个分类是空的' : '纸篓是空的'}</strong><p>${counts.all ? '切到别的分类看看。' : '删掉的备忘、日记、笔记、计划和日程会先来这里。'}</p></div>`;
      return;
    }
    body.innerHTML = `<div class="trash-list">${entries.map((entry) => `
      <article class="trash-item" data-trash-type="${entry.type}" data-trash-id="${entry.id}">
        <span class="trash-kind ${entry.type === 'schedule' ? 'tone-2' : ''}">${entry.label}</span>
        <div class="trash-main">
          <strong>${esc(entry.title)}</strong>
          <span>${esc(entry.subtitle)}</span>
          ${entry.preview ? `<em>${esc(entry.preview)}</em>` : ''}
        </div>
        <time class="trash-time">${esc(relativeTime(entry.deletedAt))}</time>
        <div class="trash-item-actions">
          <button class="trash-act restore" type="button" data-trash-action="restore" data-trash-type="${entry.type}" data-trash-id="${entry.id}">恢复</button>
          <button class="trash-act" type="button" data-trash-action="purge" data-trash-type="${entry.type}" data-trash-id="${entry.id}">彻底删除</button>
        </div>
      </article>`).join('')}</div>`;
  }

  function openTrash() {
    if (state.ui.space !== 'trash') {
      state.trash.returnSpace = ['memo', 'diary', 'notes', 'schedule'].includes(state.ui.space) ? state.ui.space : 'memo';
      state.trash.tab = 'all';
    }
    setSpace('trash');
  }

  function restoreTrashEntry(type, id) {
    let raw = null;
    if (type === 'memo') raw = state.notes.find((entry) => entry.id === id && entry.deletedAt);
    else if (type === 'diary') raw = state.diaries.find((entry) => entry.id === id && entry.deletedAt);
    else if (type === 'note') raw = state.noteItems.find((entry) => entry.id === id && entry.deletedAt);
    else if (type === 'plan') raw = state.plans.find((entry) => entry.id === id && entry.deletedAt);
    else if (type === 'schedule') raw = state.scheduleEvents.find((entry) => entry.id === id && entry.deletedAt);
    if (!raw) return false;
    if (type === 'diary' && state.diaries.some((entry) => entry.id !== id && !entry.deletedAt && entry.date === raw.date)) {
      toast('这天已经有一篇日记了');
      return false;
    }
    if (type === 'note' && raw.folderId && !noteFolderById(raw.folderId)) raw.folderId = null;
    raw.deletedAt = null;
    raw.updatedAt = Date.now();
    if (type === 'schedule') queueScheduleReminderSync();
    scheduleSave(10);
    renderTrash();
    renderChrome();
    toast('恢复了');
    return true;
  }

  async function purgeTrashEntry(type, id) {
    const labels = { memo: '备忘', diary: '日记', note: '笔记', plan: '计划', schedule: '日程' };
    const ok = await confirmAction({
      title: '彻底删掉？',
      message: `这件${labels[type] || '东西'}会从本机删除，不能恢复。`,
      confirmLabel: '彻底删除'
    });
    if (!ok) return;
    if (type === 'memo') state.notes = state.notes.filter((entry) => entry.id !== id);
    else if (type === 'diary') state.diaries = state.diaries.filter((entry) => entry.id !== id);
    else if (type === 'note') state.noteItems = state.noteItems.filter((entry) => entry.id !== id);
    else if (type === 'plan') state.plans = state.plans.filter((entry) => entry.id !== id);
    else if (type === 'schedule') state.scheduleEvents = state.scheduleEvents.filter((entry) => entry.id !== id);
    if (state.selectedId === id) state.selectedId = null;
    if (state.notesSpace.selectedId === id) state.notesSpace.selectedId = null;
    if (state.planSpace.selectedId === id) state.planSpace.selectedId = null;
    if (type === 'schedule') queueScheduleReminderSync();
    scheduleSave(10);
    renderTrash();
    renderChrome();
    toast('彻底删掉了');
  }

  async function purgeAllTrash(skipConfirm = false) {
    const count = allTrashCount();
    if (!count) { toast('纸篓已经空了'); return; }
    if (!skipConfirm) {
      const ok = await confirmAction({
        title: '清空纸篓？',
        message: `${count} 件东西会从本机彻底删除，不能恢复。`,
        confirmLabel: '清空纸篓'
      });
      if (!ok) return;
    }
    state.notes = state.notes.filter((note) => !note.deletedAt);
    state.diaries = state.diaries.filter((entry) => !entry.deletedAt);
    state.noteItems = state.noteItems.filter((entry) => !entry.deletedAt);
    state.plans = state.plans.filter((entry) => !entry.deletedAt);
    state.scheduleEvents = state.scheduleEvents.filter((entry) => !entry.deletedAt);
    if (state.selectedId && !state.notes.some((note) => note.id === state.selectedId)) state.selectedId = null;
    if (state.notesSpace.selectedId && !currentNoteItem()) state.notesSpace.selectedId = null;
    if (state.planSpace.selectedId && !currentPlan()) state.planSpace.selectedId = null;
    queueScheduleReminderSync();
    scheduleSave(10);
    renderTrash();
    renderChrome();
    if (state.ui.overlay && state.ui.overlay.kind === 'settings') renderSettings();
    toast('纸篓清空了');
  }

  function onTrashClick(e) {
    const tab = e.target.closest('[data-trash-tab]');
    if (tab) { state.trash.tab = tab.dataset.trashTab; renderTrash(); return; }
    const action = e.target.closest('[data-trash-action]');
    if (!action) return;
    const type = action.dataset.trashType;
    const id = action.dataset.trashId;
    if (action.dataset.trashAction === 'back') {
      const back = state.trash.returnSpace && state.trash.returnSpace !== 'trash' ? state.trash.returnSpace : 'memo';
      setSpace(back);
    } else if (action.dataset.trashAction === 'empty') purgeAllTrash();
    else if (action.dataset.trashAction === 'restore') restoreTrashEntry(type, id);
    else if (action.dataset.trashAction === 'purge') purgeTrashEntry(type, id);
  }

  /* ---------- Local API ---------- */
  function apiReply(id, status, body) {
    sendNative({ type: 'api-response', id, status, body: JSON.stringify(body) });
  }

  function apiPayload(ok, dataOrError) {
    return ok ? { ok: true, data: dataOrError } : { ok: false, error: dataOrError };
  }

  function apiMemo(note) {
    return {
      id: note.id,
      kind: note.kind,
      title: note.title,
      url: note.url,
      username: note.username,
      body: note.body,
      tags: note.tags,
      pinned: !!note.pinned,
      hasPassword: !!note.password,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    };
  }

  function apiNote(item) {
    return {
      id: item.id,
      folderId: item.folderId || null,
      folder: noteFolderPath(item.folderId),
      title: item.title,
      body: item.body,
      reference: item.reference,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  function apiDiary(entry) {
    return {
      id: entry.id,
      date: entry.date,
      title: entry.title,
      body: entry.body,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    };
  }

  function apiScheduleEvent(event) {
    return {
      id: event.id,
      date: event.date,
      time: event.time,
      title: event.title,
      notes: event.notes,
      location: event.location,
      remind: event.remind,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    };
  }

  function apiFolder(folder) {
    return {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId || null,
      path: noteFolderPath(folder.id),
      order: folder.order || 0
    };
  }

  function apiPlan(plan) {
    return {
      id: plan.id,
      title: plan.title,
      body: plan.body,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt
    };
  }

  async function apiPersistAndRefresh({ reminders = false } = {}) {
    scheduleSave(10);
    await persist();
    if (reminders) queueScheduleReminderSync();
    renderChrome();
    renderList();
    renderDetail();
    if (state.ui.space === 'diary') renderDiary();
    if (state.ui.space === 'notes') renderNotesSpace();
    if (state.ui.space === 'schedule') renderScheduleSpace();
    if (state.ui.space === 'trash') renderTrash();
  }

  function apiFail(status, code, message) {
    const error = new Error(message);
    error.apiStatus = status;
    error.apiCode = code;
    throw error;
  }

  function apiText(value, limit) {
    return String(value == null ? '' : value).slice(0, limit);
  }

  async function routeApi(method, path, query, body) {
    const parts = path.split('/').filter(Boolean);
    if (parts[0] !== 'v1') apiFail(404, 'not_found', '没有这个接口');
    const resource = parts[1];
    const id = parts[2] ? decodeURIComponent(parts[2]) : '';

    if (resource === 'summary' && method === 'GET') {
      return {
        status: 200,
        body: apiPayload(true, {
          memos: state.notes.filter((note) => !note.deletedAt).length,
          diaries: state.diaries.filter((entry) => !entry.deletedAt).length,
          notes: state.noteItems.filter((item) => !item.deletedAt).length,
          folders: state.noteFolders.length,
          plans: state.plans.filter((plan) => !plan.deletedAt).length,
          schedule: state.scheduleEvents.filter((event) => !event.deletedAt).length,
          trash: allTrashCount()
        })
      };
    }

    if (resource === 'memos') {
      if (method === 'GET' && !id) {
        const q = String(query.get('q') || '').trim().toLowerCase();
        const limit = Math.max(1, Math.min(500, Number(query.get('limit')) || 100));
        const items = state.notes
          .filter((note) => !note.deletedAt)
          .filter((note) => !q || [note.title, note.body, note.url, note.username, ...(note.tags || [])].join(' ').toLowerCase().includes(q))
          .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
          .slice(0, limit)
          .map(apiMemo);
        return { status: 200, body: apiPayload(true, items) };
      }
      if (method === 'POST' && !id) {
        const title = apiText(body.title, 300).trim();
        const url = normalizeUrl(body.url || '');
        const note = {
          id: uid(),
          kind: url ? 'site' : 'memo',
          title: title || (url ? prettyUrl(url) : ''),
          url,
          domain: domainOf(url),
          body: apiText(body.body, 200000),
          username: '',
          password: '',
          tags: uniqueTags(Array.isArray(body.tags) ? body.tags : []),
          pinned: !!body.pinned,
          demo: false,
          mediaType: '',
          sourceUrl: '',
          localPath: '',
          local: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: null
        };
        state.notes.push(note);
        await apiPersistAndRefresh();
        return { status: 201, body: apiPayload(true, apiMemo(note)) };
      }
      const note = state.notes.find((entry) => entry.id === id && !entry.deletedAt);
      if (!note) apiFail(404, 'not_found', '备忘不存在');
      if (method === 'GET') return { status: 200, body: apiPayload(true, apiMemo(note)) };
      if (method === 'PATCH') {
        if (body.title !== undefined) note.title = apiText(body.title, 300);
        if (body.body !== undefined) note.body = apiText(body.body, 200000);
        if (body.tags !== undefined) note.tags = uniqueTags(Array.isArray(body.tags) ? body.tags : []);
        if (body.url !== undefined) { note.url = normalizeUrl(body.url); note.domain = domainOf(note.url); }
        if (body.pinned !== undefined) note.pinned = !!body.pinned;
        note.updatedAt = Date.now();
        await apiPersistAndRefresh();
        return { status: 200, body: apiPayload(true, apiMemo(note)) };
      }
      if (method === 'DELETE') {
        note.deletedAt = Date.now();
        note.updatedAt = Date.now();
        if (state.selectedId === note.id) state.selectedId = null;
        await apiPersistAndRefresh();
        return { status: 200, body: apiPayload(true, { id: note.id, deleted: true }) };
      }
    }

    if (resource === 'diaries') {
      if (method === 'GET' && !id) {
        const from = String(query.get('from') || '');
        const to = String(query.get('to') || '');
        const items = state.diaries
          .filter((entry) => !entry.deletedAt && (!from || entry.date >= from) && (!to || entry.date <= to))
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(apiDiary);
        return { status: 200, body: apiPayload(true, items) };
      }
      const date = isDayKey(id) ? id : '';
      if (!date) apiFail(400, 'bad_date', '日期要写成 YYYY-MM-DD');
      const entry = state.diaries.find((item) => item.date === date && !item.deletedAt);
      if (method === 'GET') {
        if (!entry) apiFail(404, 'not_found', '这天没有日记');
        return { status: 200, body: apiPayload(true, apiDiary(entry)) };
      }
      if (method === 'PUT') {
        let target = entry;
        if (!target) {
          target = { id: uid(), date, title: '', body: '', createdAt: Date.now(), updatedAt: Date.now(), deletedAt: null };
          state.diaries.push(target);
        }
        if (body.title !== undefined) target.title = apiText(body.title, 300);
        if (body.body !== undefined) target.body = apiText(body.body, 200000);
        target.updatedAt = Date.now();
        await apiPersistAndRefresh();
        return { status: entry ? 200 : 201, body: apiPayload(true, apiDiary(target)) };
      }
      if (method === 'DELETE') {
        if (!entry) apiFail(404, 'not_found', '这天没有日记');
        entry.deletedAt = Date.now();
        entry.updatedAt = Date.now();
        await apiPersistAndRefresh();
        return { status: 200, body: apiPayload(true, { date, deleted: true }) };
      }
    }

    if (resource === 'notes') {
      if (method === 'GET' && !id) {
        const q = String(query.get('q') || '').trim().toLowerCase();
        const folder = String(query.get('folder') || '');
        const limit = Math.max(1, Math.min(500, Number(query.get('limit')) || 100));
        let items = state.noteItems.filter((item) => !item.deletedAt);
        if (folder === 'unfiled') items = items.filter((item) => !item.folderId);
        else if (folder && folder !== 'all') {
          const ids = noteFolderDescendants(folder);
          items = items.filter((item) => item.folderId && ids.has(item.folderId));
        }
        items = items
          .filter((item) => !q || [item.title, item.body, item.reference].join(' ').toLowerCase().includes(q))
          .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
          .slice(0, limit);
        return { status: 200, body: apiPayload(true, items.map(apiNote)) };
      }
      if (method === 'POST' && !id) {
        const folderId = body.folderId ? String(body.folderId) : null;
        if (folderId && !noteFolderById(folderId)) apiFail(400, 'bad_folder', '文件夹不存在');
        const item = {
          id: uid(),
          folderId,
          title: apiText(body.title, 300),
          body: apiText(body.body, 200000),
          reference: apiText(body.reference, 200),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: null
        };
        state.noteItems.push(item);
        await apiPersistAndRefresh();
        return { status: 201, body: apiPayload(true, apiNote(item)) };
      }
      const item = state.noteItems.find((entry) => entry.id === id && !entry.deletedAt);
      if (!item) apiFail(404, 'not_found', '笔记不存在');
      if (method === 'GET') return { status: 200, body: apiPayload(true, apiNote(item)) };
      if (method === 'PATCH') {
        if (body.title !== undefined) item.title = apiText(body.title, 300);
        if (body.body !== undefined) item.body = apiText(body.body, 200000);
        if (body.reference !== undefined) item.reference = apiText(body.reference, 200);
        if (body.folderId !== undefined) {
          const nextFolder = body.folderId ? String(body.folderId) : null;
          if (nextFolder && !noteFolderById(nextFolder)) apiFail(400, 'bad_folder', '文件夹不存在');
          item.folderId = nextFolder;
        }
        item.updatedAt = Date.now();
        await apiPersistAndRefresh();
        return { status: 200, body: apiPayload(true, apiNote(item)) };
      }
      if (method === 'DELETE') {
        item.deletedAt = Date.now();
        item.updatedAt = Date.now();
        if (state.notesSpace.selectedId === item.id) state.notesSpace.selectedId = null;
        await apiPersistAndRefresh();
        return { status: 200, body: apiPayload(true, { id: item.id, deleted: true }) };
      }
    }

    if (resource === 'folders') {
      if (method === 'GET' && !id) {
        return { status: 200, body: apiPayload(true, flattenNoteFolders().map(({ folder }) => apiFolder(folder))) };
      }
      if (method === 'POST' && !id) {
        const name = apiText(body.name, 60).trim();
        if (!name) apiFail(400, 'bad_name', '文件夹要有个名字');
        const parentId = body.parentId ? String(body.parentId) : null;
        if (parentId && !noteFolderById(parentId)) apiFail(400, 'bad_parent', '父文件夹不存在');
        const siblings = noteFolderChildren(parentId);
        const maxOrder = siblings.reduce((max, folder) => Math.max(max, Number(folder.order) || 0), 0);
        const folder = { id: uid(), name, parentId, order: maxOrder + 10, createdAt: Date.now(), updatedAt: Date.now() };
        state.noteFolders.push(folder);
        await apiPersistAndRefresh();
        return { status: 201, body: apiPayload(true, apiFolder(folder)) };
      }
      const folder = noteFolderById(id);
      if (!folder) apiFail(404, 'not_found', '文件夹不存在');
      if (method === 'PATCH') {
        if (body.name !== undefined) {
          const name = apiText(body.name, 60).trim();
          if (!name) apiFail(400, 'bad_name', '文件夹要有个名字');
          folder.name = name;
        }
        if (body.parentId !== undefined) {
          const parentId = body.parentId ? String(body.parentId) : null;
          if (parentId && (!noteFolderById(parentId) || noteFolderDescendants(folder.id).has(parentId))) {
            apiFail(400, 'bad_parent', '不能放进自己里面');
          }
          folder.parentId = parentId;
        }
        folder.updatedAt = Date.now();
        await apiPersistAndRefresh();
        return { status: 200, body: apiPayload(true, apiFolder(folder)) };
      }
      if (method === 'DELETE') {
        const ids = noteFolderDescendants(folder.id);
        const target = folder.parentId || null;
        for (const item of state.noteItems) {
          if (item.folderId && ids.has(item.folderId)) item.folderId = target;
        }
        state.noteFolders = state.noteFolders.filter((entry) => !ids.has(entry.id));
        if (ids.has(state.notesSpace.folder)) state.notesSpace.folder = target || 'all';
        await apiPersistAndRefresh();
        return { status: 200, body: apiPayload(true, { id: folder.id, deleted: true }) };
      }
    }

    if (resource === 'plans') {
      if (method === 'GET' && !id) {
        const q = String(query.get('q') || '').trim().toLowerCase();
        const limit = Math.max(1, Math.min(500, Number(query.get('limit')) || 100));
        const items = state.plans
          .filter((plan) => !plan.deletedAt)
          .filter((plan) => !q || [plan.title, plan.body].join(' ').toLowerCase().includes(q))
          .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
          .slice(0, limit)
          .map(apiPlan);
        return { status: 200, body: apiPayload(true, items) };
      }
      if (method === 'POST' && !id) {
        const plan = {
          id: uid(),
          title: apiText(body.title, 300),
          body: apiText(body.body, 500000),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: null
        };
        state.plans.push(plan);
        await apiPersistAndRefresh();
        return { status: 201, body: apiPayload(true, apiPlan(plan)) };
      }
      const plan = state.plans.find((entry) => entry.id === id && !entry.deletedAt);
      if (!plan) apiFail(404, 'not_found', '计划不存在');
      if (method === 'GET') return { status: 200, body: apiPayload(true, apiPlan(plan)) };
      if (method === 'PATCH') {
        if (body.title !== undefined) plan.title = apiText(body.title, 300);
        if (body.body !== undefined) plan.body = apiText(body.body, 500000);
        plan.updatedAt = Date.now();
        await apiPersistAndRefresh();
        return { status: 200, body: apiPayload(true, apiPlan(plan)) };
      }
      if (method === 'DELETE') {
        plan.deletedAt = Date.now();
        plan.updatedAt = Date.now();
        if (state.planSpace.selectedId === plan.id) state.planSpace.selectedId = null;
        await apiPersistAndRefresh();
        return { status: 200, body: apiPayload(true, { id: plan.id, deleted: true }) };
      }
    }

    if (resource === 'schedule') {
      if (method === 'GET' && !id) {
        const from = String(query.get('from') || '');
        const to = String(query.get('to') || '');
        const items = state.scheduleEvents
          .filter((event) => !event.deletedAt && (!from || event.date >= from) && (!to || event.date <= to))
          .sort((a, b) => a.date.localeCompare(b.date) || scheduleSort(a, b))
          .map(apiScheduleEvent);
        return { status: 200, body: apiPayload(true, items) };
      }
      if (method === 'POST' && !id) {
        if (!isDayKey(body.date)) apiFail(400, 'bad_date', '日期要写成 YYYY-MM-DD');
        const event = {
          id: uid(),
          date: body.date,
          time: validClockTime(body.time),
          title: apiText(body.title, 300).trim() || '未命名',
          notes: apiText(body.notes, 20000),
          location: apiText(body.location, 200),
          remind: Number.isFinite(Number(body.remind)) ? Number(body.remind) : -1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: null
        };
        state.scheduleEvents.push(event);
        await apiPersistAndRefresh({ reminders: true });
        return { status: 201, body: apiPayload(true, apiScheduleEvent(event)) };
      }
      const event = state.scheduleEvents.find((entry) => entry.id === id && !entry.deletedAt);
      if (!event) apiFail(404, 'not_found', '日程不存在');
      if (method === 'GET') return { status: 200, body: apiPayload(true, apiScheduleEvent(event)) };
      if (method === 'PATCH') {
        if (body.date !== undefined) {
          if (!isDayKey(body.date)) apiFail(400, 'bad_date', '日期要写成 YYYY-MM-DD');
          event.date = body.date;
        }
        if (body.time !== undefined) event.time = validClockTime(body.time);
        if (body.title !== undefined) event.title = apiText(body.title, 300).trim() || '未命名';
        if (body.notes !== undefined) event.notes = apiText(body.notes, 20000);
        if (body.location !== undefined) event.location = apiText(body.location, 200);
        if (body.remind !== undefined && Number.isFinite(Number(body.remind))) event.remind = Number(body.remind);
        event.updatedAt = Date.now();
        await apiPersistAndRefresh({ reminders: true });
        return { status: 200, body: apiPayload(true, apiScheduleEvent(event)) };
      }
      if (method === 'DELETE') {
        event.deletedAt = Date.now();
        event.updatedAt = Date.now();
        await apiPersistAndRefresh({ reminders: true });
        return { status: 200, body: apiPayload(true, { id: event.id, deleted: true }) };
      }
    }

    if (resource === 'trash' && method === 'GET' && !id) {
      return { status: 200, body: apiPayload(true, trashEntries().map((entry) => ({
        type: entry.type,
        id: entry.id,
        title: entry.title,
        subtitle: entry.subtitle,
        preview: entry.preview,
        deletedAt: entry.deletedAt
      }))) };
    }

    if (resource === 'trash' && id) {
      const type = id;
      const trashId = parts[3] ? decodeURIComponent(parts[3]) : '';
      const action = parts[4] || '';
      if (method === 'POST' && action === 'restore') {
        if (!restoreTrashEntry(type, trashId)) apiFail(409, 'restore_failed', '恢复失败，可能同一天已有日记');
        await apiPersistAndRefresh({ reminders: type === 'schedule' });
        return { status: 200, body: apiPayload(true, { type, id: trashId, restored: true }) };
      }
      if (method === 'DELETE') {
        let removed = false;
        if (type === 'memo') { const before = state.notes.length; state.notes = state.notes.filter((entry) => !(entry.id === trashId && entry.deletedAt)); removed = state.notes.length !== before; }
        else if (type === 'diary') { const before = state.diaries.length; state.diaries = state.diaries.filter((entry) => !(entry.id === trashId && entry.deletedAt)); removed = state.diaries.length !== before; }
        else if (type === 'note') { const before = state.noteItems.length; state.noteItems = state.noteItems.filter((entry) => !(entry.id === trashId && entry.deletedAt)); removed = state.noteItems.length !== before; }
        else if (type === 'plan') { const before = state.plans.length; state.plans = state.plans.filter((entry) => !(entry.id === trashId && entry.deletedAt)); removed = state.plans.length !== before; }
        else if (type === 'schedule') { const before = state.scheduleEvents.length; state.scheduleEvents = state.scheduleEvents.filter((entry) => !(entry.id === trashId && entry.deletedAt)); removed = state.scheduleEvents.length !== before; }
        if (!removed) apiFail(404, 'not_found', '纸篓里没有这条');
        await apiPersistAndRefresh({ reminders: type === 'schedule' });
        return { status: 200, body: apiPayload(true, { type, id: trashId, deleted: true }) };
      }
    }

    apiFail(404, 'not_found', '没有这个接口');
  }

  async function handleNativeApiRequest(msg) {
    const id = String(msg.id || '');
    try {
      if (state.crypto.locked) {
        apiReply(id, 423, apiPayload(false, { code: 'locked', message: '摸鱼笔记本已上锁' }));
        return;
      }
      const method = String(msg.method || 'GET').toUpperCase();
      const url = new URL(`http://moyu.local${String(msg.path || '/')}`);
      let body = {};
      if (msg.body) {
        try { body = JSON.parse(String(msg.body)); }
        catch { apiFail(400, 'bad_json', '请求体不是 JSON'); }
      }
      const result = await routeApi(method, url.pathname, url.searchParams, body);
      apiReply(id, result.status, result.body);
    } catch (err) {
      apiReply(id, err.apiStatus || 500, apiPayload(false, {
        code: err.apiCode || 'internal',
        message: err.apiStatus ? err.message : '应用处理失败'
      }));
    }
  }

  /* ---------- Schedule ---------- */
  function scheduleEventStart(event) {
    const date = parseDayKey(event.date);
    if (!date) return null;
    if (event.time) {
      const [hours, minutes] = event.time.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
    } else {
      date.setHours(9, 0, 0, 0);
    }
    return date;
  }

  function scheduleEventStartMs(event) {
    const date = scheduleEventStart(event);
    return date ? date.getTime() : 0;
  }

  function scheduleSort(a, b) {
    if (!!a.time !== !!b.time) return a.time ? 1 : -1;
    const timeDiff = String(a.time || '').localeCompare(String(b.time || ''));
    if (timeDiff) return timeDiff;
    return String(a.title || '').localeCompare(String(b.title || ''), 'zh-Hans-CN');
  }

  function scheduleEventsOn(date) {
    return state.scheduleEvents
      .filter((event) => !event.deletedAt && event.date === date)
      .sort(scheduleSort);
  }

  function scheduleEventsForMonth(month) {
    return state.scheduleEvents
      .filter((event) => !event.deletedAt && monthKeyOf(event.date) === month)
      .sort((a, b) => a.date.localeCompare(b.date) || scheduleSort(a, b));
  }

  function scheduleUpcomingEvents() {
    const today = dayStamp();
    return state.scheduleEvents
      .filter((event) => !event.deletedAt && event.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || scheduleSort(a, b));
  }

  function renderScheduleSidebar() {
    const list = $('#schedUpcoming');
    if (!list) return;
    const events = scheduleUpcomingEvents();
    const count = $('#schedSideCount');
    if (count) count.textContent = `${events.length} 条`;
    if (!events.length) {
      list.innerHTML = `<div class="sched-side-empty">
        <span>${icon('calendar')}</span>
        <strong>近期没有日程</strong>
        <p>新建一条，或者翻翻日历。</p>
        <button class="btn sm" type="button" data-schedule-action="new">写一条</button>
      </div>`;
      return;
    }
    const today = dayStamp();
    const nextDay = dayStamp(new Date(parseDayKey(today).getTime() + 86400000).getTime());
    const dayAfter = dayStamp(new Date(parseDayKey(today).getTime() + 2 * 86400000).getTime());
    const currentYear = new Date().getFullYear();
    const rows = [];
    let lastDate = '';
    for (const event of events) {
      if (event.date !== lastDate) {
        lastDate = event.date;
        const date = parseDayKey(event.date);
        const relative = event.date === today ? '今天'
          : event.date === nextDay ? '明天'
          : event.date === dayAfter ? '后天'
          : `周${weekdayCN(date)}`;
        const full = `${date.getFullYear() !== currentYear ? `${date.getFullYear()}年` : ''}${date.getMonth() + 1}月${date.getDate()}日`;
        rows.push(`<button class="sched-up-day ${event.date === today ? 'today' : ''}" type="button" data-schedule-up-day="${event.date}">
          <strong>${relative}</strong><span>${full}</span>
        </button>`);
      }
      const meta = [event.location, event.notes ? clipText(firstLine(event.notes), 38) : ''].filter(Boolean).join(' · ');
      rows.push(`<button class="sched-up-event ${event.time ? '' : 'allday'}" type="button" data-schedule-id="${event.id}" aria-label="${esc(event.title || '日程')}">
        <span class="sched-up-time">${event.time || '全天'}</span>
        <span class="sched-up-body">
          <strong>${esc(event.title || '未命名')}</strong>
          ${meta ? `<span>${esc(meta)}</span>` : ''}
        </span>
        ${event.remind >= 0 ? `<span class="sched-up-bell">${icon('clock')}</span>` : ''}
      </button>`);
    }
    list.innerHTML = rows.join('');
  }

  function scheduleGroup(event) {
    if (!event.time) return 'all';
    return event.time < '12:00' ? 'morning' : 'afternoon';
  }

  function scheduleWeekStart(dateKey) {
    const date = parseDayKey(dateKey) || new Date();
    const offset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - offset);
    return date;
  }

  function schedulePeriodLabel() {
    const date = parseDayKey(state.schedule.anchor) || new Date();
    if (state.schedule.view === 'day') {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 · 周${weekdayCN(date)}`;
    }
    if (state.schedule.view === 'week') {
      const start = scheduleWeekStart(state.schedule.anchor);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const startLabel = `${start.getMonth() + 1}月${start.getDate()}日`;
      const endLabel = `${end.getMonth() + 1}月${end.getDate()}日`;
      if (start.getFullYear() !== end.getFullYear()) {
        return `${start.getFullYear()}年${startLabel} – ${end.getFullYear()}年${endLabel}`;
      }
      if (start.getMonth() !== end.getMonth()) return `${startLabel} – ${endLabel}`;
      return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 – ${end.getDate()}日`;
    }
    if (state.schedule.view === 'year') return `${date.getFullYear()}年`;
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  }

  function renderScheduleSpace() {
    if (!isDayKey(state.schedule.anchor)) state.schedule.anchor = dayStamp();
    if (!['day', 'week', 'month', 'year'].includes(state.schedule.view)) state.schedule.view = 'month';
    const period = $('#schedPeriod');
    if (period) period.textContent = schedulePeriodLabel();
    $$('.sched-view-btn').forEach((button) => {
      const on = button.dataset.scheduleView === state.schedule.view;
      button.classList.toggle('active', on);
      button.setAttribute('aria-selected', String(on));
    });
    const body = $('#scheduleBody');
    if (!body) return;
    if (state.schedule.view === 'day') body.innerHTML = renderScheduleDay();
    else if (state.schedule.view === 'week') body.innerHTML = renderScheduleWeek();
    else if (state.schedule.view === 'year') body.innerHTML = renderScheduleYear();
    else body.innerHTML = renderScheduleMonth();
    body.scrollTop = 0;
    renderScheduleSidebar();
  }

  function scheduleEventChip(event, compact = false) {
    return `<button class="sched-event-chip ${event.time ? '' : 'allday'} ${compact ? 'compact' : ''}" type="button" data-schedule-id="${event.id}" title="${esc(event.title || '日程')}">
      <span class="sched-event-time">${event.time || '全天'}</span>
      <span class="sched-event-title">${esc(event.title || '未命名')}</span>
    </button>`;
  }

  function renderScheduleMonth() {
    const anchor = parseDayKey(state.schedule.anchor) || new Date();
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const today = dayStamp();
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push('<div class="sched-cell blank"></div>');
    for (let day = 1; day <= days; day++) {
      const date = `${year}-${pad(month + 1)}-${pad(day)}`;
      const events = scheduleEventsOn(date);
      const shown = events.slice(0, 3);
      const extra = events.length - shown.length;
      cells.push(`<div class="sched-cell ${date === today ? 'today' : ''} ${date === state.schedule.anchor ? 'selected' : ''}" data-schedule-day="${date}">
        <button class="sched-cell-day" type="button" data-schedule-day="${date}">${day}</button>
        <div class="sched-cell-events">
          ${shown.map((event) => scheduleEventChip(event, true)).join('')}
          ${extra > 0 ? `<span class="sched-more">还有 ${extra} 条</span>` : ''}
        </div>
      </div>`);
    }
    while (cells.length < 42) cells.push('<div class="sched-cell blank"></div>');
    return `<div class="sched-month">
      <div class="sched-weekdays" aria-hidden="true"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>
      <div class="sched-month-grid">${cells.join('')}</div>
    </div>`;
  }

  function renderScheduleWeek() {
    const start = scheduleWeekStart(state.schedule.anchor);
    const today = dayStamp();
    const columns = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const key = dayStamp(date.getTime());
      const events = scheduleEventsOn(key);
      const rows = events.length
        ? events.map((event) => `<button class="sched-week-event ${event.time ? '' : 'allday'}" type="button" data-schedule-id="${event.id}">
            <span class="sched-week-time">${event.time || '全天'}</span>
            <span class="sched-week-title">${esc(event.title || '未命名')}</span>
          </button>`).join('')
        : '<span class="sched-week-empty">—</span>';
      columns.push(`<div class="sched-week-day ${key === today ? 'today' : ''} ${key === state.schedule.anchor ? 'selected' : ''}">
        <button class="sched-week-head" type="button" data-schedule-day="${key}">
          <span>周${weekdayCN(date)}</span>
          <strong>${date.getDate()}</strong>
          <small>${date.getMonth() + 1}月</small>
        </button>
        <div class="sched-week-events">${rows}</div>
      </div>`);
    }
    return `<div class="sched-week-scroll"><div class="sched-week">${columns.join('')}</div></div>`;
  }

  function scheduleReminderText(event) {
    if (event.remind < 0) return '';
    if (event.remind === 0) return event.time ? '准时提醒' : '当天 09:00 提醒';
    if (event.remind === 1440) return '提前 1 天提醒';
    if (event.remind === 60) return '提前 1 小时提醒';
    return `提前 ${event.remind} 分钟提醒`;
  }

  function renderScheduleDay() {
    const date = state.schedule.anchor;
    const events = scheduleEventsOn(date);
    const groups = [
      ['all', '全天', ''],
      ['morning', '上午', '09:00'],
      ['afternoon', '下午', '14:00']
    ];
    const slot = ([key, label, defaultTime]) => {
      const list = events.filter((event) => scheduleGroup(event) === key);
      return `<section class="sched-slot">
        <div class="sched-slot-head">
          <div><h3>${label}</h3><span>${list.length}</span></div>
          <button class="sched-slot-add" type="button" data-schedule-add="${defaultTime}" data-schedule-add-date="${date}" aria-label="在${label}新建日程">${icon('plus')}</button>
        </div>
        <div class="sched-slot-list">${list.length ? list.map((event) => `
          <button class="sched-row ${event.time ? '' : 'allday'}" type="button" data-schedule-id="${event.id}">
            <span class="sched-row-time">${event.time || '全天'}</span>
            <span class="sched-row-main">
              <strong>${esc(event.title || '未命名')}</strong>
              <span>${esc([event.location, event.notes ? clipText(firstLine(event.notes), 60) : '', scheduleReminderText(event)].filter(Boolean).join(' · '))}</span>
            </span>
            ${event.remind >= 0 ? `<span class="sched-row-remind">${icon('clock')}</span>` : ''}
          </button>`).join('') : '<div class="sched-slot-empty">没有安排</div>'}</div>
      </section>`;
    };
    return `<div class="sched-day-view">${groups.map(slot).join('')}</div>`;
  }

  function renderScheduleYear() {
    const anchor = parseDayKey(state.schedule.anchor) || new Date();
    const year = anchor.getFullYear();
    const currentMonth = monthKeyOf(dayStamp());
    const months = [];
    for (let month = 0; month < 12; month++) {
      const key = `${year}-${pad(month + 1)}`;
      const events = scheduleEventsForMonth(key);
      const rows = events.length
        ? events.map((event) => `<button class="sched-year-event" type="button" data-schedule-id="${event.id}">
            <span class="sched-year-date">${Number(event.date.slice(8))}日</span>
            <span class="sched-year-time">${event.time || '全天'}</span>
            <span class="sched-year-title">${esc(event.title || '未命名')}</span>
          </button>`).join('')
        : '<span class="sched-year-empty">—</span>';
      months.push(`<section class="sched-year-month ${key === currentMonth ? 'current' : ''}">
        <button class="sched-year-head" type="button" data-schedule-month="${key}">
          <strong>${month + 1}月</strong><span>${events.length ? `${events.length} 条` : '空白'}</span>
        </button>
        <div class="sched-year-list">${rows}</div>
      </section>`);
    }
    return `<div class="sched-year-grid">${months.join('')}</div>`;
  }

  function shiftSchedulePeriod(direction) {
    const date = parseDayKey(state.schedule.anchor) || new Date();
    if (state.schedule.view === 'day') date.setDate(date.getDate() + direction);
    else if (state.schedule.view === 'week') date.setDate(date.getDate() + direction * 7);
    else if (state.schedule.view === 'year') date.setFullYear(date.getFullYear() + direction);
    else {
      const day = date.getDate();
      date.setDate(1);
      date.setMonth(date.getMonth() + direction);
      date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
    }
    state.schedule.anchor = dayStamp(date.getTime());
    renderScheduleSpace();
  }

  function scheduleToday() {
    state.schedule.anchor = dayStamp();
    renderScheduleSpace();
  }

  function setScheduleView(view) {
    if (!['day', 'week', 'month', 'year'].includes(view)) return;
    state.schedule.view = view;
    renderScheduleSpace();
  }

  function scheduleNewDate() {
    return isDayKey(state.schedule.anchor) ? state.schedule.anchor : dayStamp();
  }

  function openScheduleEditor(options = {}) {
    const existing = options.id ? state.scheduleEvents.find((event) => event.id === options.id && !event.deletedAt) : null;
    const date = existing ? existing.date : (options.date || scheduleNewDate());
    const time = existing ? existing.time : (options.time || '');
    const remind = existing ? existing.remind : (time ? 10 : 0);
    const title = existing ? existing.title : '';
    const location = existing ? existing.location : '';
    const notes = existing ? existing.notes : '';
    const reminderOptions = [
      [-1, '不提醒'], [0, '准时'], [5, '提前 5 分钟'], [10, '提前 10 分钟'],
      [30, '提前 30 分钟'], [60, '提前 1 小时'], [1440, '提前 1 天']
    ];
    const mounted = mountOverlay(`
      <div class="sheet schedule-sheet" role="dialog" aria-modal="true" aria-label="${existing ? '编辑日程' : '新建日程'}">
        <div class="sheet-head">
          <div class="sheet-title"><h3>${existing ? '编辑日程' : '新建日程'}</h3><p>日期要有；时间可以不填。</p></div>
          <button class="icon-btn" type="button" data-sched-edit="cancel" aria-label="关闭">${icon('x')}</button>
        </div>
        <div class="sheet-body sched-form">
          <label class="sched-field"><span>标题</span><input class="input" id="schedTitle" type="text" maxlength="300" value="${esc(title)}" placeholder="例如：交房租、和张三吃饭" data-autofocus></label>
          <div class="sched-form-grid">
            <label class="sched-field"><span>日期</span><input class="input" id="schedDate" type="date" value="${date}"></label>
            <label class="sched-field"><span>时间</span><input class="input" id="schedTime" type="time" value="${time}"><em>不填就是全天</em></label>
          </div>
          <div class="sched-form-grid">
            <label class="sched-field"><span>地点</span><input class="input" id="schedLocation" type="text" maxlength="200" value="${esc(location)}" placeholder="可选"></label>
            <label class="sched-field"><span>提醒</span><select class="select" id="schedRemind">${reminderOptions.map(([value, label]) => `<option value="${value}" ${Number(remind) === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
          </div>
          <label class="sched-field"><span>备注</span><textarea class="input sched-notes" id="schedNotes" maxlength="20000" placeholder="可选">${esc(notes)}</textarea></label>
          <div class="sched-editor-hint">${icon('clock')}桌面版运行时，会用 Windows 通知提醒。全天日程的「准时」按当天 09:00 算。</div>
        </div>
        <div class="sheet-foot">
          ${existing ? '<button class="btn ghost danger" type="button" data-sched-edit="delete">删掉</button>' : ''}
          <span class="spacer"></span>
          <button class="btn ghost" type="button" data-sched-edit="cancel">取消</button>
          <button class="btn primary" type="button" data-sched-edit="save">保存</button>
        </div>
      </div>`, { kind: 'schedule', initialFocus: '#schedTitle' });

    const close = () => mounted.close();
    const save = () => {
      const titleEl = $('#schedTitle');
      const dateEl = $('#schedDate');
      const timeEl = $('#schedTime');
      const venueEl = $('#schedLocation');
      const remindEl = $('#schedRemind');
      const notesEl = $('#schedNotes');
      const cleanTitle = String(titleEl.value || '').trim().slice(0, 300);
      const cleanDate = dateEl.value;
      if (!cleanTitle) { titleEl.focus(); toast('写个标题'); return; }
      if (!isDayKey(cleanDate)) { dateEl.focus(); toast('选个日期'); return; }
      const cleanTime = validClockTime(timeEl.value);
      const remindValue = Number(remindEl.value);
      const event = existing || {
        id: uid(),
        createdAt: Date.now()
      };
      event.date = cleanDate;
      event.time = cleanTime;
      event.title = cleanTitle;
      event.location = String(venueEl.value || '').trim().slice(0, 200);
      event.notes = String(notesEl.value || '').slice(0, 20000);
      event.remind = Number.isFinite(remindValue) ? remindValue : -1;
      event.updatedAt = Date.now();
      if (!existing) state.scheduleEvents.push(event);
      state.schedule.anchor = cleanDate;
      scheduleSave(10);
      queueScheduleReminderSync();
      close();
      renderScheduleSpace();
      toast(existing ? '日程改好了' : '日程记下了');
    };

    mounted.overlay.addEventListener('click', (e) => {
      const action = e.target.closest('[data-sched-edit]');
      if (!action) return;
      if (action.dataset.schedEdit === 'cancel') close();
      else if (action.dataset.schedEdit === 'save') save();
      else if (action.dataset.schedEdit === 'delete' && existing) {
        close();
        setTimeout(() => deleteScheduleEvent(existing.id), 80);
      }
    });
    mounted.overlay.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        save();
      }
    });
  }

  async function deleteScheduleEvent(id) {
    const event = state.scheduleEvents.find((entry) => entry.id === id && !entry.deletedAt);
    if (!event) return;
    const ok = await confirmAction({
      title: '删掉这条日程？',
      message: `${diaryDateLabel(event.date)}${event.time ? ' ' + event.time : ' · 全天'} · ${event.title || '未命名'}。会先放进纸篓。`,
      confirmLabel: '移到纸篓'
    });
    if (!ok) return;
    event.deletedAt = Date.now();
    event.updatedAt = Date.now();
    scheduleSave(10);
    queueScheduleReminderSync();
    renderScheduleSpace();
    renderChrome();
    toast('日程移到纸篓了', {
      actionLabel: '撤销', duration: 5000,
      onAction: () => {
        event.deletedAt = null;
        event.updatedAt = Date.now();
        scheduleSave(10);
        queueScheduleReminderSync();
        renderScheduleSpace();
        renderChrome();
      }
    });
  }

  function scheduleReminderPayload() {
    const now = Date.now();
    const reminders = [];
    for (const event of state.scheduleEvents) {
      if (event.deletedAt || event.remind < 0) continue;
      const start = scheduleEventStart(event);
      if (!start) continue;
      const at = start.getTime() - event.remind * 60000;
      if (at < now - 5 * 60000) continue;
      reminders.push({
        id: event.id,
        at,
        title: event.title || '日程',
        when: `${event.date.slice(5).replace('-', '月')}日${event.time ? ' ' + event.time : ' 全天'}`
      });
    }
    return reminders.sort((a, b) => a.at - b.at).slice(0, 500);
  }

  let reminderSyncTimer = null;
  function queueScheduleReminderSync() {
    if (!IS_NATIVE) return;
    clearTimeout(reminderSyncTimer);
    reminderSyncTimer = setTimeout(() => {
      sendNative({ type: 'schedule-reminders', reminders: scheduleReminderPayload() });
    }, 200);
  }

  function icsEscape(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function icsStamp(date) {
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
  }

  function exportScheduleICS() {
    if (!state.scheduleEvents.some((event) => !event.deletedAt)) { toast('还没有日程可导出'); return; }
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Moyu Notebook//Schedule//CN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];
    const sorted = state.scheduleEvents.slice()
      .filter((event) => !event.deletedAt)
      .sort((a, b) => a.date.localeCompare(b.date) || scheduleSort(a, b));
    for (const event of sorted) {
      const start = scheduleEventStart(event);
      if (!start) continue;
      const end = new Date(start);
      lines.push('BEGIN:VEVENT', `UID:${event.id}@moyu.local`);
      if (event.time) {
        end.setHours(end.getHours() + 1);
        lines.push(`DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(end)}`);
      } else {
        lines.push(`DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${dayStamp(new Date(start.getTime() + 86400000).getTime()).replace(/-/g, '')}`);
      }
      lines.push(`SUMMARY:${icsEscape(event.title || '日程')}`);
      if (event.location) lines.push(`LOCATION:${icsEscape(event.location)}`);
      if (event.notes) lines.push(`DESCRIPTION:${icsEscape(event.notes)}`);
      if (event.time && event.remind >= 0) {
        lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER:-PT${event.remind}M`, 'DESCRIPTION:日程提醒', 'END:VALARM');
      }
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    downloadFile(`摸鱼日程-${dayStamp()}.ics`, lines.join('\r\n') + '\r\n', 'text/calendar;charset=utf-8');
    toast('日程已导出 .ics');
  }

  function onScheduleClick(e) {
    const action = e.target.closest('[data-schedule-action]');
    if (action) {
      const type = action.dataset.scheduleAction;
      if (type === 'prev') shiftSchedulePeriod(-1);
      else if (type === 'next') shiftSchedulePeriod(1);
      else if (type === 'today') scheduleToday();
      else if (type === 'new') openScheduleEditor({ date: scheduleNewDate() });
      else if (type === 'open-side') $('#app').classList.add('show-schedule-side');
      else if (type === 'close-side') $('#app').classList.remove('show-schedule-side');
      return;
    }
    const view = e.target.closest('[data-schedule-view]');
    if (view) { setScheduleView(view.dataset.scheduleView); return; }
    const event = e.target.closest('[data-schedule-id]');
    if (event) { openScheduleEditor({ id: event.dataset.scheduleId }); return; }
    const add = e.target.closest('[data-schedule-add]');
    if (add) {
      openScheduleEditor({ date: add.dataset.scheduleAddDate || state.schedule.anchor, time: add.dataset.scheduleAdd || '' });
      return;
    }
    const month = e.target.closest('[data-schedule-month]');
    if (month) {
      state.schedule.anchor = `${month.dataset.scheduleMonth}-01`;
      state.schedule.view = 'month';
      renderScheduleSpace();
      return;
    }
    const upDay = e.target.closest('[data-schedule-up-day]');
    if (upDay) {
      state.schedule.anchor = upDay.dataset.scheduleUpDay;
      state.schedule.view = 'day';
      $('#app').classList.remove('show-schedule-side');
      renderScheduleSpace();
      return;
    }
    const day = e.target.closest('[data-schedule-day]');
    if (day) {
      state.schedule.anchor = day.dataset.scheduleDay;
      state.schedule.view = 'day';
      renderScheduleSpace();
    }
  }

  const FILTER_TYPES = [    ['all', '全部'],
    ['site', '网站'],
    ['password', '密码'],
    ['memo', '备忘']
  ];
  const FILTER_FLAGS = [
    ['pinned', '只看置顶', 'pin'],
    ['attachments', '有附件', 'clip'],
    ['days', '最近 7 天', 'clock']
  ];

  function tagCounts() {
    const map = new Map();
    for (const note of state.notes) {
      if (note.deletedAt) continue;
      for (const tag of note.tags || []) map.set(tag, (map.get(tag) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'));
  }

  function activeFilterItems() {
    const filter = state.filter;
    const items = [];
    if (filter.type === 'trash') items.push({ key: 'type', label: '纸篓' });
    else if (filter.type !== 'all') {
      const found = FILTER_TYPES.find(([type]) => type === filter.type);
      items.push({ key: 'type', label: found ? found[1] : '筛选' });
    }
    if (filter.tag) items.push({ key: 'tag', label: '# ' + filter.tag });
    if (filter.pinned) items.push({ key: 'pinned', label: '置顶' });
    if (filter.attachments) items.push({ key: 'attachments', label: '有附件' });
    if (filter.days) items.push({ key: 'days', label: '最近 7 天' });
    return items;
  }

  function filterCount() {
    const filter = state.filter;
    return (filter.type !== 'all' ? 1 : 0)
      + (filter.tag ? 1 : 0)
      + (filter.pinned ? 1 : 0)
      + (filter.attachments ? 1 : 0)
      + (filter.days ? 1 : 0);
  }

  function visibleNotes() {
    const q = state.query.trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    const filter = state.filter;
    const cutoff = filter.days ? Date.now() - filter.days * 86400000 : 0;
    let list = state.notes.filter((note) => {
      if (filter.type === 'trash') {
        if (!note.deletedAt) return false;
      } else {
        if (note.deletedAt) return false;
        if (filter.type !== 'all' && note.kind !== filter.type) return false;
      }
      if (filter.tag && !(note.tags || []).includes(filter.tag)) return false;
      if (filter.pinned && !note.pinned) return false;
      if (filter.attachments && !(note.local || note.mediaType)) return false;
      if (cutoff && (note.updatedAt || note.createdAt) < cutoff) return false;
      if (tokens.length) {
        const hay = [note.title, note.url, note.body, note.username, (note.tags || []).join(' ')].join(' ').toLowerCase();
        if (!tokens.every((token) => hay.includes(token))) return false;
      }
      return true;
    });

    list.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
    if (filter.type !== 'trash') {
      list.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
    }
    return list;
  }

  function renderFilterSummary() {
    const items = activeFilterItems();
    const count = items.length;
    const button = $('#filterBtn');
    if (button) {
      button.classList.toggle('active', count > 0);
      button.setAttribute('aria-label', count ? `筛选，已选 ${count} 项` : '筛选记录');
    }
    const badge = $('#filterBadge');
    if (badge) {
      badge.textContent = count > 9 ? '9+' : String(count);
      badge.hidden = count === 0;
    }
    const chips = $('#filterChips');
    if (chips) {
      chips.innerHTML = items.map((item) => `
        <button class="filter-chip" type="button" data-clear-filter="${item.key}" title="清除筛选：${esc(item.label)}">
          <span>${esc(item.label)}</span>
          <span class="filter-chip-x" aria-hidden="true">${icon('x')}</span>
        </button>`).join('');
    }
  }

  function renderFilterPanel() {
    const pop = $('#filterPop');
    if (!pop) return;
    const count = filterCount();
    const tags = tagCounts();
    const types = FILTER_TYPES.map(([type, label]) => `
      <button class="filter-type ${state.filter.type === type ? 'active' : ''}" type="button"
        data-filter-type="${type}" aria-pressed="${state.filter.type === type}">${label}</button>`).join('');
    const flags = FILTER_FLAGS.map(([key, label, iconName]) => {
      const on = key === 'days' ? state.filter.days > 0 : !!state.filter[key];
      return `<button class="filter-flag ${on ? 'active' : ''}" type="button" data-filter-flag="${key}" aria-pressed="${on}">
        ${icon(iconName)}<span>${label}</span>
      </button>`;
    }).join('');
    const tagList = tags.length
      ? tags.map(([tag, amount]) => `
        <button class="filter-tag ${state.filter.tag === tag ? 'active' : ''}" type="button"
          data-filter-tag="${esc(tag)}" aria-pressed="${state.filter.tag === tag}">
          <span class="filter-tag-name">#${esc(tag)}</span><span class="filter-tag-count">${amount}</span>
        </button>`).join('')
      : '<span class="filter-empty">还没有标签。在记录详情里可以加。</span>';

    pop.innerHTML = `
      <div class="filter-pop-head">
        <strong>筛选</strong>
        <button class="filter-reset" type="button" data-filter-reset ${count ? '' : 'disabled'}>清除全部</button>
      </div>
      <div class="filter-section" role="group" aria-label="按类型筛选">
        <div class="filter-label">类型</div>
        <div class="filter-type-grid">${types}</div>
      </div>
      ${state.filter.type === 'trash' ? '' : `<div class="filter-section">
        <div class="filter-label">标签</div>
        <div class="filter-tag-list">${tagList}</div>
      </div>`}
      <div class="filter-section" role="group" aria-label="其他筛选">
        <div class="filter-label">其他</div>
        <div class="filter-flags">${flags}</div>
      </div>
      <div class="filter-pop-foot">
        <span>筛选可以叠加</span>
        <button class="btn sm" type="button" data-filter-close>完成</button>
      </div>`;
  }

  function syncFilterPanel() {
    const pop = $('#filterPop');
    if (!pop) return;
    $$('[data-filter-type]', pop).forEach((btn) => {
      const on = btn.dataset.filterType === state.filter.type;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    $$('[data-filter-tag]', pop).forEach((btn) => {
      const on = btn.dataset.filterTag === state.filter.tag;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    $$('[data-filter-flag]', pop).forEach((btn) => {
      const key = btn.dataset.filterFlag;
      const on = key === 'days' ? state.filter.days > 0 : !!state.filter[key];
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    const reset = $('[data-filter-reset]', pop);
    if (reset) reset.disabled = filterCount() === 0;
  }

  function setFilterPanel(open) {
    const pop = $('#filterPop');
    const button = $('#filterBtn');
    state.ui.filterOpen = !!open;
    if (pop) pop.hidden = !open;
    if (button) button.setAttribute('aria-expanded', String(!!open));
    if (open) renderFilterPanel();
  }

  function closeFilterPanel(returnFocus = false) {
    if (!state.ui.filterOpen) return;
    setFilterPanel(false);
    if (returnFocus) $('#filterBtn')?.focus();
  }

  function renderChrome() {
    const trashCount = $('#trashCount');
    const trash = allTrashCount();
    if (trashCount) trashCount.textContent = trash > 99 ? '99+' : (trash ? String(trash) : '');
    const trashBtn = $('#trashBtn');
    if (trashBtn) {
      const onTrash = state.ui.space === 'trash';
      trashBtn.classList.toggle('active', onTrash);
      if (onTrash) trashBtn.setAttribute('aria-current', 'page');
      else trashBtn.removeAttribute('aria-current');
      trashBtn.setAttribute('aria-label', trash ? `纸篓，${trash} 件` : '纸篓');
    }
    renderFilterSummary();
    renderSpaceNav();
    renderVaultLine();
  }

  /* ---------- 8. List ---------- */
  function noteSubtitle(note) {
    if (note.local) {
      return note.mediaType === 'image' ? '本地图片' : note.mediaType === 'audio' ? '本地音频' : '本地文件';
    }
    if (note.kind === 'password') {
      if (note.username) return note.username;
      return note.url ? prettyUrl(note.url) : '账号';
    }
    if (note.kind === 'site') return note.url ? prettyUrl(note.url) : '没写网址';
    const line = firstLine(note.body);
    return line ? clipText(line, 60) : '空着';
  }

  function faviconMarkup(note) {
    if (note.mediaType === 'image') return `<span class="favicon-letter">${icon('image')}</span>`;
    if (note.mediaType === 'audio') return `<span class="favicon-letter">${icon('audio')}</span>`;
    if (note.mediaType === 'file') return `<span class="favicon-letter">${icon('note')}</span>`;
    if (note.kind === 'password' && !note.url) return `<span class="favicon-letter">${icon('key')}</span>`;
    if (note.kind === 'memo' && !note.url) return `<span class="favicon-letter">${icon('note')}</span>`;
    const letter = esc((note.title || note.domain || '记').trim().slice(0, 1).toUpperCase());
    if (state.settings.favicon && note.url) {
      return `<span class="favicon-letter">${letter}</span><img src="${esc(faviconFor(note.url))}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
    }
    return `<span class="favicon-letter">${letter}</span>`;
  }

  function quickHotkeyLabel() {
    return state.platform.native && state.platform.hotkey
      ? state.platform.hotkey
      : `${MOD} ${IS_MAC ? '⇧' : 'Shift'} Space`;
  }

  function newHotkeyLabel() {
    return state.platform.native ? `${MOD} N` : (IS_MAC ? '⌥ N' : 'Alt N');
  }

  function syncHotkeyHints() {
    const btn = $('#captureBtn');
    if (btn) btn.title = '记一条 · ' + quickHotkeyLabel();
  }

  function listItemClass(note) {
    return note.kind === 'password' ? 'password' : note.kind === 'memo' ? 'memo' : '';
  }

  function renderList(scrollTop = false) {
    const list = $('#noteList');
    if (!list) return;
    const notes = visibleNotes();
    const prevScroll = list.scrollTop;

    const count = $('#viewCount');
    if (count) count.textContent = String(notes.length);

    if (!notes.length) {
      let strong = '还没有记录', text = '记一条，或者把小锁拖进来。', action = '';
      if (state.query.trim()) {
        strong = '没找到'; text = '换个词试试。';
        action = '<button class="btn sm" data-action="clear-search">清除搜索</button>';
      } else if (state.filter.type === 'trash') {
        strong = '纸篓空的'; text = '删掉的东西会先来这里。';
      } else if (state.filter.tag) {
        strong = '这个标签下没东西'; text = '换个标签看看。';
      } else if (filterCount()) {
        strong = '没有符合条件的'; text = '放宽一点筛选，或者清除筛选。';
        action = '<button class="btn sm" data-action="reset-filter">清除筛选</button>';
      } else if (state.filter.type !== 'all') {
        strong = '这里空的'; text = '记一条就有了。';
      }
      list.innerHTML = `<div class="list-empty"><strong>${strong}</strong><span>${text}</span>${action}</div>`;
    } else {
      list.innerHTML = notes.map((note) => {
        const active = note.id === state.selectedId;
        const time = state.filter.type === 'trash' ? relativeTime(note.deletedAt) : relativeTime(note.updatedAt || note.createdAt);
        return `
          <div class="note-item ${active ? 'active' : ''}" role="option" aria-selected="${active}" tabindex="0" data-id="${esc(note.id)}">
            <div class="note-favicon ${listItemClass(note)}">
              ${faviconMarkup(note)}
            </div>
            <div class="note-body">
              <div class="note-top">
                <div class="note-title">${esc(note.title || '没名字')}</div>
                <time class="note-time">${esc(time)}</time>
              </div>
              <div class="note-domain">${esc(noteSubtitle(note))}</div>
            </div>
          </div>`;
      }).join('');
    }

    list.scrollTop = scrollTop ? 0 : prevScroll;
    $$('.note-favicon img', list).forEach((img) => {
      const loaded = () => img.classList.add('loaded');
      img.addEventListener('load', loaded, { once: true });
      img.addEventListener('error', () => { img.hidden = true; }, { once: true });
      if (img.complete) {
        if (img.naturalWidth > 0) loaded();
        else img.hidden = true;
      }
    });
  }

  /* ---------- 9. Detail ---------- */
  function currentNote() {
    return state.notes.find((n) => n.id === state.selectedId) || null;
  }

  function kindLabel(kind) {
    return kind === 'password' ? '密码' : kind === 'memo' ? '备忘' : '网站';
  }

  function kindIcon(kind) {
    return kind === 'password' ? 'key' : kind === 'memo' ? 'note' : 'globe';
  }

  function tagRowHTML(note) {
    const chips = (note.tags || []).map((t) => `
      <span class="tag-chip">
        <span class="tag-hash">#</span>${esc(t)}
        <button class="tag-x" type="button" data-action="remove-tag" data-tag="${esc(t)}" aria-label="移除标签 ${esc(t)}">${icon('x')}</button>
      </span>`).join('');
    return `${chips}
      <button class="tag-add" type="button" data-action="add-tag">${icon('plus')}标签</button>`;
  }

  function urlLineHTML(note, force = false) {
    if (note.local) {
      const name = note.title || localFileName(note.localPath) || '本地文件';
      const mediaIcon = note.mediaType === 'image' ? 'image' : note.mediaType === 'audio' ? 'audio' : 'note';
      return `
        <div class="url-line local">
          <span class="url-favicon">${icon(mediaIcon)}</span>
          <span class="url-local-name">${esc(name)}</span>
          <button class="icon-btn" type="button" data-action="open-local" aria-label="打开本地文件" title="打开文件">${icon('external')}</button>
        </div>`;
    }
    if (!note.url && note.kind === 'memo' && !force) {
      return `<button class="add-url-btn" type="button" data-action="add-url">${icon('link')}添加链接</button>`;
    }
    const fav = `<span class="url-fallback">${icon('globe')}</span>`;
    return `
      <div class="url-line">
        <span class="url-favicon" id="urlFavicon">${fav}</span>
        <input class="url-input" id="urlInput" type="text" spellcheck="false" autocomplete="off"
          value="${esc(note.url || '')}" placeholder="粘贴网址…" aria-label="网址">
        ${note.url ? `<button class="icon-btn" type="button" data-action="open-url" aria-label="在浏览器中打开" title="打开">${icon('external')}</button>` : ''}
        ${note.url ? `<button class="icon-btn" type="button" data-action="copy-url" aria-label="复制网址" title="复制链接">${icon('copy')}</button>` : ''}
      </div>`;
  }

  function localFileName(path) {
    return String(path || '').split(/[\\/]/).pop() || '';
  }

  function mediaHTML(note) {
    if (!note.mediaType || !note.url) return '';
    if (note.mediaType === 'image') {
      return `<figure class="note-media">
        <img src="${esc(note.url)}" alt="${esc(note.title || '图片')}" loading="eager" referrerpolicy="no-referrer">
      </figure>`;
    }
    if (note.mediaType === 'audio' && note.local) {
      return `<div class="note-file">
        ${icon('audio')}
        <div class="note-file-meta">
          <strong>${esc(note.title || '本地音频')}</strong>
          <span>${esc(localFileName(note.localPath) || '本地副本')}</span>
        </div>
        <button class="btn sm" type="button" data-action="open-local">打开文件</button>
      </div>`;
    }
    if (note.mediaType === 'audio') {
      return `<div class="note-audio">
        <div class="note-audio-label">${icon('audio')}音频</div>
        <audio controls preload="metadata" src="${esc(note.url)}"></audio>
      </div>`;
    }
    if (note.mediaType === 'file') {
      return `<div class="note-file">
        ${icon('note')}
        <div class="note-file-meta">
          <strong>${esc(note.title || '本地文件')}</strong>
          <span>${esc(localFileName(note.localPath) || '本地副本')}</span>
        </div>
        <button class="btn sm" type="button" data-action="open-local">打开文件</button>
      </div>`;
    }
    return '';
  }

  function passwordStrength(pw) {
    const value = String(pw || '');
    let pool = 0;
    if (/[a-z]/.test(value)) pool += 26;
    if (/[A-Z]/.test(value)) pool += 26;
    if (/[0-9]/.test(value)) pool += 10;
    if (/[^A-Za-z0-9]/.test(value)) pool += 30;
    const entropy = value ? value.length * Math.log2(pool || 1) : 0;
    let level = 0;
    let label = '未填写';
    if (value) {
      if (entropy < 30) { level = 1; label = '偏弱'; }
      else if (entropy < 50) { level = 2; label = '一般'; }
      else if (entropy < 75) { level = 3; label = '良好'; }
      else { level = 4; label = '很强'; }
    }
    return { level, label, entropy, length: value.length };
  }

  function strengthHTML(pw) {
    const s = passwordStrength(pw);
    return `
      <div class="strength-row">
        <div class="strength-bars">
          ${[1, 2, 3, 4].map((i) => `<span class="strength-bar ${i <= s.level ? 'on-' + s.level : ''}"></span>`).join('')}
        </div>
        <span class="strength-label">${s.label}</span>
        <span class="strength-note">${s.length ? s.length + ' 位' : ''}</span>
      </div>`;
  }

  function secretCardHTML(note) {
    const reveal = state.ui.revealPasswordId === note.id;
    const reuse = reusedPasswordCount(note);
    const reuseHTML = `<div id="reuseWrap" class="reuse-line"${reuse ? '' : ' hidden'}>${icon('shield')}这个密码还用在另外 ${reuse} 个账号</div>`;
    return `
      <div class="secret-card">
        <div class="secret-row">
          <span class="secret-label">账号</span>
          <input class="secret-value" id="secretUser" type="text" spellcheck="false" autocomplete="off"
            value="${esc(note.username || '')}" placeholder="用户名或邮箱">
          <div class="secret-actions">
            <button class="icon-btn" type="button" data-action="copy-username" aria-label="复制账号" title="复制">${icon('copy')}</button>
          </div>
        </div>
        <div class="secret-row">
          <span class="secret-label">密码</span>
          <input class="secret-value mono" id="secretPass" type="${reveal ? 'text' : 'password'}" spellcheck="false" autocomplete="new-password"
            value="${esc(note.password || '')}" placeholder="密码">
          <div class="secret-actions">
            <button class="icon-btn" type="button" data-action="reveal-password" aria-label="${reveal ? '隐藏密码' : '显示密码'}" title="${reveal ? '隐藏' : '显示'}">${icon(reveal ? 'eyeOff' : 'eye')}</button>
            <button class="icon-btn" type="button" data-action="copy-password" aria-label="复制密码" title="复制密码">${icon('copy')}</button>
            <button class="icon-btn" type="button" data-action="generate-password" aria-label="生成随机密码" title="生成随机密码">${icon('dice')}</button>
          </div>
        </div>
        <div id="strengthWrap">${strengthHTML(note.password)}</div>
        ${reuseHTML}
      </div>`;
  }

  function reusedPasswordCount(note) {
    if (!note || !note.password) return 0;
    return state.notes.filter((n) =>
      n.id !== note.id &&
      !n.deletedAt &&
      n.kind === 'password' &&
      n.password === note.password
    ).length;
  }

  function fishDoodle() {
    return `<svg viewBox="0 0 72 52" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M14 26c7-8.6 17-11.7 26-8.8 6 2 10 5.1 13 8.8-3 3.7-7 6.8-13 8.8-9 2.9-19-.2-26-8.8Z"/>
      <path d="M15 26 6 17.5v17L15 26Z"/>
      <circle cx="43.5" cy="22.7" r="1.25" fill="currentColor" stroke="none"/>
      <path d="M34 17.4c2.6 2.8 4 5.7 4 9.2" opacity=".4"/>
    </svg>`;
  }

  function welcomeHTML() {
    return `
      <div class="welcome">
        <div class="welcome-inner">
          <div class="fish-doodle" aria-hidden="true">${fishDoodle()}</div>
          <h2>先记一条。</h2>
          <p>拖小锁、贴网址，或者随便写点什么。</p>
          <button class="btn primary" type="button" data-action="capture">记一条</button>
          <div class="welcome-links">
            <button type="button" data-action="paste-capture">粘贴</button>
            <span class="dot">·</span>
            <button type="button" data-action="import-bookmarks">导入书签</button>
            <span class="dot">·</span>
            <button type="button" data-action="show-shortcuts">快捷键</button>
          </div>
        </div>
      </div>`;
  }

  function noSelectionHTML() {
    return `
      <div class="no-results">
        <strong>没找到。</strong>
        <span>换个词试试。</span>
        <button class="btn sm" data-action="clear-search">清除搜索</button>
      </div>`;
  }

  function pickOneHTML() {
    return `
      <div class="no-results">
        <strong>选一条。</strong>
        <span>从左边挑一条，或者再记一条。</span>
      </div>`;
  }

  function trashEmptyHTML() {
    return `
      <div class="no-results">
        <strong>纸篓空的。</strong>
        <span>删掉的东西会先来这里。</span>
      </div>`;
  }

  function trashDetailHTML(note) {
    return `
      <div class="detail-toolbar">
        <button class="icon-btn back-btn" type="button" data-action="back" aria-label="返回列表">${icon('back')}</button>
        <div class="tool-group">
          <button class="icon-btn" type="button" data-action="restore-note" title="恢复" aria-label="恢复">${icon('restore')}</button>
          <button class="icon-btn" type="button" data-action="purge-note" title="彻底删除" aria-label="彻底删除">${icon('trash')}</button>
        </div>
      </div>
      <div class="detail-scroll">
        <div class="trash-banner">${icon('trash')}在纸篓里</div>
        <h1 class="title-static">${esc(note.title || '没名字')}</h1>
        ${note.url ? `<div class="url-line static"><span class="url-favicon">${icon('globe')}</span><span class="url-static">${esc(prettyUrl(note.url))}</span></div>` : ''}
        <div class="plain-body">${esc(note.body || '（空）')}</div>
        <div class="trash-actions">
          <button class="btn primary" type="button" data-action="restore-note">恢复</button>
          <button class="btn danger" type="button" data-action="purge-note">彻底删除</button>
        </div>
        <div class="detail-foot"><span>${esc(shortDate(note.createdAt))}</span></div>
      </div>`;
  }

  function renderDetail(options = {}) {
    const pane = $('#detailPane');
    if (!pane) return;
    const note = currentNote();

    if (!note) {
      if (state.query) pane.innerHTML = noSelectionHTML();
      else if (state.filter.type === 'trash') pane.innerHTML = trashEmptyHTML();
      else if (filterCount()) pane.innerHTML = pickOneHTML();
      else pane.innerHTML = welcomeHTML();
      return;
    }
    if (note.deletedAt) {
      pane.innerHTML = trashDetailHTML(note);
      return;
    }

    const kind = note.kind;
    pane.innerHTML = `
      <div class="detail-toolbar">
        <button class="icon-btn back-btn" type="button" data-action="back" aria-label="返回列表">${icon('back')}</button>
        <div class="tool-group">
          <button class="icon-btn ${note.pinned ? 'active' : ''}" type="button" data-action="pin-note" title="${note.pinned ? '取消置顶' : '置顶'}" aria-label="${note.pinned ? '取消置顶' : '置顶'}">${icon(note.pinned ? 'pinFill' : 'pin')}</button>
          ${note.url ? `<button class="icon-btn" type="button" data-action="open-url" title="打开" aria-label="打开网址">${icon('external')}</button>` : ''}
          <button class="icon-btn" type="button" data-action="delete-note" title="删掉" aria-label="移到纸篓">${icon('trash')}</button>
        </div>
      </div>
      <div class="detail-scroll">
        <textarea class="detail-title" id="detailTitle" rows="1" spellcheck="false"
          placeholder="没名字" aria-label="标题">${esc(note.title)}</textarea>

        ${urlLineHTML(note)}

        ${mediaHTML(note)}

        <div class="detail-meta-line" id="detailTags">${tagRowHTML(note)}</div>

        ${kind === 'password' ? secretCardHTML(note) : ''}

        <div class="body-wrap">
          <textarea class="detail-body" id="detailBody" spellcheck="false"
            placeholder="写点什么。">${esc(note.body)}</textarea>
        </div>

        <div class="detail-foot">
          <span>${esc(shortDate(note.createdAt))}</span>
          <span class="foot-spacer"></span>
          <button class="foot-link" type="button" data-action="copy-all">复制</button>
        </div>
      </div>`;

    autoGrow($('#detailTitle'));
    autoGrow($('#detailBody'));

    if (options.focusTag) {
      openTagEditor(true);
    } else if (options.focusBody) {
      const body = $('#detailBody');
      if (body) { body.focus(); const len = body.value.length; body.setSelectionRange(len, len); }
    }
  }

  function autoGrow(el) {
    if (!el) return;
    el.style.height = 'auto';
    const min = el.id === 'detailTitle' ? 34
      : el.id === 'diaryTitle' ? 42
      : el.id === 'diaryBody' ? 260
      : el.id === 'noteTitle' ? 42
      : el.id === 'noteBody' ? 280
      : el.id === 'planTitle' ? 46
      : el.id === 'planBody' ? 420
      : 120;
    el.style.height = Math.max(el.scrollHeight, min) + 'px';
  }

  function scheduleListRefresh() {
    if (!scheduleListRefresh.timer) scheduleListRefresh.timer = null;
    clearTimeout(scheduleListRefresh.timer);
    scheduleListRefresh.timer = setTimeout(() => renderList(), 280);
  }

  function selectNote(id, opts = {}) {
    state.selectedId = id;
    state.settings.lastSelectedId = id;
    saveSettings();
    renderList();
    renderDetail();
    const pane = $('#detailPane');
    if (pane) pane.scrollTop = 0;
    if (window.innerWidth <= 760 && opts.openMobile !== false) {
      $('#app').classList.add('show-detail');
    }
    closeFilterPanel();
  }

  function backToList() {
    $('#app').classList.remove('show-detail');
    const item = $('.note-item.active');
    if (item) item.focus();
  }

  function openTagEditor(focus = true) {
    const row = $('#detailTags');
    if (!row) return;
    const existing = $('#tagInlineInput');
    if (existing) { existing.focus(); return; }
    const wrap = document.createElement('span');
    wrap.className = 'tag-chip';
    wrap.style.padding = '0';
    wrap.style.background = 'transparent';
    wrap.style.border = '0';
    wrap.innerHTML = `<input class="tag-input" id="tagInlineInput" type="text" maxlength="24" placeholder="标签，回车添加" autocomplete="off">`;
    row.appendChild(wrap);
    const input = $('#tagInlineInput');
    if (focus) input.focus();
    input.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
        e.preventDefault();
        const tag = input.value.trim().replace(/^#/, '');
        if (tag) addTagToCurrent(tag);
        else input.value = '';
      } else if (e.key === 'Escape') {
        e.preventDefault();
        wrap.remove();
      }
    });
    input.addEventListener('blur', () => {
      setTimeout(() => { if (wrap.isConnected && document.activeElement !== input) wrap.remove(); }, 120);
    });
  }

  function addTagToCurrent(tag) {
    const note = currentNote();
    if (!note) return;
    const clean = String(tag).trim().replace(/^#/, '').slice(0, 24);
    if (!clean) return;
    if (!note.tags.includes(clean)) {
      note.tags = uniqueTags([...note.tags, clean]);
      note.updatedAt = Date.now();
      scheduleSave();
      renderChrome();
      scheduleListRefresh();
      renderDetail({ focusTag: true });
      const input = $('#tagInlineInput');
      if (input) input.focus();
    } else {
      const input = $('#tagInlineInput');
      if (input) { input.value = ''; input.focus(); }
      toast('这个标签有了');
    }
  }

  function removeTagFromCurrent(tag) {
    const note = currentNote();
    if (!note) return;
    note.tags = note.tags.filter((t) => t !== tag);
    note.updatedAt = Date.now();
    scheduleSave();
    renderChrome();
    scheduleListRefresh();
    renderDetail({ focusTag: true });
  }

  function updateNoteFromDom(target) {
    const note = currentNote();
    if (!note) return;
    if (target.id === 'detailTitle') {
      note.title = target.value.slice(0, 300);
    } else if (target.id === 'detailBody') {
      note.body = target.value;
      const wc = $('#wordCount');
      if (wc) wc.textContent = wordCount(note.body + note.title) + ' 字';
    } else if (target.id === 'secretUser') {
      note.username = target.value.slice(0, 300);
    } else if (target.id === 'secretPass') {
      note.password = target.value.slice(0, 500);
      const wrap = $('#strengthWrap');
      if (wrap) wrap.innerHTML = strengthHTML(note.password);
      const reuse = $('#reuseWrap');
      if (reuse) {
        const count = reusedPasswordCount(note);
        reuse.hidden = count === 0;
        reuse.innerHTML = `${icon('shield')}这个密码还用在另外 ${count} 个账号`;
      }
    } else if (target.id === 'urlInput') {
      return;
    }
    note.updatedAt = Date.now();
    scheduleSave();
    scheduleListRefresh();
  }

  function commitUrlField(input) {
    const note = currentNote();
    if (!note) return;
    const raw = input.value.trim();
    if (!raw) {
      note.url = '';
      note.domain = '';
      note.updatedAt = Date.now();
      scheduleSave();
      scheduleListRefresh();
      return;
    }
    const url = normalizeUrl(raw);
    if (!url) {
      toast('这个网址看起来不完整');
      input.value = note.url || '';
      return;
    }
    if (url !== note.url) {
      note.url = url;
      note.domain = domainOf(url);
      note.updatedAt = Date.now();
      scheduleSave();
      scheduleListRefresh();
      input.value = url;
    }
  }

  /* ---------- 10. List / nav events ---------- */
  function setFilter(type, tag = null) {
    state.filter = { ...makeFilter(), type, tag };
    state.selectedId = null;
    state.query = '';
    const search = $('#searchInput');
    if (search) search.value = '';
    updateSearchClear();
    closeFilterPanel();
    renderChrome();
    renderList(true);
    renderDetail();
  }

  function applyFilter(patch = {}) {
    state.filter = { ...state.filter, ...patch };
    state.selectedId = null;
    renderChrome();
    renderList(true);
    renderDetail();
    syncFilterPanel();
  }

  function clearFilterKey(key) {
    if (key === 'type') { applyFilter({ type: 'all' }); return; }
    if (key === 'tag') { applyFilter({ tag: null }); return; }
    if (key === 'days') { applyFilter({ days: 0 }); return; }
    if (key === 'pinned' || key === 'attachments') applyFilter({ [key]: false });
  }

  function resetFilter() {
    state.filter = makeFilter();
    state.selectedId = null;
    renderChrome();
    renderList(true);
    renderDetail();
    if (state.ui.filterOpen) syncFilterPanel();
  }

  function resetView() {
    if (state.ui.space !== 'memo') setSpace('memo', { silent: true });
    state.query = '';
    const search = $('#searchInput');
    if (search) search.value = '';
    updateSearchClear();
    resetFilter();
    closeFilterPanel();
    $('#app').classList.remove('show-detail');
  }

  function updateSearchClear() {
    const clear = $('#searchClear');
    if (clear) clear.hidden = !($('#searchInput') && $('#searchInput').value);
  }

  function onListClick(e) {
    const item = e.target.closest('.note-item');
    if (item) {
      const id = item.dataset.id;
      if (id) selectNote(id);
      return;
    }
    const action = e.target.closest('[data-action]');
    if (action) {
      if (action.dataset.action === 'clear-search') {
        clearSearch();
      } else if (action.dataset.action === 'reset-filter') {
        resetFilter();
      }
    }
  }

  function onListKeydown(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const item = e.target.closest('.note-item');
    if (!item) return;
    e.preventDefault();
    selectNote(item.dataset.id);
  }

  function clearSearch() {
    const input = $('#searchInput');
    if (input) input.value = '';
    state.query = '';
    updateSearchClear();
    renderList(true);
    if (!currentNote()) renderDetail();
  }

  function focusSearch() {
    if (state.ui.space !== 'memo') setSpace('memo', { silent: true });
    const input = $('#searchInput');
    if (!input) return;
    input.focus();
    input.select();
  }

  function moveSelection(direction) {
    const notes = visibleNotes();
    if (!notes.length) return;
    let index = notes.findIndex((n) => n.id === state.selectedId);
    if (index < 0) index = direction > 0 ? -1 : 0;
    index = (index + direction + notes.length) % notes.length;
    selectNote(notes[index].id);
    const item = $(`.note-item[data-id="${notes[index].id}"]`);
    if (item) item.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- 11. Toasts ---------- */
  function toast(message, opts = {}) {
    const root = $('#toastRoot');
    if (!root) return;
    const node = document.createElement('div');
    node.className = 'toast';
    node.innerHTML = `
      <span class="t-icon">${icon(opts.icon || 'check')}</span>
      <span class="t-msg"></span>
      ${opts.actionLabel ? '<button class="t-action" type="button"></button>' : ''}
      <button class="t-close" type="button" aria-label="关闭提示">${icon('x')}</button>`;
    $('.t-msg', node).textContent = message;
    if (opts.actionLabel) {
      const action = $('.t-action', node);
      action.textContent = opts.actionLabel;
      action.addEventListener('click', () => {
        try { opts.onAction && opts.onAction(); } catch (err) { console.error(err); }
        dismiss();
      });
    }
    function dismiss() {
      if (!node.isConnected) return;
      node.classList.add('leaving');
      setTimeout(() => node.remove(), 200);
    }
    $('.t-close', node).addEventListener('click', dismiss);
    root.appendChild(node);
    while (root.children.length > 3) root.firstElementChild.remove();
    setTimeout(dismiss, opts.duration || 3400);
  }

  /* ---------- 12. Clipboard / password / external ---------- */
  async function copyText(value, message = '已复制') {
    const text = String(value == null ? '' : value);
    if (!text) { toast('这里还是空的'); return false; }
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        ta.remove();
      } catch { ok = false; }
    }
    toast(ok ? message : '复制失败，请手动选中', { icon: ok ? 'check' : 'shield' });
    return ok;
  }

  function openExternal(url) {
    if (!/^https?:\/\//i.test(url || '')) return;
    if (IS_NATIVE) sendNative({ type: 'open-external', url });
    else window.open(url, '_blank', 'noopener,noreferrer');
  }

  function editableSelection(field) {
    const value = String(field.value == null ? '' : field.value);
    const start = typeof field.selectionStart === 'number' ? field.selectionStart : value.length;
    const end = typeof field.selectionEnd === 'number' ? field.selectionEnd : start;
    return { value, start, end, selected: value.slice(start, end) };
  }

  async function copyEditable(field, cut = false) {
    const { value, start, end, selected } = editableSelection(field);
    const text = selected || value;
    if (!text) { toast('这里还是空的'); return; }
    if (cut && !selected) { toast('先选中要剪切的文字'); return; }
    const ok = await copyText(text, cut ? '已剪切' : '已复制');
    if (ok && cut) {
      field.focus();
      field.setRangeText('', start, end, 'end');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  async function pasteIntoEditable(field) {
    const text = await readClipboardText();
    if (!text) { toast('剪贴板是空的，或系统不允许读取'); return; }
    field.focus();
    const { start, end } = editableSelection(field);
    field.setRangeText(text, start, end, 'end');
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function editableContextItems(field) {
    const { value, selected } = editableSelection(field);
    const readOnly = field.readOnly || field.disabled;
    return [
      selected ? { label: '剪切', icon: 'scissors', action: () => copyEditable(field, true) } : null,
      { label: '复制', icon: 'copy', action: () => copyEditable(field, false), disabled: !value },
      readOnly ? null : { label: '粘贴', icon: 'clip', action: () => pasteIntoEditable(field) },
      { label: '全选', icon: 'check', action: () => { field.focus(); field.select(); }, disabled: !value },
      { separator: true },
      { label: '清空', icon: 'trash', danger: true, disabled: readOnly || !value, action: () => {
        field.focus();
        field.select();
        field.setRangeText('', 0, value.length, 'end');
        field.dispatchEvent(new Event('input', { bubbles: true }));
      } }
    ].filter(Boolean);
  }

  function genericContextMenuItems() {
    if (state.ui.overlay || state.crypto.locked) return [];
    const items = [];
    const selection = String(window.getSelection()?.toString() || '').trim();
    if (selection) {
      items.push({ label: '复制选中', icon: 'copy', action: () => copyText(selection) });
      items.push({ separator: true });
    }
    const space = state.ui.space;
    if (space === 'memo') {
      items.push({ label: '新建备忘', icon: 'plus', action: () => { setSpace('memo'); openCapture(); } });
    } else if (space === 'diary') {
      items.push({ label: '写今天', icon: 'book', action: () => { setSpace('diary'); diaryToday(); } });
    } else if (space === 'notes') {
      items.push({ label: '新建笔记', icon: 'plus', action: () => { setSpace('notes'); newNote(); } });
    } else if (space === 'plan') {
      items.push({ label: '新建计划', icon: 'plus', action: () => { setSpace('plan'); newPlan(); } });
    } else if (space === 'schedule') {
      items.push({ label: '新建日程', icon: 'plus', action: () => openScheduleEditor({ date: state.schedule.anchor || dayStamp() }) });
    }
    if (items.length) items.push({ separator: true });
    items.push({ label: '设置', icon: 'settings', action: () => openSettings() });
    return items.filter(Boolean);
  }

  function openLocalFile(note) {
    if (!note || !note.localPath) {
      toast('找不到这个文件');
      return;
    }
    if (IS_NATIVE) sendNative({ type: 'open-file', path: note.localPath });
    else toast('在桌面版里才能打开本地文件');
  }

  function createNoteFromExternal(payload) {
    if (state.crypto.locked) return { ok: false, error: 'locked' };
    const raw = payload && typeof payload === 'object' ? payload : {};
    const hasUrl = !!normalizeUrl(raw.url || '');
    const kind = raw.kind === 'password'
      ? 'password'
      : raw.kind === 'memo' || (!hasUrl && raw.body && !raw.username) ? 'memo' : 'site';
    let title = String(raw.title == null ? '' : raw.title).trim();
    if (!title && raw.localPath) title = localFileName(raw.localPath);
    if (!title && kind === 'memo') title = clipText(firstLine(raw.body || ''), 60);
    const note = makeNote({
      kind,
      title,
      url: raw.url || '',
      body: raw.body || '',
      username: raw.username || '',
      password: raw.password || '',
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      pinned: !!raw.pinned,
      mediaType: raw.mediaType || '',
      sourceUrl: raw.sourceUrl || '',
      localPath: raw.localPath || '',
      local: !!raw.local
    });
    if (!note) return { ok: false, error: 'invalid' };

    state.notes.unshift(note);
    state.selectedId = note.id;
    state.settings.lastSelectedId = note.id;
    state.filter = makeFilter();
    state.query = '';
    const search = $('#searchInput');
    if (search) search.value = '';
    setSpace('memo', { silent: true });
    saveSettings();
    persist();
    renderChrome();
    renderList(true);
    renderDetail();
    const label = note.mediaType === 'image' ? '图片收好了'
      : note.mediaType === 'audio' ? '音频收好了'
      : note.mediaType === 'file' ? '文件收好了' : '收好了';
    toast(label);
    return { ok: true, id: note.id };
  }

  function generatePassword(length = 20) {
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '23456789';
    const symbols = '!@#$%^&*-_=+';
    const all = lower + upper + digits + symbols;
    const pick = (set) => set[Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 * set.length)];
    const chars = [pick(lower), pick(upper), pick(digits), pick(symbols)];
    while (chars.length < length) chars.push(pick(all));
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }

  /* ---------- 13. Capture ---------- */
  function makeNote(partial) {
    const now = Date.now();
    const url = normalizeUrl(partial.url || '');
    return hydrateNote({
      id: uid(),
      kind: partial.kind || 'site',
      title: partial.title || '',
      url,
      domain: domainOf(url),
      body: partial.body || '',
      username: partial.username || '',
      password: partial.password || '',
      tags: partial.tags || [],
      pinned: !!partial.pinned,
      demo: false,
      mediaType: partial.mediaType || '',
      sourceUrl: partial.sourceUrl || '',
      localPath: partial.localPath || '',
      local: !!partial.local,
      createdAt: now,
      updatedAt: now
    });
  }

  function openCapture(options = {}) {
    if (state.crypto.locked) {
      toast('页库已上锁，请先解锁');
      showLock();
      return;
    }
    if (state.ui.space !== 'memo') setSpace('memo', { silent: true });
    closeFilterPanel();
    if (state.ui.overlay) {
      if (state.ui.overlay.kind === 'capture') {
        const input = $('#capUrl') || $('#capTitle');
        if (input) input.focus();
        return;
      }
      closeOverlay();
    }

    const initialUrls = (options.urls && options.urls.length ? options.urls : (options.url ? [options.url] : []))
      .map(normalizeUrl).filter(Boolean).slice(0, 60);
    const cap = {
      urls: initialUrls,
      title: options.title || '',
      kind: options.kind || (initialUrls.length ? 'site' : (options.text ? 'memo' : 'site')),
      tags: '',
      body: options.text || '',
      username: '',
      password: '',
      reveal: false
    };
    if (!cap.title && options.text && !initialUrls.length) {
      cap.title = clipText(firstLine(options.text), 60);
      cap.kind = 'memo';
    }
    if (cap.urls.length > 1) cap.kind = 'site';

    const sheet = `
      <div class="sheet-head">
        <div class="sheet-title"><h3>记一条</h3></div>
        <button class="icon-btn" type="button" data-action="close" aria-label="关闭">${icon('x')}</button>
      </div>
      <div class="sheet-body" id="capBody"></div>
      <div class="sheet-foot">
        <span class="foot-hint"><kbd>${MOD}</kbd><kbd>↵</kbd> 记下</span>
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-action="cancel">取消</button>
        <button class="btn primary" type="button" data-action="save">记下</button>
      </div>`;

    const mounted = mountOverlay(`<div class="sheet capture-sheet" role="dialog" aria-modal="true" aria-label="记一条">${sheet}</div>`, {
      kind: 'capture',
      onClose: () => { state.ui.captureOpen = false; }
    });
    state.ui.captureOpen = true;
    const sheetEl = $('.capture-sheet', mounted.overlay);
    const bodyEl = $('#capBody', mounted.overlay);

    function renderCap() {
      const batch = cap.urls.length > 1;
      bodyEl.innerHTML = `
        <div class="types" role="tablist" aria-label="记录类型">
          ${[['site', '网站'], ['password', '密码'], ['memo', '备忘']].map(([kind, label]) => `
            <button class="type-btn ${cap.kind === kind ? 'active' : ''}" type="button" role="tab" aria-selected="${cap.kind === kind}" data-kind="${kind}">${label}</button>`).join('')}
        </div>

        ${batch ? `
          <div class="batch-note">${icon('globe')}${cap.urls.length} 个链接
            <button class="icon-btn tiny" type="button" data-action="clear-batch" aria-label="清空链接" style="margin-left:auto">${icon('x')}</button>
          </div>` : `
          <div class="field">
            <div class="input-group">
              <input class="input input-lg" id="capUrl" type="text" spellcheck="false" autocomplete="off"
                value="${esc(cap.urls[0] || '')}" placeholder="${cap.kind === 'site' ? '粘贴网址，或拖入小锁' : '链接，可不填'}">
              <button class="icon-btn" type="button" data-action="paste-url" aria-label="粘贴" title="粘贴">${icon('clip')}</button>
            </div>
          </div>`}

        ${batch ? '' : `
          <div class="field">
            <input class="input" id="capTitle" type="text" maxlength="300" autocomplete="off"
              value="${esc(cap.title)}" placeholder="标题" aria-label="标题">
          </div>`}

        ${cap.kind === 'password' && !batch ? `
          <div class="password-fields">
            <div class="password-row">
              <span class="p-label">账号</span>
              <input class="p-input" id="capUser" type="text" autocomplete="off" value="${esc(cap.username)}" placeholder="用户名或邮箱">
            </div>
            <div class="password-row">
              <span class="p-label">密码</span>
              <input class="p-input mono" id="capPass" type="${cap.reveal ? 'text' : 'password'}" autocomplete="new-password" value="${esc(cap.password)}" placeholder="密码">
              <button class="icon-btn" type="button" data-action="cap-reveal" aria-label="${cap.reveal ? '隐藏' : '显示'}密码">${icon(cap.reveal ? 'eyeOff' : 'eye')}</button>
              <button class="icon-btn" type="button" data-action="cap-generate" aria-label="生成密码">${icon('dice')}</button>
            </div>
          </div>` : ''}

        <div class="field">
          <input class="input" id="capTags" type="text" autocomplete="off" value="${esc(cap.tags)}" placeholder="标签，用逗号分隔" aria-label="标签">
        </div>

        <div class="field">
          <textarea class="input" id="capNote" placeholder="备注" aria-label="备注">${esc(cap.body)}</textarea>
        </div>`;

      if (cap.urls.length === 0 && !batch) {
        setTimeout(() => {
          const input = $('#capUrl');
          if (input && !cap.title) input.focus();
        }, 30);
      } else if (!batch) {
        setTimeout(() => {
          const title = $('#capTitle');
          if (title && !options._focused) { title.focus(); options._focused = true; }
        }, 30);
      }
      bindCapInputs();
    }

    function bindCapInputs() {
      const capUrl = $('#capUrl');
      if (capUrl) {
        capUrl.addEventListener('input', () => {
          cap.urls = capUrl.value.trim() ? [capUrl.value.trim()] : [];
          const hint = $('#capTitle');
          if (hint && !cap.title) hint.placeholder = capUrl.value.trim() ? domainOf(normalizeUrl(capUrl.value)) || '给这一页起个名字' : '给这一页起个名字';
        });
        capUrl.addEventListener('blur', () => {
          const normalized = normalizeUrl(capUrl.value);
          if (normalized) { capUrl.value = normalized; cap.urls = [normalized]; }
        });
        capUrl.addEventListener('paste', (e) => {
          const text = (e.clipboardData || window.clipboardData).getData('text');
          const urls = extractUrls(text);
          if (urls.length > 1) {
            e.preventDefault();
            cap.urls = urls;
            cap.kind = 'site';
            renderCap();
          }
        });
      }
      const title = $('#capTitle');
      if (title) title.addEventListener('input', () => { cap.title = title.value; });
      const tags = $('#capTags');
      if (tags) tags.addEventListener('input', () => { cap.tags = tags.value; });
      const note = $('#capNote');
      if (note) note.addEventListener('input', () => { cap.body = note.value; });
      const user = $('#capUser');
      if (user) user.addEventListener('input', () => { cap.username = user.value; });
      const pass = $('#capPass');
      if (pass) pass.addEventListener('input', () => { cap.password = pass.value; });
    }

    function collectCap() {
      const capUrl = $('#capUrl');
      if (capUrl && capUrl.value.trim()) {
        const normalized = normalizeUrl(capUrl.value);
        cap.urls = normalized ? [normalized] : [];
      }
      const title = $('#capTitle');
      if (title) cap.title = title.value;
      const tags = $('#capTags');
      if (tags) cap.tags = tags.value;
      const note = $('#capNote');
      if (note) cap.body = note.value;
      const user = $('#capUser');
      if (user) cap.username = user.value;
      const pass = $('#capPass');
      if (pass) cap.password = pass.value;
    }

    async function saveCapture() {
      collectCap();
      const tags = parseTagInput(cap.tags);
      const created = [];

      if (cap.urls.length > 1) {
        for (const url of cap.urls) {
          const n = makeNote({
            kind: 'site', title: domainOf(url), url, body: cap.body, tags
          });
          if (n) created.push(n);
        }
      } else {
        let url = normalizeUrl(cap.urls[0] || '');
        if (cap.kind === 'site' && !url) {
          toast('先放个网址');
          const input = $('#capUrl');
          if (input) input.focus();
          return;
        }
        if (cap.kind !== 'site' && !url && cap.urls[0]) {
          toast('这个网址不完整');
          return;
        }
        const fallback = url ? domainOf(url) : (cap.kind === 'password' ? '账号' : '备忘');
        const title = (cap.title || '').trim() || fallback;
        const n = makeNote({
          kind: cap.kind,
          title,
          url,
          body: cap.body,
          tags,
          username: cap.kind === 'password' ? cap.username : '',
          password: cap.kind === 'password' ? cap.password : ''
        });
        if (n) created.push(n);
      }

      if (!created.length) { toast('还没写东西'); return; }
      state.notes.unshift(...created);
      state.filter = makeFilter();
      state.query = '';
      const search = $('#searchInput');
      if (search) search.value = '';
      updateSearchClear();
      state.selectedId = created[0].id;
      state.settings.lastSelectedId = created[0].id;
      saveSettings();
      scheduleSave(10);
      renderChrome();
      renderList(true);
      renderDetail();
      mounted.close();
      toast(created.length > 1 ? `记下 ${created.length} 个链接` : '记下了', {
        actionLabel: '撤销',
        duration: 5200,
        onAction: () => {
          const ids = new Set(created.map((n) => n.id));
          state.notes = state.notes.filter((n) => !ids.has(n.id));
          if (ids.has(state.selectedId)) state.selectedId = null;
          scheduleSave(10);
          renderChrome();
          renderList();
          renderDetail();
          toast('已撤销');
        }
      });
      if (window.innerWidth <= 760) $('#app').classList.remove('show-detail');
    }

    async function pasteIntoCapture() {
      const text = await readClipboardText();
      if (!text) { toast('剪贴板里没有读到文字'); return; }
      const urls = extractUrls(text);
      if (urls.length > 1) {
        cap.urls = urls;
        cap.kind = 'site';
        renderCap();
        toast(`识别到 ${urls.length} 个链接`);
      } else if (urls.length === 1) {
        cap.urls = [urls[0]];
        cap.kind = cap.kind === 'memo' ? 'site' : cap.kind;
        renderCap();
        toast('已填好');
      } else {
        cap.body = text;
        if (!cap.title) cap.title = clipText(firstLine(text), 60);
        renderCap();
        toast('记成备忘了');
      }
    }

    renderCap();

    if (options.fromClipboard) {
      setTimeout(() => pasteIntoCapture(), 180);
    }

    mounted.overlay.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]');
      if (action) {
        const name = action.dataset.action;
        if (name === 'close' || name === 'cancel') mounted.close();
        else if (name === 'save') saveCapture();
        else if (name === 'paste-url') pasteIntoCapture();
        else if (name === 'clear-batch') { cap.urls = []; renderCap(); }
        else if (name === 'cap-reveal') { cap.reveal = !cap.reveal; renderCap(); setTimeout(() => $('#capPass')?.focus(), 30); }
        else if (name === 'cap-generate') { cap.password = generatePassword(); cap.reveal = true; renderCap(); setTimeout(() => $('#capPass')?.focus(), 30); toast('已生成 20 位密码'); }
        return;
      }
      const kindBtn = e.target.closest('[data-kind]');
      if (kindBtn) {
        cap.kind = kindBtn.dataset.kind;
        renderCap();
      }
    });

    mounted.overlay.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        saveCapture();
      }
    });

    mounted.overlay.addEventListener('dragover', (e) => {
      e.preventDefault();
      sheetEl.classList.add('dragging');
    });
    mounted.overlay.addEventListener('dragleave', (e) => {
      if (e.target === mounted.overlay) sheetEl.classList.remove('dragging');
    });
    mounted.overlay.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      sheetEl.classList.remove('dragging');
      handleDropData(e.dataTransfer, { intoCapture: true, cap, renderCap, mounted });
    });
  }

  /* ---------- 14. Overlay shell ---------- */
  function mountOverlay(innerHTML, opts = {}) {
    closeContextMenu();
    closeOverlay();
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = innerHTML;
    $('#overlayRoot').appendChild(overlay);
    const prevFocus = document.activeElement;

    const api = {
      kind: opts.kind || '',
      el: overlay,
      overlay,
      close() {
        if (!overlay.isConnected) return;
        if (opts.onClose) opts.onClose();
        overlay.remove();
        if (state.ui.overlay === api) state.ui.overlay = null;
        if (prevFocus && prevFocus.isConnected && typeof prevFocus.focus === 'function') {
          try { prevFocus.focus(); } catch {}
        }
      }
    };

    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay && opts.dismissible !== false) api.close();
    });
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        api.close();
      } else if (e.key === 'Tab') {
        trapFocus(e, overlay);
      }
    });

    state.ui.overlay = api;
    const focusTarget = overlay.querySelector(opts.initialFocus || '[data-autofocus]');
    requestAnimationFrame(() => {
      if (focusTarget && focusTarget.isConnected) focusTarget.focus();
      else {
        const first = getFocusable(overlay)[0];
        if (first) first.focus();
      }
    });
    return api;
  }

  function closeOverlay() {
    if (state.ui.overlay) state.ui.overlay.close();
  }

  function getFocusable(root) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
      .filter((el) => el.offsetParent !== null || el === document.activeElement);
  }

  function trapFocus(e, root) {
    const items = getFocusable(root);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ---------- 15. Drop handling ---------- */
  let dragDepth = 0;
  let dropVeilTimer = null;

  function draggableData(dt) {
    if (!dt) return false;
    const types = Array.from(dt.types || []);
    return types.includes('text/uri-list') || types.includes('text/plain') || types.includes('text/html') || types.includes('Files');
  }

  function showDropVeil() {
    if (noteFolderDragId || state.ui.overlay || state.crypto.locked) return;
    const veil = $('#dropVeil');
    if (!veil) return;
    veil.hidden = false;
    document.body.classList.add('is-dragging');
  }

  function hideDropVeil() {
    const veil = $('#dropVeil');
    if (veil) veil.hidden = true;
    document.body.classList.remove('is-dragging');
    dragDepth = 0;
  }

  function bindDrop() {
    window.addEventListener('dragenter', (e) => {
      if (noteFolderDragId) { hideDropVeil(); return; }
      if (!draggableData(e.dataTransfer)) return;
      if (state.ui.overlay) return;
      e.preventDefault();
      dragDepth++;
      clearTimeout(dropVeilTimer);
      dropVeilTimer = setTimeout(showDropVeil, 40);
    });
    window.addEventListener('dragover', (e) => {
      if (noteFolderDragId) return;
      if (!draggableData(e.dataTransfer)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    });
    window.addEventListener('dragleave', (e) => {
      if (noteFolderDragId) return;
      if (!draggableData(e.dataTransfer)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0 || !e.relatedTarget) hideDropVeil();
    });
    window.addEventListener('drop', (e) => {
      if (noteFolderDragId) return;
      if (state.ui.overlay) return;
      if (isEditable(e.target)) return;
      if (!draggableData(e.dataTransfer)) return;
      e.preventDefault();
      hideDropVeil();
      handleDropData(e.dataTransfer);
    });
  }

  function handleDropData(dt, ctx = {}) {
    if (!dt) return;
    const files = Array.from(dt.files || []);
    if (files.length) {
      const file = files[0];
      if (/\.html?$/i.test(file.name)) {
        readFile(file).then(importBookmarksHTML);
      } else if (/\.json$/i.test(file.name)) {
        readFile(file).then(importJSON);
      } else {
        toast('支持网页链接、书签 HTML 或 JSON 备份');
      }
      return;
    }

    let text = '';
    try { text = dt.getData('text/uri-list') || dt.getData('text/plain') || ''; } catch {}
    let title = '';
    try {
      const html = dt.getData('text/html');
      if (html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const anchor = doc.querySelector('a[href]');
        if (anchor) {
          title = (anchor.textContent || '').trim().slice(0, 200);
          if (!text) text = anchor.getAttribute('href') || '';
        }
        if (!title) title = (doc.querySelector('title') || {}).textContent || '';
      }
    } catch {}

    const urls = extractUrls(text);
    if (urls.length) {
      if (ctx.intoCapture) {
        ctx.cap.urls = urls;
        ctx.cap.kind = 'site';
        if (title && urls.length === 1) ctx.cap.title = title;
        ctx.renderCap();
        toast(urls.length > 1 ? `识别到 ${urls.length} 个链接` : '链接已放好');
      } else {
        openCapture({ url: urls[0], urls, title });
      }
      return;
    }

    if (text.trim()) {
      if (ctx.intoCapture) {
        ctx.cap.body = text;
        if (!ctx.cap.title) ctx.cap.title = clipText(firstLine(text), 60);
        ctx.cap.kind = 'memo';
        ctx.renderCap();
      } else {
        openCapture({ text });
      }
      return;
    }

    if (title) {
      openCapture({ title });
    }
  }

  /* ---------- 16. Import / export ---------- */
  function readFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve('');
      reader.readAsText(file, 'utf-8');
    });
  }

  function triggerImport(mode) {
    state.ui.importMode = mode;
    const input = $('#fileInput');
    if (!input) return;
    input.accept = mode === 'bookmarks' ? '.html,text/html' : '.json,application/json';
    input.value = '';
    input.click();
  }

  function importBookmarksHTML(html) {
    if (!html) return;
    let doc;
    try { doc = new DOMParser().parseFromString(html, 'text/html'); }
    catch { toast('这个书签文件读不出来'); return; }
    const anchors = $$('a[href]', doc);
    const existing = new Set(state.notes.map((n) => (n.url || '').replace(/\/$/, '').toLowerCase()));
    const seen = new Set();
    const createdAt = Date.now();
    const created = [];
    let skipped = 0;

    for (const a of anchors) {
      if (created.length >= 800) break;
      const url = normalizeUrl(a.getAttribute('href'));
      if (!url) { skipped++; continue; }
      const key = url.replace(/\/$/, '').toLowerCase();
      if (existing.has(key) || seen.has(key)) { skipped++; continue; }
      seen.add(key);
      let folder = '';
      try {
        const dl = a.closest('dl');
        const h3 = dl && dl.previousElementSibling && dl.previousElementSibling.tagName === 'H3'
          ? dl.previousElementSibling : null;
        if (h3) folder = (h3.textContent || '').trim();
      } catch {}
      const title = (a.textContent || '').trim() || domainOf(url);
      const note = makeNote({
        kind: 'site',
        title,
        url,
        tags: folder && folder.length <= 20 && !/书签栏|Bookmarks bar|收藏夹/i.test(folder) ? [folder] : []
      });
      if (note) {
        note.createdAt = createdAt - created.length * 1000;
        note.updatedAt = note.createdAt;
        created.push(note);
      }
    }

    if (!created.length) {
      toast(skipped ? '没有新的网址，可能都已经收过了' : '没有在文件里找到网址');
      return;
    }
    state.notes.unshift(...created);
    state.selectedId = created[0].id;
    state.filter = makeFilter();
    scheduleSave(10);
    renderChrome();
    renderList(true);
    renderDetail();
    toast(`收入 ${created.length} 个网址${skipped ? `，跳过 ${skipped} 个` : ''}`, {
      actionLabel: '撤销', duration: 6000,
      onAction: () => {
        const ids = new Set(created.map((n) => n.id));
        state.notes = state.notes.filter((n) => !ids.has(n.id));
        if (ids.has(state.selectedId)) state.selectedId = null;
        scheduleSave(10);
        renderChrome(); renderList(); renderDetail();
      }
    });
  }

  function importNoteFolders(rawFolders) {
    const existingPaths = new Map();
    for (const { folder } of flattenNoteFolders()) {
      existingPaths.set(noteFolderPath(folder.id, '\u0000'), folder.id);
    }
    const rawById = new Map();
    for (const raw of rawFolders.slice(0, 2000)) {
      const folder = hydrateNoteFolder(raw);
      if (!folder || !folder.name) continue;
      if (rawById.has(folder.id)) folder.id = uid();
      rawById.set(folder.id, folder);
    }
    const depthOf = (folder) => {
      let depth = 0;
      let parentId = folder.parentId;
      const seen = new Set([folder.id]);
      while (parentId && rawById.has(parentId) && !seen.has(parentId)) {
        seen.add(parentId);
        depth++;
        parentId = rawById.get(parentId).parentId;
      }
      return depth;
    };
    const ordered = Array.from(rawById.values()).sort((a, b) => depthOf(a) - depthOf(b));
    const mapping = new Map();
    const createdFolders = [];
    for (const raw of ordered) {
      const parentId = raw.parentId && mapping.has(raw.parentId) ? mapping.get(raw.parentId) : null;
      const pathKey = (parentId ? noteFolderPath(parentId, '\u0000') + '\u0000' : '') + raw.name;
      const existingId = existingPaths.get(pathKey);
      if (existingId) {
        mapping.set(raw.id, existingId);
        continue;
      }
      const folder = {
        id: uid(),
        name: raw.name,
        parentId,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt
      };
      state.noteFolders.push(folder);
      createdFolders.push(folder);
      mapping.set(raw.id, folder.id);
      existingPaths.set(pathKey, folder.id);
    }
    return { mapping, createdFolders };
  }

  function importNoteItems(rawItems, folderMap) {
    const existingSignatures = new Set(state.noteItems.filter((item) => !item.deletedAt).map((item) => (
      (item.folderId || '') + '|' + item.title.trim() + '|' + item.reference.trim() + '|' + firstLine(item.body).slice(0, 80)
    )));
    const createdItems = [];
    for (const raw of rawItems.slice(0, 4000)) {
      const item = hydrateNoteItem(raw);
      if (!item) continue;
      if (item.folderId) item.folderId = folderMap.get(item.folderId) || null;
      const signature = (item.folderId || '') + '|' + item.title.trim() + '|' + item.reference.trim() + '|' + firstLine(item.body).slice(0, 80);
      if (existingSignatures.has(signature)) continue;
      existingSignatures.add(signature);
      item.id = uid();
      createdItems.push(item);
      if (createdItems.length >= 1000) break;
    }
    state.noteItems.push(...createdItems);
    return createdItems;
  }

  async function importJSON(text) {
    if (!text) return;
    let data;
    try { data = JSON.parse(text); } catch { toast('这个备份文件不是有效的 JSON'); return; }
    if (data && data.enc) {
      const passphrase = window.prompt('这是加密备份，输入密码：');
      if (!passphrase) return;
      try {
        const opened = await decryptVault(data, passphrase);
        data = opened.data;
      } catch {
        toast('密码不对，或者备份损坏');
        return;
      }
    }
    const rawNotes = Array.isArray(data) ? data : (data && Array.isArray(data.notes) ? data.notes : []);
    const rawDiaries = !Array.isArray(data) && data && Array.isArray(data.diaries) ? data.diaries : [];
    const rawNoteFolders = !Array.isArray(data) && data && Array.isArray(data.noteFolders) ? data.noteFolders : [];
    const rawNoteItems = !Array.isArray(data) && data && Array.isArray(data.noteItems) ? data.noteItems : [];
    const rawScheduleEvents = !Array.isArray(data) && data && Array.isArray(data.scheduleEvents) ? data.scheduleEvents : [];
    const rawPlans = !Array.isArray(data) && data && Array.isArray(data.plans) ? data.plans : [];
    if (!rawNotes.length && !rawDiaries.length && !rawNoteFolders.length && !rawNoteItems.length && !rawScheduleEvents.length && !rawPlans.length) {
      toast('备份里没有找到记录、日记、笔记、日程或计划');
      return;
    }
    const existing = new Set(state.notes.map((n) => (
      (n.kind || '') + '|' + (n.url || '').replace(/\/$/, '').toLowerCase() + '|' + (n.title || '').trim()
    )));
    const existingDiaryDates = new Set(state.diaries.filter((d) => !d.deletedAt).map((d) => d.date));
    const created = [];
    for (const raw of rawNotes.slice(0, 2000)) {
      const note = hydrateNote(raw);
      if (!note) continue;
      const key = note.kind + '|' + (note.url || '').replace(/\/$/, '').toLowerCase() + '|' + note.title.trim();
      if (existing.has(key)) continue;
      existing.add(key);
      note.id = uid();
      note.demo = false;
      created.push(note);
      if (created.length >= 800) break;
    }
    const createdDiaries = [];
    for (const raw of rawDiaries.slice(0, 2000)) {
      const diary = hydrateDiary(raw);
      if (!diary || existingDiaryDates.has(diary.date)) continue;
      existingDiaryDates.add(diary.date);
      diary.id = uid();
      createdDiaries.push(diary);
      if (createdDiaries.length >= 800) break;
    }
    const folderImport = importNoteFolders(rawNoteFolders);
    const createdNoteItems = importNoteItems(rawNoteItems, folderImport.mapping);
    const createdNoteFolders = folderImport.createdFolders;
    const existingSchedule = new Set(state.scheduleEvents.filter((event) => !event.deletedAt).map((event) => `${event.date}|${event.time}|${event.title.trim()}`));
    const createdScheduleEvents = [];
    for (const raw of rawScheduleEvents.slice(0, 4000)) {
      const event = hydrateScheduleEvent(raw);
      if (!event) continue;
      const signature = `${event.date}|${event.time}|${event.title.trim()}`;
      if (existingSchedule.has(signature)) continue;
      existingSchedule.add(signature);
      event.id = uid();
      createdScheduleEvents.push(event);
      if (createdScheduleEvents.length >= 1000) break;
    }
    if (!created.length && !createdDiaries.length && !createdNoteItems.length && !createdNoteFolders.length && !createdScheduleEvents.length && !rawPlans.length) {
      toast('没有新的记录、日记、笔记、日程或计划可以导入');
      return;
    }
    const existingPlans = new Set(state.plans.filter((plan) => !plan.deletedAt).map((plan) => `${plan.title.trim()}|${firstLine(plan.body).slice(0, 80)}`));
    const createdPlans = [];
    for (const raw of rawPlans.slice(0, 1000)) {
      const plan = hydratePlan(raw);
      if (!plan) continue;
      const signature = `${plan.title.trim()}|${firstLine(plan.body).slice(0, 80)}`;
      if (existingPlans.has(signature)) continue;
      existingPlans.add(signature);
      plan.id = uid();
      createdPlans.push(plan);
      if (createdPlans.length >= 500) break;
    }
    if (created.length) {
      state.notes.unshift(...created);
      state.selectedId = created[0].id;
    }
    if (createdDiaries.length) state.diaries.push(...createdDiaries);
    if (createdScheduleEvents.length) state.scheduleEvents.push(...createdScheduleEvents);
    if (createdPlans.length) state.plans.push(...createdPlans);
    sanitizeNoteStore();
    scheduleSave(10);
    renderChrome();
    renderList(true);
    renderDetail();
    if (state.ui.space === 'diary') renderDiary();
    if (state.ui.space === 'notes') renderNotesSpace();
    if (state.ui.space === 'schedule') renderScheduleSpace();
    if (state.ui.space === 'plan') renderPlanSpace();
    if (state.ui.space === 'trash') renderTrash();
    if (state.ui.overlay && state.ui.overlay.kind === 'settings') renderSettings();
    queueScheduleReminderSync();
    const bits = [];
    if (created.length) bits.push(`${created.length} 条记录`);
    if (createdDiaries.length) bits.push(`${createdDiaries.length} 篇日记`);
    if (createdNoteItems.length) bits.push(`${createdNoteItems.length} 条笔记`);
    if (createdNoteFolders.length) bits.push(`${createdNoteFolders.length} 个文件夹`);
    if (createdScheduleEvents.length) bits.push(`${createdScheduleEvents.length} 条日程`);
    if (createdPlans.length) bits.push(`${createdPlans.length} 个计划`);
    toast(`导入了 ${bits.join('、')}`, {
      actionLabel: '撤销', duration: 6000,
      onAction: () => {
        const ids = new Set(created.map((n) => n.id));
        if (ids.size) state.notes = state.notes.filter((n) => !ids.has(n.id));
        if (ids.has(state.selectedId)) state.selectedId = null;
        if (createdDiaries.length) {
          const diaryIds = new Set(createdDiaries.map((d) => d.id));
          state.diaries = state.diaries.filter((d) => !diaryIds.has(d.id));
        }
        if (createdNoteItems.length) {
          const itemIds = new Set(createdNoteItems.map((item) => item.id));
          state.noteItems = state.noteItems.filter((item) => !itemIds.has(item.id));
        }
        if (createdNoteFolders.length) {
          const folderIds = new Set(createdNoteFolders.map((folder) => folder.id));
          state.noteFolders = state.noteFolders.filter((folder) => !folderIds.has(folder.id));
        }
        if (createdScheduleEvents.length) {
          const eventIds = new Set(createdScheduleEvents.map((event) => event.id));
          state.scheduleEvents = state.scheduleEvents.filter((event) => !eventIds.has(event.id));
        }
        if (createdPlans.length) {
          const planIds = new Set(createdPlans.map((plan) => plan.id));
          state.plans = state.plans.filter((plan) => !planIds.has(plan.id));
        }
        sanitizeNoteStore();
        scheduleSave(10);
        renderChrome(); renderList(); renderDetail();
        if (state.ui.space === 'diary') renderDiary();
        if (state.ui.space === 'notes') renderNotesSpace();
        if (state.ui.space === 'schedule') renderScheduleSpace();
        if (state.ui.space === 'plan') renderPlanSpace();
        if (state.ui.space === 'trash') renderTrash();
        if (state.ui.overlay && state.ui.overlay.kind === 'settings') renderSettings();
        queueScheduleReminderSync();
      }
    });
  }

  async function backupNow() {
    if (!IS_NATIVE) {
      toast('桌面版才有自动备份');
      return;
    }
    if (hasPasswordData() && !state.crypto.encrypted) {
      toast('密码库还没上锁，不写明文备份；先开密码锁');
      return;
    }
    await persist();
    toast('已放进文档备份', { icon: 'check' });
  }

  function downloadFile(filename, text, type = 'text/plain;charset=utf-8') {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exportData() {
    const payload = {
      app: 'moyu',
      version: 4,
      exportedAt: new Date().toISOString(),
      notes: state.notes,
      diaries: state.diaries,
      noteFolders: state.noteFolders,
      noteItems: state.noteItems,
      scheduleEvents: state.scheduleEvents,
      plans: state.plans
    };
    downloadFile(`摸鱼笔记-${dayStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    toast('导出好了');
  }

  function diaryMarkdown(entry) {
    const title = String(entry.title || '').trim();
    const body = String(entry.body || '').trim();
    return [
      `## ${diaryDateLabel(entry.date)}`,
      '',
      title ? `**${title}**` : '',
      title ? '' : '',
      body || '（这天没有写正文）',
      ''
    ].filter((line, index, arr) => !(line === '' && arr[index - 1] === '')).join('\n');
  }

  function exportDiariesMarkdown(one = null) {
    const entries = (one ? [one] : state.diaries.slice())
      .filter((d) => d && d.date && !d.deletedAt)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (!entries.length) { toast('还没有日记可导出'); return; }
    const text = one
      ? `# 摸鱼日记\n\n${diaryMarkdown(one)}`
      : `# 摸鱼日记\n\n导出时间：${fullDate(Date.now())}\n\n${entries.map(diaryMarkdown).join('\n---\n\n')}`;
    const name = one ? `摸鱼日记-${one.date}.md` : `摸鱼日记-${dayStamp()}.md`;
    downloadFile(name, text, 'text/markdown;charset=utf-8');
    toast('日记已导出 · 明文 .md');
  }

  function noteMarkdown(item) {
    const path = noteFolderPath(item.folderId);
    const title = String(item.title || '').trim() || firstLine(item.body) || '无题';
    const reference = String(item.reference || '').trim();
    const body = String(item.body || '').trim();
    return [
      `### ${title}`,
      '',
      `来源：${path}${reference ? ` · ${reference}` : ''}`,
      '',
      body || '（这条还没有正文）',
      ''
    ].join('\n');
  }

  function exportNotesMarkdown(one = null) {
    const items = (one ? [one] : state.noteItems.slice())
      .filter((item) => item && !item.deletedAt)
      .sort((a, b) => {
        const pathDiff = noteFolderPath(a.folderId).localeCompare(noteFolderPath(b.folderId), 'zh-Hans-CN');
        return pathDiff || (a.updatedAt || a.createdAt) - (b.updatedAt || b.createdAt);
      });
    if (!items.length) { toast('还没有笔记可导出'); return; }
    const text = one
      ? `# 摸鱼笔记\n\n${noteMarkdown(one)}`
      : `# 摸鱼笔记\n\n导出时间：${fullDate(Date.now())}\n\n${items.map(noteMarkdown).join('\n---\n\n')}`;
    const name = one
      ? `摸鱼笔记-${(String(one.title || '').trim() || '无题').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40)}.md`
      : `摸鱼笔记-${dayStamp()}.md`;
    downloadFile(name, text, 'text/markdown;charset=utf-8');
    toast('笔记已导出 · 明文 .md');
  }

  /* ---------- 17. Settings ---------- */
  const settingTabs = [
    ['appearance', '外观'],
    ['capture', '记录'],
    ['security', '上锁'],
    ['api', '连接'],
    ['data', '数据']
  ];

  function kbdKeys(text) {
    return String(text || '').trim().split(/\s+/).filter(Boolean).map((k) => `<kbd>${esc(k)}</kbd>`).join('');
  }

  function baseUrl() {
    return location.href.split('#')[0].split('?')[0];
  }

  function bookmarkletCode() {
    const base = baseUrl().replace(/'/g, "\\'");
    return `javascript:(()=>{const b='${base}',u=encodeURIComponent(location.href),t=encodeURIComponent(document.title);window.open(b+'#capture?url='+u+'&title='+t,'moyu','width=520,height=680')})()`;
  }

  function settingsRow(title, desc, control = '') {
    return `<div class="set-row">
      <div class="set-text"><strong>${title}</strong>${desc ? `<span>${desc}</span>` : ''}</div>
      ${control ? `<div class="set-control">${control}</div>` : ''}
    </div>`;
  }

  function themeOptionsHTML() {
    const opts = [['system', '跟随系统'], ['light', '浅色'], ['dark', '深色']];
    return `<div class="theme-options">${opts.map(([value, label]) => `
      <button class="theme-opt ${state.settings.theme === value ? 'active' : ''}" type="button" data-action="set-theme" data-theme-mode="${value}">${label}</button>`).join('')}</div>`;
  }

  function passFormHTML() {
    const mode = state.ui.passForm;
    if (!mode) return '';
    if (mode === 'disable') {
      return `<div class="passphrase-box">
        <div class="warning-text">关闭后，记录会以明文保存在本机。</div>
        <div class="passphrase-actions">
          <button class="btn sm" type="button" data-action="cancel-pass">算了</button>
          <button class="btn danger sm" type="button" data-action="confirm-disable">关闭</button>
        </div>
      </div>`;
    }
    const changing = mode === 'change';
    return `<div class="passphrase-box">
      <input class="input" id="passNew" type="password" autocomplete="new-password" placeholder="${changing ? '新密码，至少 6 位' : '密码，至少 6 位'}">
      <input class="input" id="passConfirm" type="password" autocomplete="new-password" placeholder="再输一次">
      <div class="warning-text">忘记密码找不回来。</div>
      <div class="lock-error" id="passError">${esc(state.ui.passError || '')}</div>
      <div class="passphrase-actions">
        <button class="btn sm" type="button" data-action="cancel-pass">算了</button>
        <button class="btn primary sm" type="button" data-action="submit-pass">${changing ? '更新' : '上锁'}</button>
      </div>
    </div>`;
  }

  function requestCredentials(force = false) {
    if (!IS_NATIVE) return;
    if (!force && (state.ui.credentialsLoading || state.ui.credentialsLoaded)) return;
    state.ui.credentialsLoading = true;
    state.ui.credentialsError = '';
    sendNative({ type: 'credentials-list' });
  }

  function settingsContent(tab) {
    if (tab === 'appearance') {
      return `
        <h4>外观</h4>
        <div class="set-group">
          ${settingsRow('主题', '', themeOptionsHTML())}
        </div>
        <div class="set-group">
          ${settingsRow('网站图标', '不显示时用首字母。',
            `<button class="switch" type="button" role="switch" aria-checked="${state.settings.favicon}" aria-label="显示网站图标" data-action="toggle-favicon"></button>`)}
        </div>
        <div class="set-group">
          ${settingsRow('快捷键', '在窗口里按 ? 也能打开。',
            '<button class="btn sm" type="button" data-action="show-shortcuts">查看</button>')}
        </div>`;
    }

    if (tab === 'capture') {
      const native = state.platform.native;
      return `
        <h4>记录</h4>
        <div class="set-group">
          ${settingsRow(native ? '全局快捷键' : '快捷键',
            native ? '在任意窗口按一下。' : '在网页里按一下。',
            `<span class="set-control-inline">${kbdKeys(native ? state.platform.hotkey : (IS_MAC ? '⌘ ⇧ Space' : 'Ctrl Shift Space'))}
              <span class="badge-soft">${native ? (state.platform.hotkeyRegistered ? '已启用' : '被占用') : '应用内'}</span></span>`)}
          ${native ? settingsRow('开机启动', '',
            `<button class="switch" type="button" role="switch" aria-checked="${state.platform.autostart}" aria-label="开机启动" data-action="toggle-autostart"></button>`) : ''}
        </div>

        <div class="set-group">
          <div class="set-row"><div class="set-text"><strong>拖小锁</strong><span>从地址栏拖进来。链接、标签页、选中文字也行。</span></div></div>
          <div class="data-bar"><button class="btn sm" type="button" data-action="import-bookmarks">导入浏览器书签</button></div>
        </div>

        ${native ? '' : `<details class="plain-details">
          <summary>书签工具</summary>
          <p class="section-sub" style="margin:6px 0">拖到书签栏，在网页上点一下。</p>
          <div class="bookmarklet-row">
            <a class="bookmarklet" href="${esc(bookmarkletCode())}" draggable="true" data-bookmarklet>${icon('bookmark')}记一条</a>
            <button class="btn sm" type="button" data-action="copy-bookmarklet">复制</button>
          </div>
          <code class="code">${esc(bookmarkletCode())}</code>
        </details>`}

        <details class="plain-details">
          <summary>iPhone / iPad</summary>
          <ol class="steps">
            <li>Safari 打开，分享 → 添加到主屏幕。</li>
            <li>快捷指令接收网页，URL 编码后打开下面的地址。</li>
          </ol>
          <div class="bookmarklet-row">
            <code class="code" style="margin-top:0;flex:1;min-width:170px">${esc(baseUrl())}#capture?url=…</code>
            <button class="btn sm" type="button" data-action="copy-base">复制</button>
          </div>
        </details>`;
    }

    if (tab === 'security') {
      const encrypted = state.crypto.encrypted;
      const supported = isSecureEnoughForCrypto();
      return `
        <h4>上锁</h4>
        <p class="section-sub">可选。开启后整库加密，忘记密码无法找回。</p>
        <div class="set-group">
          ${settingsRow('密码锁', 'AES-256-GCM · PBKDF2',
            `<button class="switch" type="button" role="switch" aria-checked="${encrypted}" aria-label="密码锁" data-action="toggle-lock" ${supported ? '' : 'disabled'}></button>`)}
          ${passFormHTML()}
          ${encrypted ? `<div class="data-bar">
            <button class="btn sm" type="button" data-action="change-pass">修改密码</button>
            <button class="btn sm" type="button" data-action="lock-now">立即上锁</button>
          </div>` : ''}
          ${!supported ? `<div class="warning-text">这个环境不支持加密。</div>` : ''}
        </div>

        ${encrypted ? `<div class="set-group">
          ${settingsRow('一段时间后自动上锁', '',
            `<select class="select" data-setting="autoLock" aria-label="自动上锁时间">
              ${[[1, '1 分钟'], [5, '5 分钟'], [15, '15 分钟'], [30, '30 分钟'], [0, '从不']].map(([v, l]) =>
                `<option value="${v}" ${Number(state.settings.autoLock) === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>`)}
        </div>` : ''}

        <div class="set-group">
          <div class="warning-text">按 ${MOD} ⇧ L 可以随时上锁。</div>
        </div>`;
    }

    if (tab === 'api') {
      if (!IS_NATIVE) {
        return `<h4>连接</h4><p class="section-sub">本地 API 只在桌面版可用。</p>`;
      }
      if (!state.ui.credentialsLoaded && !state.ui.credentialsLoading) requestCredentials();
      const items = state.ui.credentials || [];
      const rows = items.length ? items.map((item) => {
        const scopes = (item.scopes || []).map((scope) => scope === 'write' ? '改' : '读').join(' / ') || '读';
        const last = item.lastUsedAt ? relativeTime(item.lastUsedAt) : '没用过';
        if (state.ui.credentialRenameId === item.id) {
          return `<div class="credential-row">
            <div class="credential-main"><input class="input credential-rename" id="credentialRenameInput" maxlength="60" value="${esc(item.name)}" aria-label="凭证名字"></div>
            <div class="credential-actions">
              <button class="btn sm primary" type="button" data-action="cred-rename-save" data-id="${item.id}">保存</button>
              <button class="btn sm" type="button" data-action="cred-rename-cancel">取消</button>
            </div>
          </div>`;
        }
        return `<div class="credential-row">
          <div class="credential-main">
            <strong>${esc(item.name)}</strong>
            <span>${esc(item.prefix)}•••• · ${scopes} · ${item.enabled ? '生效中' : '已停用'} · ${last}</span>
          </div>
          <div class="credential-actions">
            ${item.canCopy ? `<button class="btn sm" type="button" data-action="cred-copy" data-id="${item.id}">复制</button>` : ''}
            <button class="btn sm" type="button" data-action="cred-rename" data-id="${item.id}">改名</button>
            <button class="btn sm" type="button" data-action="cred-toggle" data-id="${item.id}" data-enabled="${item.enabled ? '1' : '0'}">${item.enabled ? '停用' : '启用'}</button>
            <button class="btn sm danger-text" type="button" data-action="cred-delete" data-id="${item.id}">删除</button>
          </div>
          ${state.ui.credentialDeleteId === item.id ? `<div class="credential-confirm">
            <span>删除后这个密钥立刻失效，不能恢复。</span>
            <button class="btn sm danger" type="button" data-action="cred-delete-confirm" data-id="${item.id}">确认删除</button>
            <button class="btn sm" type="button" data-action="cred-delete-cancel">算了</button>
          </div>` : ''}
        </div>`;
      }).join('') : `<div class="credential-empty">还没有凭证。新建一个，把它交给 AI 或脚本。</div>`;
      return `
        <h4>连接</h4>
        <p class="section-sub">给 AI 或脚本一把只在本机使用的钥匙。密钥用 Windows DPAPI 加密保存在这台电脑上，可以随时再复制。</p>
        <div class="data-bar"><button class="btn sm" type="button" data-action="cred-refresh">刷新凭证</button></div>
        ${state.ui.credentialKey ? `<div class="credential-key">
          <strong>新密钥</strong>
          <code>${esc(state.ui.credentialKey)}</code>
          <div class="data-bar">
            <button class="btn sm primary" type="button" data-action="copy-credential-key">复制密钥</button>
            <button class="btn sm" type="button" data-action="cred-key-hide">收起来</button>
          </div>
          <div class="warning-text">也可以关掉后在列表里再点「复制」。</div>
        </div>` : ''}
        ${state.ui.credentialsError ? `<div class="lock-error">${esc(state.ui.credentialsError)}</div>` : ''}
        <div class="credential-list">${state.ui.credentialsLoading && !items.length ? '<div class="credential-empty">正在读取…</div>' : rows}</div>
        <div class="set-group">
          <div class="credential-create">
            <input class="input" id="credentialName" type="text" maxlength="60" placeholder="给这个凭证起个名字，比如「Claude 整理笔记」">
            <label class="credential-scope"><input type="checkbox" id="credentialScopeRead" checked> 读取</label>
            <label class="credential-scope"><input type="checkbox" id="credentialScopeWrite"> 修改</label>
            <button class="btn sm primary" type="button" data-action="cred-create">创建凭证</button>
          </div>
          <div class="warning-text">「读取」只能查，「修改」才能增删改。改权限请新建一个凭证；名字可以随时改，密钥不能改。</div>
        </div>
        <div class="set-group">
          <div class="plain-details" style="padding:0">
            <summary>命令行 / API</summary>
            <p class="section-sub" style="margin:7px 0">密钥通过 <code>MOYU_API_KEY</code> 或 <code>--key</code> 传给 CLI；API 只监听本机 127.0.0.1，程序退出就不可用。</p>
            <code class="code">D:\\App\\Moyu\\moyu --help</code>
            <p class="section-sub" style="margin:7px 0 0">支持备忘、日记、笔记、文件夹、日程和纸篓；不会返回密码内容。</p>
          </div>
        </div>`;
    }

    if (tab === 'data') {
      const raw = storageGet(VAULT_KEY) || '';
      const bytes = new Blob([raw]).size;
      const pct = clamp((bytes / (5 * 1024 * 1024)) * 100, 0, 100);
      const trash = allTrashCount();
      const demos = state.notes.filter((n) => n.demo && !n.deletedAt).length;
      const diaryCount = state.diaries.filter((d) => !d.deletedAt).length;
      const noteCount = state.noteItems.filter((item) => !item.deletedAt).length;
      const folderCount = state.noteFolders.length;
      const planCount = state.plans.filter((plan) => !plan.deletedAt).length;
      const scheduleCount = state.scheduleEvents.filter((event) => !event.deletedAt).length;
      const plaintextPasswordGuard = hasPasswordData() && !state.crypto.encrypted;
      return `
        <h4>数据</h4>
        <p class="section-sub">${plaintextPasswordGuard
          ? '检测到密码记录：自动备份已暂停，避免在文档里留下明文副本。开启密码锁后会自动写加密备份。'
          : '都在本机。自动备份到「文档\\摸鱼笔记本备份」，删掉程序也不会删。'}</p>

        <div class="set-group">
          ${settingsRow('占用', '', `<span class="storage-line"><span class="bar"><i style="width:${pct.toFixed(1)}%"></i></span>${formatBytes(bytes)}</span>`)}
          ${settingsRow('日记', `${diaryCount} 篇`, '')}
          ${settingsRow('笔记', `${noteCount} 条 · ${folderCount} 个文件夹`, '')}
          ${settingsRow('计划', `${planCount} 个`, '')}
          ${settingsRow('日程', `${scheduleCount} 条`, '')}
          <div class="data-bar">
            <button class="btn sm" type="button" data-action="export">导出备份</button>
            <button class="btn sm" type="button" data-action="import-json">导入备份</button>
            <button class="btn sm" type="button" data-action="backup-now">立即备份</button>
            <button class="btn sm" type="button" data-action="import-bookmarks">导入书签</button>
          </div>
          <div class="data-bar">
            <button class="btn sm" type="button" data-action="export-diaries">导出日记 .md</button>
            <button class="btn sm" type="button" data-action="export-notes">导出笔记 .md</button>
            <button class="btn sm" type="button" data-action="export-plans">导出计划 .md</button>
            <button class="btn sm" type="button" data-action="export-schedule">导出日程 .ics</button>
          </div>
          ${IS_NATIVE ? `<div class="data-bar">
            <button class="btn sm" type="button" data-action="open-data-folder">打开数据文件夹</button>
            <button class="btn sm" type="button" data-action="open-backup-folder">打开备份文件夹</button>
          </div>` : ''}
          <div class="warning-text" style="margin-top:6px">${plaintextPasswordGuard
            ? '密码库未上锁：自动备份暂停，避免把账号密码写到文档。手动导出的 JSON、日记/笔记/计划 Markdown 和日程 .ics 仍是明文，请只存到可信位置。'
            : '未上锁时，导出的 JSON、日记/笔记/计划 Markdown、日程 .ics 和自动备份都是明文；开了密码锁则备份为密文，导入时会问密码。'}</div>
        </div>

        <div class="set-group">
          <div class="data-bar">
            ${demos ? `<button class="btn sm" type="button" data-action="clear-demo">移除示例</button>` : ''}
            ${trash ? `<button class="btn sm" type="button" data-action="clear-trash">清空纸篓</button>` : ''}
            <button class="btn sm danger" type="button" data-action="clear-all">清空所有</button>
          </div>
        </div>`;
    }

    return settingsContent('appearance');
  }

  function openSettings(tab = state.ui.settingsTab) {
    if (state.crypto.locked) { showLock(); return; }
    closeFilterPanel();
    if (state.ui.overlay && state.ui.overlay.kind === 'settings') {
      state.ui.settingsTab = tab;
      renderSettings();
      return;
    }
    state.ui.settingsTab = tab;
    const nav = settingTabs.map(([id, label]) => `
      <button class="settings-tab" type="button" role="tab" data-tab="${id}">${label}</button>`).join('');
    const mounted = mountOverlay(`
      <div class="sheet settings-sheet" role="dialog" aria-modal="true" aria-label="设置">
        <div class="sheet-head">
          <div class="sheet-title"><h3>设置</h3></div>
          <button class="icon-btn" type="button" data-action="close-settings" aria-label="关闭设置">${icon('x')}</button>
        </div>
        <div class="settings-layout">
          <nav class="settings-nav" role="tablist" aria-label="设置分类">${nav}</nav>
          <div class="settings-content" id="settingsContent"></div>
        </div>
        <div class="sheet-foot">
          <span class="settings-foot-version">v${VERSION} · 本地</span>
          <span class="spacer"></span>
          <button class="btn" type="button" data-action="close-settings">好</button>
        </div>
      </div>`, { kind: 'settings', initialFocus: '[data-tab="' + state.ui.settingsTab + '"]' });

    renderSettings();

    mounted.overlay.addEventListener('click', (e) => {
      const bookmarklet = e.target.closest('[data-bookmarklet]');
      if (bookmarklet) {
        e.preventDefault();
        toast('拖到书签栏，不要点击');
        return;
      }
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) {
        state.ui.settingsTab = tabBtn.dataset.tab;
        renderSettings();
        return;
      }
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      handleSettingsAction(actionEl.dataset.action, actionEl);
    });

    mounted.overlay.addEventListener('change', (e) => {
      const setting = e.target.dataset.setting;
      if (setting === 'autoLock') {
        state.settings.autoLock = Number(e.target.value);
        saveSettings();
        toast('好');
      }
    });

    mounted.overlay.addEventListener('keydown', (e) => {
      if ((e.target.id === 'passNew' || e.target.id === 'passConfirm') && e.key === 'Enter') {
        e.preventDefault();
        submitPassphrase();
      }
    });
  }

  function renderSettings() {
    const box = $('#settingsContent');
    if (!box) return;
    const top = box.scrollTop;
    box.innerHTML = settingsContent(state.ui.settingsTab);
    box.scrollTop = top;
    $$('.settings-tab').forEach((b) => {
      const on = b.dataset.tab === state.ui.settingsTab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
  }

  async function handleSettingsAction(action, node) {
    switch (action) {
      case 'close-settings':
        closeOverlay();
        break;
      case 'cred-refresh':
        state.ui.credentialsLoaded = false;
        requestCredentials(true);
        renderSettings();
        break;
      case 'cred-create': {
        if (!IS_NATIVE) return;
        const nameEl = $('#credentialName');
        const name = nameEl ? nameEl.value.trim() : '';
        if (!name) { nameEl?.focus(); toast('先给凭证起个名字'); return; }
        const scopes = [];
        if ($('#credentialScopeRead')?.checked) scopes.push('read');
        if ($('#credentialScopeWrite')?.checked) scopes.push('write');
        if (!scopes.length) { toast('至少选一个权限'); return; }
        state.ui.credentialsLoading = true;
        state.ui.credentialsError = '';
        sendNative({ type: 'credential-create', name, scopes });
        renderSettings();
        break;
      }
      case 'copy-credential-key':
        if (state.ui.credentialKey) copyText(state.ui.credentialKey, '密钥已复制，收好');
        break;
      case 'cred-copy':
        sendNative({ type: 'credential-copy', id: node.dataset.id });
        break;
      case 'cred-key-hide':
        state.ui.credentialKey = '';
        renderSettings();
        break;
      case 'cred-rename':
        state.ui.credentialRenameId = node.dataset.id || null;
        state.ui.credentialDeleteId = null;
        renderSettings();
        setTimeout(() => { $('#credentialRenameInput')?.focus(); $('#credentialRenameInput')?.select(); }, 30);
        break;
      case 'cred-rename-cancel':
        state.ui.credentialRenameId = null;
        renderSettings();
        break;
      case 'cred-rename-save': {
        const input = $('#credentialRenameInput');
        const name = input ? input.value.trim() : '';
        if (!name) { input?.focus(); toast('名字不能空着'); return; }
        sendNative({ type: 'credential-update', id: node.dataset.id, name });
        state.ui.credentialRenameId = null;
        renderSettings();
        break;
      }
      case 'cred-toggle':
        sendNative({ type: 'credential-update', id: node.dataset.id, enabled: node.dataset.enabled !== '1' });
        break;
      case 'cred-delete':
        state.ui.credentialDeleteId = node.dataset.id || null;
        state.ui.credentialRenameId = null;
        renderSettings();
        break;
      case 'cred-delete-cancel':
        state.ui.credentialDeleteId = null;
        renderSettings();
        break;
      case 'cred-delete-confirm':
        sendNative({ type: 'credential-delete', id: node.dataset.id });
        state.ui.credentialDeleteId = null;
        renderSettings();
        break;
      case 'set-theme': {
        const mode = node.dataset.themeMode;
        if (!['light', 'dark', 'system'].includes(mode)) return;
        state.settings.theme = mode;
        saveSettings();
        applyTheme();
        renderSettings();
        break;
      }
      case 'toggle-favicon':
        state.settings.favicon = !state.settings.favicon;
        saveSettings();
        renderSettings();
        renderList();
        break;
      case 'toggle-lock':
        if (state.crypto.encrypted) {
          state.ui.passForm = 'disable';
          state.ui.passError = '';
        } else {
          state.ui.passForm = 'enable';
          state.ui.passError = '';
        }
        renderSettings();
        setTimeout(() => $('#passNew')?.focus(), 40);
        break;
      case 'cancel-pass':
        state.ui.passForm = null;
        state.ui.passError = '';
        renderSettings();
        break;
      case 'submit-pass':
        await submitPassphrase();
        break;
      case 'confirm-disable':
        await disableLock();
        break;
      case 'change-pass':
        state.ui.passForm = 'change';
        state.ui.passError = '';
        renderSettings();
        setTimeout(() => $('#passNew')?.focus(), 40);
        break;
      case 'lock-now':
        await lockNow();
        break;
      case 'toggle-autostart': {
        if (!state.platform.native) return;
        state.platform.autostart = !state.platform.autostart;
        sendNative({ type: 'set-autostart', enabled: state.platform.autostart });
        renderSettings();
        toast(state.platform.autostart ? '已设置开机启动' : '已取消开机启动');
        break;
      }
      case 'export':
        exportData();
        break;
      case 'export-diaries':
        exportDiariesMarkdown();
        break;
      case 'export-notes':
        exportNotesMarkdown();
        break;
      case 'export-plans':
        exportPlansMarkdown();
        break;
      case 'export-schedule':
        exportScheduleICS();
        break;
      case 'backup-now':
        backupNow();
        break;
      case 'open-data-folder':
        if (IS_NATIVE) sendNative({ type: 'open-folder', folder: 'data' });
        break;
      case 'open-backup-folder':
        if (IS_NATIVE) sendNative({ type: 'open-folder', folder: 'backup' });
        break;
      case 'import-json':
        triggerImport('json');
        break;
      case 'import-bookmarks':
        triggerImport('bookmarks');
        break;
      case 'clear-demo': {
        const removed = state.notes.filter((n) => n.demo);
        if (!removed.length) { toast('没有示例内容了'); return; }
        state.notes = state.notes.filter((n) => !n.demo);
        if (!currentNote()) state.selectedId = null;
        scheduleSave(10);
        renderChrome(); renderList(); renderDetail(); renderSettings();
        toast('示例内容已移除', {
          actionLabel: '撤销', duration: 5000,
          onAction: () => {
            state.notes.push(...removed);
            scheduleSave(10); renderChrome(); renderList(); renderDetail(); renderSettings();
          }
        });
        break;
      }
      case 'clear-trash': {
        await purgeAllTrash();
        break;
      }
      case 'clear-all': {
        const ok = await confirmAction({
          title: '清空所有内容？',
          message: '这一操作会删除所有记录、标签、账号信息、日记、笔记文件夹、计划和日程。建议先导出备份。',
          confirmLabel: '清空所有内容'
        });
        if (!ok) return;
        const previous = state.notes.slice();
        const previousDiaries = state.diaries.slice();
        const previousNoteFolders = state.noteFolders.slice();
        const previousNoteItems = state.noteItems.slice();
        const previousSchedule = state.scheduleEvents.slice();
        const previousPlans = state.plans.slice();
        state.notes = [];
        state.diaries = [];
        state.noteFolders = [];
        state.noteItems = [];
        state.scheduleEvents = [];
        state.plans = [];
        state.selectedId = null;
        state.notesSpace = { folder: 'all', selectedId: null, draft: null, expanded: {}, edit: null };
        state.schedule = { view: 'month', anchor: dayStamp() };
        state.planSpace = { selectedId: null, draft: null };
        state.settings.lastSelectedId = null;
        saveSettings();
        scheduleSave(10);
        renderChrome(); renderList(); renderDetail();
        if (state.ui.space === 'diary') renderDiary();
        if (state.ui.space === 'notes') renderNotesSpace();
        if (state.ui.space === 'schedule') renderScheduleSpace();
        if (state.ui.space === 'plan') renderPlanSpace();
        if (state.ui.space === 'trash') renderTrash();
        renderSettings();
        queueScheduleReminderSync();
        toast('所有内容已清空', {
          actionLabel: '撤销', duration: 7000,
          onAction: () => {
            state.notes = previous;
            state.diaries = previousDiaries;
            state.noteFolders = previousNoteFolders;
            state.noteItems = previousNoteItems;
            state.scheduleEvents = previousSchedule;
            state.plans = previousPlans;
            scheduleSave(10); renderChrome(); renderList(); renderDetail();
            if (state.ui.space === 'diary') renderDiary();
            if (state.ui.space === 'notes') renderNotesSpace();
            if (state.ui.space === 'schedule') renderScheduleSpace();
            if (state.ui.space === 'plan') renderPlanSpace();
            if (state.ui.space === 'trash') renderTrash();
            renderSettings();
            queueScheduleReminderSync();
          }
        });
        break;
      }
      case 'copy-bookmarklet':
        await copyText(bookmarkletCode(), '书签工具代码已复制');
        break;
      case 'copy-base':
        await copyText(baseUrl() + '#capture', '地址已复制');
        break;
      case 'show-shortcuts':
        openShortcuts();
        break;
      case 'onboarding':
        closeOverlay();
        state.selectedId = null;
        state.filter = makeFilter();
        state.query = '';
        $('#searchInput').value = '';
        updateSearchClear();
        renderChrome(); renderList(); renderDetail();
        break;
      default:
        break;
    }
  }

  function setPassError(message) {
    state.ui.passError = message;
    const el = $('#passError');
    if (el) {
      el.textContent = message;
      const box = el.closest('.passphrase-box');
      if (box) {
        box.classList.remove('lock-shake');
        void box.offsetWidth;
        box.classList.add('lock-shake');
      }
    }
  }

  async function submitPassphrase() {
    const mode = state.ui.passForm;
    if (mode !== 'enable' && mode !== 'change') return;
    if (!isSecureEnoughForCrypto()) {
      setPassError('当前环境不支持加密');
      return;
    }
    const newEl = $('#passNew');
    const confirmEl = $('#passConfirm');
    if (!newEl || !confirmEl) return;
    const pass = newEl.value;
    const confirm = confirmEl.value;
    if (pass.length < 6) { setPassError('至少需要 6 位密码'); newEl.focus(); return; }
    if (pass !== confirm) { setPassError('两次输入不一致'); confirmEl.focus(); return; }

    const button = $('[data-action="submit-pass"]');
    if (button) { button.disabled = true; button.textContent = '正在加密…'; }
    try {
      const saltBytes = crypto.getRandomValues(new Uint8Array(16));
      const key = await deriveVaultKey(pass, saltBytes);
      state.crypto.encrypted = true;
      state.crypto.locked = false;
      state.crypto.key = key;
      state.crypto.salt = bytesToB64(saltBytes);
      state.settings.lockEnabled = true;
      if (!Number(state.settings.autoLock)) state.settings.autoLock = 5;
      saveSettings();
      await persist();
      state.ui.passForm = null;
      state.ui.passError = '';
      renderVaultLine();
      renderSettings();
      toast(mode === 'change' ? '密码已更新' : '密码锁已开启');
    } catch (err) {
      console.error(err);
      setPassError('加密失败，请稍后再试');
      if (button) { button.disabled = false; button.textContent = mode === 'change' ? '更新密码' : '开启加密'; }
    }
  }

  async function disableLock() {
    const button = $('[data-action="confirm-disable"]');
    if (button) { button.disabled = true; button.textContent = '正在关闭…'; }
    try {
      state.crypto.encrypted = false;
      state.crypto.key = null;
      state.crypto.salt = null;
      state.crypto.locked = false;
      state.settings.lockEnabled = false;
      saveSettings();
      await persist();
      state.ui.passForm = null;
      state.ui.passError = '';
      renderVaultLine();
      renderSettings();
      toast('密码锁已关闭，数据将以明文保存');
    } catch (err) {
      console.error(err);
      toast('关闭失败，请稍后再试');
    }
  }

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }

  /* ---------- 18. Shortcuts & confirm ---------- */
  function openShortcuts() {
    closeFilterPanel();
    const native = state.platform.native;
    const rows = [
      [MOD + ' K', '搜索'],
      [newHotkeyLabel(), '记一条'],
      [MOD + ' ⇧ Space', '速记'],
      [MOD + ' ↵', '记下'],
      ['↑  ↓', '切换记录'],
      ['Esc', '关闭'],
      ['?', '这张表']
    ];
    if (native) rows.unshift([state.platform.hotkey, '从任何窗口唤起']);
    const mounted = mountOverlay(`
      <div class="sheet" style="width:min(380px,100%)" role="dialog" aria-modal="true" aria-label="快捷键">
        <div class="sheet-head">
          <div class="sheet-title"><h3>快捷键</h3></div>
          <button class="icon-btn" type="button" data-action="close-shortcuts" aria-label="关闭">${icon('x')}</button>
        </div>
        <div class="sheet-body">
          <div class="shortcut-grid">
            ${rows.map(([keys, label]) => `<div class="shortcut-row"><span>${label}</span><span class="keys">${keys.split(' ').map((k) => `<kbd>${esc(k)}</kbd>`).join('')}</span></div>`).join('')}
          </div>
        </div>
        <div class="sheet-foot">
          <span class="spacer"></span>
          <button class="btn" type="button" data-action="close-shortcuts">好</button>
        </div>
      </div>`, { kind: 'shortcuts' });
    mounted.overlay.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="close-shortcuts"]')) mounted.close();
    });
  }

  function confirmAction({ title, message, confirmLabel = '确认' }) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (value) => { if (!done) { done = true; resolve(value); } };
      const mounted = mountOverlay(`
        <div class="sheet confirm-sheet" role="alertdialog" aria-modal="true" aria-label="${esc(title)}">
          <div class="confirm-body">
            <span class="confirm-icon">${icon('trash')}</span>
            <h3>${esc(title)}</h3>
            <p>${esc(message)}</p>
          </div>
          <div class="confirm-actions">
            <button class="btn" type="button" data-confirm="no">算了</button>
            <button class="btn danger" type="button" data-confirm="yes">${esc(confirmLabel)}</button>
          </div>
        </div>`, {
        kind: 'confirm',
        dismissible: true,
        onClose: () => finish(false)
      });
      mounted.overlay.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-confirm]');
        if (!btn) return;
        const yes = btn.dataset.confirm === 'yes';
        finish(yes);
        mounted.close();
      });
    });
  }

  /* ---------- 19. Note actions ---------- */
  async function pinCurrent() {
    const note = currentNote();
    if (!note) return;
    note.pinned = !note.pinned;
    note.updatedAt = Date.now();
    scheduleSave();
    renderChrome();
    renderList();
    const pane = $('#detailPane');
    const top = pane.scrollTop;
    renderDetail();
    pane.scrollTop = top;
    toast(note.pinned ? '置顶了' : '取消置顶');
  }

  function deleteCurrentNote() {
    const note = currentNote();
    if (!note || note.deletedAt) return;
    note.deletedAt = Date.now();
    note.updatedAt = Date.now();
    state.selectedId = null;
    state.settings.lastSelectedId = null;
    saveSettings();
    scheduleSave(10);
    renderChrome();
    renderList();
    renderDetail();
    if (window.innerWidth <= 760) $('#app').classList.remove('show-detail');
    toast('丢进纸篓了', {
      actionLabel: '撤销', duration: 5000,
      onAction: () => {
        note.deletedAt = null;
        note.updatedAt = Date.now();
        state.selectedId = note.id;
        state.settings.lastSelectedId = note.id;
        saveSettings();
        scheduleSave(10);
        renderChrome(); renderList(); renderDetail();
      }
    });
  }

  function restoreCurrentNote() {
    const note = currentNote();
    if (!note) return;
    note.deletedAt = null;
    note.updatedAt = Date.now();
    state.selectedId = note.id;
    state.settings.lastSelectedId = note.id;
    saveSettings();
    scheduleSave(10);
    renderChrome();
    renderList();
    renderDetail();
    toast('回来了');
  }

  async function purgeCurrentNote() {
    const note = currentNote();
    if (!note) return;
    const ok = await confirmAction({
      title: '删掉？',
      message: note.title || '没名字',
      confirmLabel: '删掉'
    });
    if (!ok) return;
    state.notes = state.notes.filter((n) => n.id !== note.id);
    state.selectedId = null;
    state.settings.lastSelectedId = null;
    saveSettings();
    scheduleSave(10);
    renderChrome();
    renderList();
    renderDetail();
    toast('没了');
  }

  function copyAll(note) {
    if (!note) return;
    const lines = [note.title || '没名字'];
    if (note.local && note.localPath) lines.push(note.localPath);
    else if (note.url) lines.push(note.url);
    if (note.kind === 'password') {
      if (note.username) lines.push('账号：' + note.username);
      if (note.password) lines.push('密码：' + note.password);
    }
    if (note.tags && note.tags.length) lines.push('标签：' + note.tags.map((t) => '#' + t).join(' '));
    if (note.body) lines.push('', note.body);
    copyText(lines.join('\n'), '复制了');
  }

  function onDetailClick(e) {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;

    // Actions that also exist on the welcome / empty states, where no note is selected.
    if (action === 'capture') { openCapture(); return; }
    if (action === 'paste-capture') { openCapture({ fromClipboard: true }); return; }
    if (action === 'import-bookmarks') { triggerImport('bookmarks'); return; }
    if (action === 'clear-search') { clearSearch(); return; }
    if (action === 'show-shortcuts') { openShortcuts(); return; }

    const note = currentNote();
    if (!note) return;
    const pane = $('#detailPane');
    const keepScroll = () => { const top = pane.scrollTop; renderDetail(); pane.scrollTop = top; };

    switch (action) {
      case 'back':
        backToList();
        break;
      case 'pin-note':
        pinCurrent();
        break;
      case 'delete-note':
        deleteCurrentNote();
        break;
      case 'restore-note':
        restoreCurrentNote();
        break;
      case 'purge-note':
        purgeCurrentNote();
        break;
      case 'open-url': {
        if (note.local) { openLocalFile(note); break; }
        if (!note.url) { toast('没链接'); break; }
        openExternal(note.url);
        break;
      }
      case 'open-local':
        openLocalFile(note);
        break;
      case 'copy-url':
        copyText(note.local ? (note.localPath || note.url) : note.url, note.local ? '路径复制了' : '链接复制了');
        break;
      case 'copy-username':
        copyText(note.username, '账号复制了');
        break;
      case 'copy-password':
        copyText(note.password, '密码复制了');
        break;
      case 'copy-all':
        copyAll(note);
        break;
      case 'reveal-password':
        state.ui.revealPasswordId = state.ui.revealPasswordId === note.id ? null : note.id;
        keepScroll();
        break;
      case 'generate-password': {
        note.password = generatePassword(20);
        note.updatedAt = Date.now();
        state.ui.revealPasswordId = note.id;
        scheduleSave();
        keepScroll();
        toast('换了个密码');
        break;
      }
      case 'add-tag':
        openTagEditor();
        break;
      case 'remove-tag':
        removeTagFromCurrent(actionEl.dataset.tag);
        break;
      case 'add-url': {
        if (!note.url && note.kind === 'memo') {
          const holder = document.createElement('div');
          holder.innerHTML = urlLineHTML(note, true);
          const line = holder.firstElementChild;
          actionEl.replaceWith(line);
          const input = $('#urlInput');
          if (input) input.focus();
        }
        break;
      }
      case 'capture':
        openCapture();
        break;
      case 'paste-capture':
        openCapture({ fromClipboard: true });
        break;
      case 'import-bookmarks':
        triggerImport('bookmarks');
        break;
      case 'clear-search':
        clearSearch();
        break;
      default:
        break;
    }
  }

  function onDetailInput(e) {
    const note = currentNote();
    if (!note) return;
    const target = e.target;
    if (target.id === 'detailTitle') {
      autoGrow(target);
      note.title = target.value.slice(0, 300);
      note.updatedAt = Date.now();
      scheduleSave();
      scheduleListRefresh();
      const wc = $('#wordCount');
      if (wc) wc.textContent = wordCount(note.body + note.title) + ' 字';
    } else if (target.id === 'detailBody') {
      autoGrow(target);
      note.body = target.value;
      note.updatedAt = Date.now();
      scheduleSave();
      scheduleListRefresh();
      const wc = $('#wordCount');
      if (wc) wc.textContent = wordCount(note.body + note.title) + ' 字';
    } else if (target.id === 'secretUser') {
      note.username = target.value.slice(0, 300);
      note.updatedAt = Date.now();
      scheduleSave();
      scheduleListRefresh();
    } else if (target.id === 'secretPass') {
      note.password = target.value.slice(0, 500);
      note.updatedAt = Date.now();
      scheduleSave();
      scheduleListRefresh();
      const wrap = $('#strengthWrap');
      if (wrap) wrap.innerHTML = strengthHTML(note.password);
    }
  }

  function onDetailKeydown(e) {
    if (e.isComposing) return;
    if (e.target.id === 'detailTitle' && e.key === 'Enter') {
      e.preventDefault();
      const body = $('#detailBody');
      if (body) body.focus();
    } else if (e.target.id === 'urlInput' && e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-action]')) {
      e.preventDefault();
      e.target.click();
    }
  }

  /* ---------- 20. Lock screen ---------- */
  function showLock() {
    state.crypto.locked = true;
    const root = $('#lockRoot');
    if (!root) return;
    if ($('.lock-screen')) {
      const input = $('#lockPass');
      if (input) input.focus();
      return;
    }
    root.innerHTML = `
      <div class="lock-screen">
        <div class="lock-card" id="lockCard">
          <div class="lock-fish">${fishDoodle()}</div>
          <h2>上锁了。</h2>
          <p>密码。</p>
          <form class="lock-form" id="lockForm">
            <input class="input" id="lockPass" type="password" autocomplete="current-password" placeholder="密码" aria-label="密码">
            <div class="lock-error" id="lockError"></div>
            <button class="btn primary" type="submit" id="lockSubmit">开</button>
          </form>
          <div class="lock-foot">AES-256-GCM · 忘了就真没了</div>
        </div>
      </div>`;
    renderVaultLine();
    const form = $('#lockForm');
    const input = $('#lockPass');
    const submit = $('#lockSubmit');
    setTimeout(() => input && input.focus(), 80);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pass = input.value;
      if (!pass) { input.focus(); return; }
      submit.disabled = true;
      submit.textContent = '正在解锁…';
      $('#lockError').textContent = '';
      try {
        const result = await decryptVault(state.crypto.envelope, pass);
        const notes = Array.isArray(result.data.notes) ? result.data.notes.map(hydrateNote).filter(Boolean) : [];
        const diaries = Array.isArray(result.data.diaries) ? result.data.diaries.map(hydrateDiary).filter(Boolean) : [];
        const noteFolders = Array.isArray(result.data.noteFolders) ? result.data.noteFolders.map(hydrateNoteFolder).filter(Boolean) : [];
        const noteItems = Array.isArray(result.data.noteItems) ? result.data.noteItems.map(hydrateNoteItem).filter(Boolean) : [];
        const scheduleEvents = Array.isArray(result.data.scheduleEvents) ? result.data.scheduleEvents.map(hydrateScheduleEvent).filter(Boolean) : [];
        const plans = Array.isArray(result.data.plans) ? result.data.plans.map(hydratePlan).filter(Boolean) : [];
        state.notes = notes;
        state.diaries = diaries;
        state.noteFolders = noteFolders;
        state.noteItems = noteItems;
        state.scheduleEvents = scheduleEvents;
        state.plans = plans;
        sanitizeNoteStore();
        state.crypto.key = result.key;
        state.crypto.salt = result.salt;
        state.crypto.encrypted = true;
        state.crypto.locked = false;
        state.settings.lockEnabled = true;
        saveSettings();
        root.innerHTML = '';
        state.lastActivity = Date.now();
        renderVaultLine();
        renderChrome();
        renderList();
        renderDetail();
        if (state.ui.space === 'diary') renderDiary();
        if (state.ui.space === 'notes') renderNotesSpace();
        if (state.ui.space === 'plan') renderPlanSpace();
        if (state.ui.space === 'schedule') renderScheduleSpace();
        if (state.ui.space === 'trash') renderTrash();
        queueScheduleReminderSync();
        toast('开了');
        consumeLaunchParams();
      } catch (err) {
        $('#lockError').textContent = '不对';
        const card = $('#lockCard');
        if (card) {
          card.classList.remove('lock-shake');
          void card.offsetWidth;
          card.classList.add('lock-shake');
        }
        input.value = '';
        input.focus();
        submit.disabled = false;
        submit.textContent = '开';
      }
    });
  }

  async function lockNow() {
    if (!state.crypto.encrypted) { toast('还没上锁'); return; }
    clearTimeout(state.save.timer);
    await persist();
    closeOverlay();
    state.crypto.locked = true;
    state.crypto.key = null;
    state.notes = [];
    state.diaries = [];
    state.noteFolders = [];
    state.noteItems = [];
    state.scheduleEvents = [];
    state.plans = [];
    state.notesSpace.draft = null;
    state.notesSpace.edit = null;
    state.selectedId = null;
    state.settings.lastSelectedId = null;
    saveSettings();
    renderChrome();
    renderList();
    renderDetail();
    queueScheduleReminderSync();
    showLock();
  }

  function checkAutoLock() {
    if (!state.crypto.encrypted || state.crypto.locked) return;
    const minutes = Number(state.settings.autoLock);
    if (minutes > 0 && Date.now() - state.lastActivity > minutes * 60 * 1000) {
      lockNow();
    }
  }

  /* ---------- 21. Clipboard / native bridge ---------- */
  let clipSeq = 0;
  const pendingClipboard = new Map();

  function readClipboardText() {
    return new Promise(async (resolve) => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) { resolve(text); return; }
      } catch {}
      if (!IS_NATIVE) { resolve(''); return; }
      const id = ++clipSeq;
      const timer = setTimeout(() => {
        pendingClipboard.delete(id);
        resolve('');
      }, 1400);
      pendingClipboard.set(id, (text) => {
        clearTimeout(timer);
        pendingClipboard.delete(id);
        resolve(text);
      });
      sendNative({ type: 'clipboard-read', id });
    });
  }

  function sendNative(payload) {
    if (!IS_NATIVE) return;
    try { window.chrome.webview.postMessage(payload); } catch (err) { console.warn(err); }
  }

  function onHotkey() {
    if (state.crypto.locked) {
      showLock();
      setTimeout(() => $('#lockPass')?.focus(), 40);
      return;
    }
    if (state.ui.overlay && state.ui.overlay.kind === 'capture') {
      const input = $('#capUrl') || $('#capTitle');
      if (input) input.focus();
      return;
    }
    if (state.ui.overlay) closeOverlay();
    openCapture();
  }

  function onNativeMessage(event) {
    let msg = event && event.data;
    if (typeof msg === 'string') {
      try { msg = JSON.parse(msg); } catch { return; }
    }
    if (!msg || !msg.type) return;
    if (msg.type === 'platform') {
      state.platform.native = true;
      state.platform.autostart = !!msg.autostart;
      state.platform.hotkeyRegistered = msg.hotkeyRegistered !== false;
      if (msg.hotkey) state.platform.hotkey = msg.hotkey;
      if (msg.version) state.platform.version = msg.version;
      syncHotkeyHints();
      if (!state.selectedId && !state.query && !state.ui.overlay) renderDetail();
      if (state.ui.overlay && state.ui.overlay.kind === 'settings') renderSettings();
      renderVaultLine();
    } else if (msg.type === 'credentials-list') {
      state.ui.credentials = Array.isArray(msg.items) ? msg.items : [];
      state.ui.credentialsLoaded = true;
      state.ui.credentialsLoading = false;
      state.ui.credentialsError = '';
      if (state.ui.overlay && state.ui.overlay.kind === 'settings' && state.ui.settingsTab === 'api') renderSettings();
    } else if (msg.type === 'credential-created') {
      state.ui.credentialsLoading = false;
      state.ui.credentialsLoaded = true;
      state.ui.credentialsError = '';
      state.ui.credentialKey = String(msg.key || '');
      if (msg.item) {
        state.ui.credentials = (state.ui.credentials || []).filter((item) => item.id !== msg.item.id);
        state.ui.credentials.unshift(msg.item);
      }
      if (state.ui.overlay && state.ui.overlay.kind === 'settings') renderSettings();
      toast('凭证建好了');
    } else if (msg.type === 'credential-key') {
      const key = String(msg.key || '');
      if (key) {
        copyText(key, '密钥已复制').then((ok) => {
          if (!ok) {
            state.ui.credentialKey = key;
            if (state.ui.overlay && state.ui.overlay.kind === 'settings') renderSettings();
          }
        });
      }
    } else if (msg.type === 'credential-changed') {
      state.ui.credentialsLoaded = false;
      state.ui.credentialsLoading = false;
      requestCredentials(true);
    } else if (msg.type === 'credential-error') {
      state.ui.credentialsLoading = false;
      state.ui.credentialsLoaded = true;
      state.ui.credentialsError = String(msg.message || '凭证操作失败');
      if (state.ui.overlay && state.ui.overlay.kind === 'settings') renderSettings();
    } else if (msg.type === 'api-request') {
      handleNativeApiRequest(msg);
    } else if (msg.type === 'hotkey') {
      onHotkey();
    } else if (msg.type === 'clipboard') {
      const resolver = pendingClipboard.get(msg.id);
      if (resolver) resolver(String(msg.text || ''));
    } else if (msg.type === 'toast') {
      toast(String(msg.message || ''));
    } else if (msg.type === 'open-settings') {
      openSettings();
    } else if (msg.type === 'open-schedule') {
      setSpace('schedule');
    } else if (msg.type === 'open-capture') {
      if (state.crypto.locked) showLock();
      else openCapture({ kind: msg.kind === 'password' ? 'password' : 'site' });
    } else if (msg.type === 'open-diary') {
      if (state.crypto.locked) showLock();
      else { setSpace('diary'); diaryToday(); }
    } else if (msg.type === 'open-notes-new') {
      if (state.crypto.locked) showLock();
      else { setSpace('notes'); newNote(); }
    } else if (msg.type === 'open-schedule-new') {
      if (state.crypto.locked) showLock();
      else { setSpace('schedule'); openScheduleEditor({ date: scheduleNewDate() }); }
    } else if (msg.type === 'lock') {
      lockNow();
    }
  }

  function initNative() {
    if (!IS_NATIVE) return;
    document.body.classList.add('native-app');
    try {
      window.chrome.webview.addEventListener('message', onNativeMessage);
      window.moyuNative = {
        onHotkey,
        onShow() {},
        onLock() { lockNow(); },
        onPlatform(platform) { onNativeMessage({ data: Object.assign({ type: 'platform' }, platform || {}) }); },
        openCapture(options) { openCapture(options || {}); },
        createNote(payload) { return createNoteFromExternal(payload); },
        isLocked() { return !!state.crypto.locked; }
      };
      sendNative({ type: 'ready' });
      sendNative({ type: 'request-platform' });
      sendNative({ type: 'theme', dark: document.documentElement.dataset.theme === 'dark' });
    } catch (err) {
      console.warn('native bridge unavailable', err);
    }
  }

  /* ---------- 22. Launch params / PWA ---------- */
  function consumeLaunchParams() {
    let route = '';
    let params = new URLSearchParams();
    let hadParams = false;
    try {
      const hash = location.hash.replace(/^#/, '');
      const qAt = hash.indexOf('?');
      route = qAt >= 0 ? hash.slice(0, qAt) : hash;
      const hashParams = new URLSearchParams(qAt >= 0 ? hash.slice(qAt + 1) : '');
      const search = new URLSearchParams(location.search);
      params = hashParams;
      for (const [k, v] of search.entries()) if (!params.has(k)) params.set(k, v);
      hadParams = !!(route || location.search);
      if (route === 'capture' || location.search.includes('capture') || params.has('url') || params.has('text')) {
        const url = params.get('url') || '';
        const title = params.get('title') || '';
        const text = params.get('text') || '';
        setTimeout(() => openCapture({ url, title, text }), 120);
      } else if (route === 'settings') {
        setTimeout(() => openSettings(), 120);
      }
      if (hadParams) {
        try { history.replaceState(null, '', location.pathname); } catch {}
      }
    } catch (err) {
      console.warn(err);
    }
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(location.protocol)) return;
    if (location.hostname === 'moyu.local') return;
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  /* ---------- 23. Global bindings ---------- */
  function bindChrome() {
    $('#activityBar')?.addEventListener('click', (e) => {
      const item = e.target.closest('[data-space]');
      if (item) setSpace(item.dataset.space);
    });
    $('#spaceBackBtn')?.addEventListener('click', () => setSpace('memo'));
    $('#diarySide')?.addEventListener('click', onDiarySideClick);
    $('#diaryDetail')?.addEventListener('click', onDiaryDetailClick);
    $('#diaryDetail')?.addEventListener('input', onDiaryInput);
    $('#notesSide')?.addEventListener('click', onNotesSideClick);
    $('#notesSide')?.addEventListener('keydown', onNotesSideKeydown);
    $('#notesSide')?.addEventListener('focusout', (e) => {
      if (e.target && e.target.id === 'notesFolderInput') commitFolderEdit();
    }, true);
    $('#notesTree')?.addEventListener('dragstart', onNoteFolderDragStart);
    $('#notesTree')?.addEventListener('dragover', onNoteFolderDragOver);
    $('#notesTree')?.addEventListener('dragleave', onNoteFolderDragLeave);
    $('#notesTree')?.addEventListener('drop', onNoteFolderDrop);
    $('#notesTree')?.addEventListener('dragend', onNoteFolderDragEnd);
    document.addEventListener('dragover', (e) => {
      if (!noteFolderDragId || e.target.closest('#notesTree')) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    }, true);
    document.addEventListener('drop', (e) => {
      if (!noteFolderDragId || e.target.closest('#notesTree')) return;
      e.preventDefault();
      e.stopPropagation();
      onNoteFolderDragEnd();
    }, true);
    $('#notesDetail')?.addEventListener('click', onNotesDetailClick);
    $('#notesDetail')?.addEventListener('input', onNotesDetailInput);
    $('#notesDetail')?.addEventListener('change', onNotesDetailChange);
    $('#planSide')?.addEventListener('click', onPlanClick);
    $('#planDetail')?.addEventListener('click', onPlanClick);
    $('#planDetail')?.addEventListener('input', onPlanInput);
    $('#scheduleSpace')?.addEventListener('click', onScheduleClick);
    $('#trashSpace')?.addEventListener('click', onTrashClick);
    $('#captureBtn')?.addEventListener('click', () => openCapture());
    $('#settingsBtn')?.addEventListener('click', () => openSettings());
    $('#trashBtn')?.addEventListener('click', () => {
      if (state.ui.space === 'trash') {
        state.trash.tab = 'all';
        renderTrash();
      } else {
        openTrash();
      }
    });
    $('#lockNowBtn')?.addEventListener('click', lockNow);
    $('#brandLink')?.addEventListener('click', (e) => { e.preventDefault(); resetView(); });

    $('#filterBtn')?.addEventListener('click', () => setFilterPanel(!state.ui.filterOpen));
    $('#filterChips')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-clear-filter]');
      if (btn) clearFilterKey(btn.dataset.clearFilter);
    });
    $('#filterPop')?.addEventListener('click', (e) => {
      if (e.target.closest('[data-filter-close]')) { closeFilterPanel(true); return; }
      if (e.target.closest('[data-filter-reset]')) { resetFilter(); return; }
      const type = e.target.closest('[data-filter-type]');
      if (type) { applyFilter({ type: type.dataset.filterType }); return; }
      const tag = e.target.closest('[data-filter-tag]');
      if (tag) {
        applyFilter({ tag: state.filter.tag === tag.dataset.filterTag ? null : tag.dataset.filterTag });
        return;
      }
      const flag = e.target.closest('[data-filter-flag]');
      if (flag) {
        const key = flag.dataset.filterFlag;
        if (key === 'days') applyFilter({ days: state.filter.days ? 0 : 7 });
        else applyFilter({ [key]: !state.filter[key] });
      }
    });
    document.addEventListener('click', (e) => {
      if (!state.ui.filterOpen) return;
      const wrap = $('#filterWrap');
      if (wrap && !wrap.contains(e.target)) closeFilterPanel();
    });

    $('#noteList')?.addEventListener('click', onListClick);
    $('#noteList')?.addEventListener('keydown', onListKeydown);
    $('#detailPane')?.addEventListener('click', onDetailClick);
    $('#detailPane')?.addEventListener('input', onDetailInput);
    $('#detailPane')?.addEventListener('keydown', onDetailKeydown);
    $('#detailPane')?.addEventListener('focusout', (e) => {
      if (e.target.id === 'urlInput') commitUrlField(e.target);
    });

    const search = $('#searchInput');
    search?.addEventListener('input', () => {
      state.query = search.value;
      updateSearchClear();
      renderList();
    });
    search?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (search.value) { clearSearch(); }
        else search.blur();
      } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
        const notes = visibleNotes();
        if (!notes.length) return;
        e.preventDefault();
        selectNote(notes[0].id);
      }
    });
    $('#searchBox')?.addEventListener('click', () => search?.focus());
    $('#searchClear')?.addEventListener('click', () => { clearSearch(); search?.focus(); });

    $('#fileInput')?.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      const mode = state.ui.importMode;
      if (!file) return;
      const text = await readFile(file);
      if (mode === 'json') importJSON(text);
      else importBookmarksHTML(text);
      e.target.value = '';
      if (state.ui.overlay && state.ui.overlay.kind === 'settings') renderSettings();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 760) {
        $('#app').classList.remove('show-detail');
        $('#app').classList.remove('show-diary-detail');
        $('#app').classList.remove('show-note-detail');
        $('#app').classList.remove('show-plan-detail');
        $('#app').classList.remove('show-schedule-side');
      }
    });

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => { if (state.settings.theme === 'system') applyTheme(); };
    if (media.addEventListener) media.addEventListener('change', onScheme);
    else if (media.addListener) media.addListener(onScheme);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearTimeout(state.save.timer);
        persist();
      }
    });
    window.addEventListener('pagehide', () => {
      if (!state.crypto.encrypted && !state.crypto.locked) {
        const payload = {
          v: 1,
          enc: false,
          notes: state.notes,
          diaries: state.diaries,
          noteFolders: state.noteFolders,
          noteItems: state.noteItems,
          scheduleEvents: state.scheduleEvents,
          plans: state.plans,
          updatedAt: Date.now()
        };
        try { localStorage.setItem(VAULT_KEY, JSON.stringify(payload)); } catch {}
      }
    });
  }

  /* ---------- Context menu ---------- */
  function closeContextMenu() {
    const menu = $('#contextMenu');
    if (menu) {
      menu.hidden = true;
      menu.innerHTML = '';
    }
    state.ui.contextMenu = null;
  }

  function openContextMenu(x, y, items) {
    const menu = $('#contextMenu');
    if (!menu || !items || !items.length) return;
    closeContextMenu();
    menu.innerHTML = items.map((item, index) => {
      if (item.separator) return '<div class="context-sep" role="separator"></div>';
      return `<button class="context-item ${item.danger ? 'danger' : ''}" type="button" role="menuitem" data-cm-index="${index}" ${item.disabled ? 'disabled' : ''}>
        <span class="context-icon">${icon(item.icon || 'note')}</span><span>${esc(item.label)}</span>
      </button>`;
    }).join('');
    menu.hidden = false;
    menu.style.left = '0px';
    menu.style.top = '0px';
    const rect = menu.getBoundingClientRect();
    const left = Math.min(Math.max(8, x), Math.max(8, window.innerWidth - rect.width - 8));
    const top = Math.min(Math.max(8, y), Math.max(8, window.innerHeight - rect.height - 8));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    state.ui.contextMenu = { items, openedAt: performance.now() };
    const first = menu.querySelector('.context-item:not([disabled])');
    if (first) first.focus({ preventScroll: true });
  }

  function contextMenuItemsFor(target) {
    const trashRow = target.closest('[data-trash-type][data-trash-id]');
    if (trashRow) {
      const type = trashRow.dataset.trashType;
      const id = trashRow.dataset.trashId;
      const entry = trashEntries().find((item) => item.type === type && item.id === id);
      return [
        { label: '恢复', icon: 'restore', action: () => restoreTrashEntry(type, id) },
        { label: '复制标题', icon: 'copy', action: () => copyText(entry?.title || '') },
        { separator: true },
        { label: '彻底删除', icon: 'trash', danger: true, action: () => purgeTrashEntry(type, id) }
      ];
    }

    const memo = target.closest('.note-item[data-id]');
    if (memo) {
      const note = state.notes.find((entry) => entry.id === memo.dataset.id && !entry.deletedAt);
      if (!note) return [];
      const title = note.title.trim() || note.url || '无题';
      return [
        { label: '打开', icon: 'note', action: () => selectNote(note.id) },
        { label: '复制标题', icon: 'copy', action: () => copyText(title) },
        note.url ? { label: '打开链接', icon: 'external', action: () => openExternal(note.url) } : null,
        { label: '复制正文', icon: 'copy', action: () => copyText(note.body || '') },
        { separator: true },
        { label: note.pinned ? '取消置顶' : '置顶', icon: 'pin', action: () => { selectNote(note.id, { openMobile: false }); pinCurrent(); } },
        { separator: true },
        { label: '移到纸篓', icon: 'trash', danger: true, action: () => { selectNote(note.id, { openMobile: false }); deleteCurrentNote(); } }
      ].filter(Boolean);
    }

    const noteCard = target.closest('[data-note-id]');
    if (noteCard) {
      const item = state.noteItems.find((entry) => entry.id === noteCard.dataset.noteId && !entry.deletedAt);
      if (!item) return [];
      return [
        { label: '打开', icon: 'note', action: () => selectNoteItem(item.id) },
        { label: '复制标题', icon: 'copy', action: () => copyText(item.title.trim() || firstLine(item.body) || '无题') },
        { label: '复制正文', icon: 'copy', action: () => copyText(item.body || '') },
        { label: '导出 Markdown', icon: 'download', action: () => exportNotesMarkdown(item) },
        { separator: true },
        { label: '移到纸篓', icon: 'trash', danger: true, action: () => { state.notesSpace.selectedId = item.id; deleteCurrentNoteItem(); } }
      ];
    }

    const folderRow = target.closest('[data-note-folder-row]');
    if (folderRow) {
      const folder = noteFolderById(folderRow.dataset.noteFolderRow);
      if (!folder) return [];
      return [
        { label: '新建子文件夹', icon: 'plus', action: () => startFolderEdit('new', null, folder.id) },
        { label: '重命名', icon: 'pen', action: () => startFolderEdit('rename', folder.id) },
        { label: '移到顶层', icon: 'folder', action: () => moveNoteFolder(folder.id, null, null, 'end') },
        { separator: true },
        { label: '删除文件夹', icon: 'trash', danger: true, action: () => deleteNoteFolder(folder.id) }
      ];
    }

    const planCard = target.closest('[data-plan-id]');
    if (planCard) {
      const plan = state.plans.find((entry) => entry.id === planCard.dataset.planId && !entry.deletedAt);
      if (!plan) return [];
      return [
        { label: '打开', icon: 'plan', action: () => selectPlan(plan.id) },
        { label: '复制标题', icon: 'copy', action: () => copyText(planTitle(plan)) },
        { label: '复制正文', icon: 'copy', action: () => copyText(plan.body || '') },
        { label: '导出 Markdown', icon: 'download', action: () => exportPlansMarkdown(plan) },
        { separator: true },
        { label: '移到纸篓', icon: 'trash', danger: true, action: () => { state.planSpace.selectedId = plan.id; deleteCurrentPlan(); } }
      ];
    }

    const scheduleEvent = target.closest('[data-schedule-id]');
    if (scheduleEvent) {
      const event = state.scheduleEvents.find((entry) => entry.id === scheduleEvent.dataset.scheduleId && !entry.deletedAt);
      if (!event) return [];
      return [
        { label: '编辑', icon: 'pen', action: () => openScheduleEditor({ id: event.id }) },
        { label: '复制标题', icon: 'copy', action: () => copyText(event.title || '未命名') },
        { label: '复制时间', icon: 'copy', action: () => copyText(`${event.date} ${event.time || '全天'}`) },
        { separator: true },
        { label: '移到纸篓', icon: 'trash', danger: true, action: () => deleteScheduleEvent(event.id) }
      ];
    }

    const scheduleDay = target.closest('[data-schedule-day]');
    if (scheduleDay) {
      const date = scheduleDay.dataset.scheduleDay;
      return [
        { label: '新建日程', icon: 'plus', action: () => openScheduleEditor({ date }) },
        { label: '打开日视图', icon: 'calendar', action: () => { state.schedule.anchor = date; state.schedule.view = 'day'; renderScheduleSpace(); } }
      ];
    }

    const diaryDay = target.closest('[data-diary-date]');
    if (diaryDay) {
      const date = diaryDay.dataset.diaryDate;
      const entry = diaryEntryByDate(date);
      return [
        { label: '打开这天', icon: 'book', action: () => selectDiaryDate(date) },
        entry ? { label: '复制正文', icon: 'copy', action: () => copyText(entry.body || '') } : null,
        entry ? { label: '导出这天', icon: 'download', action: () => exportDiariesMarkdown(entry) } : null,
        entry ? { separator: true } : null,
        entry ? { label: '删掉这天', icon: 'trash', danger: true, action: () => { selectDiaryDate(date); deleteCurrentDiary(); } } : null
      ].filter(Boolean);
    }

    const noteScope = target.closest('[data-note-scope]');
    if (noteScope) {
      const scope = noteScope.dataset.noteScope;
      return [
        { label: '在这个分类新建笔记', icon: 'plus', action: () => { selectNotesScope(scope); newNote(); } }
      ];
    }

    return [];
  }

  function isTextInput(field) {
    if (!field) return false;
    if (field.tagName === 'TEXTAREA') return true;
    if (field.tagName !== 'INPUT') return false;
    return !['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'range', 'color', 'image', 'hidden', 'number', 'date', 'time', 'datetime-local', 'month', 'week'].includes(String(field.type || 'text').toLowerCase());
  }

  function bindContextMenu() {
    document.addEventListener('contextmenu', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest('#contextMenu')) return;
      e.preventDefault();
      const field = target.closest('input, textarea');
      if (isTextInput(field)) {
        openContextMenu(e.clientX, e.clientY, editableContextItems(field));
        return;
      }
      const items = contextMenuItemsFor(target);
      if (items.length) {
        openContextMenu(e.clientX, e.clientY, items);
      } else {
        const generic = genericContextMenuItems();
        if (generic.length) openContextMenu(e.clientX, e.clientY, generic);
        else closeContextMenu();
      }
    }, true);

    document.addEventListener('mousedown', (e) => {
      const menu = $('#contextMenu');
      if (!menu || menu.hidden) return;
      if (!menu.contains(e.target)) closeContextMenu();
    }, true);

    window.addEventListener('wheel', () => closeContextMenu(), { passive: true });

    $('#contextMenu')?.addEventListener('click', (e) => {
      const button = e.target.closest('[data-cm-index]');
      if (!button) return;
      e.preventDefault();
      e.stopPropagation();
      const item = state.ui.contextMenu?.items[Number(button.dataset.cmIndex)];
      closeContextMenu();
      if (item && item.action) item.action();
    });

    $('#contextMenu')?.addEventListener('keydown', (e) => {
      const buttons = $$('.context-item:not([disabled])', $('#contextMenu'));
      const current = buttons.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeContextMenu(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); buttons[(current + 1 + buttons.length) % buttons.length]?.focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); buttons[(current - 1 + buttons.length) % buttons.length]?.focus(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); document.activeElement?.click(); }
    });
  }

  function bindGlobal() {
    document.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      const overlay = state.ui.overlay;
      if (overlay) return;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        focusSearch();
        return;
      }
      if (mod && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        openCapture();
        return;
      }
      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openCapture();
        return;
      }
      if (!IS_NATIVE && e.altKey && !mod && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openCapture();
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'l' && state.crypto.encrypted) {
        e.preventDefault();
        lockNow();
        return;
      }
      if (!isEditable(e.target) && e.key === '/') {
        e.preventDefault();
        focusSearch();
        return;
      }
      if (!isEditable(e.target) && e.key === '?') {
        e.preventDefault();
        openShortcuts();
        return;
      }
      if (e.key === 'Escape') {
        if (state.ui.filterOpen) { closeFilterPanel(true); return; }
        if (state.ui.space === 'diary') {
          if ($('#app').classList.contains('show-diary-detail')) backToDiaryCalendar();
          return;
        }
        if (state.ui.space === 'notes') {
          if ($('#app').classList.contains('show-note-detail')) $('#app').classList.remove('show-note-detail');
          return;
        }
        if (state.ui.space === 'plan') {
          if ($('#app').classList.contains('show-plan-detail')) $('#app').classList.remove('show-plan-detail');
          return;
        }
        if (state.ui.space === 'schedule') {
          if ($('#app').classList.contains('show-schedule-side')) $('#app').classList.remove('show-schedule-side');
          return;
        }
        if (state.ui.space === 'trash') {
          setSpace(state.trash.returnSpace && state.trash.returnSpace !== 'trash' ? state.trash.returnSpace : 'memo');
          return;
        }
        if (state.ui.space !== 'memo') { setSpace('memo'); return; }
        if (window.innerWidth <= 760 && $('#app').classList.contains('show-detail')) { backToList(); return; }
        if (document.activeElement === $('#searchInput')) {
          if ($('#searchInput').value) clearSearch();
          else $('#searchInput').blur();
        }
        return;
      }
      if (!isEditable(e.target) && state.ui.space === 'memo' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        moveSelection(e.key === 'ArrowDown' ? 1 : -1);
      }
    });

    ['pointerdown', 'keydown', 'touchstart'].forEach((evt) => {
      window.addEventListener(evt, () => { state.lastActivity = Date.now(); }, { passive: true, capture: true });
    });
    window.addEventListener('focus', () => { state.lastActivity = Date.now(); });
  }

  /* ---------- 24. Boot ---------- */
  function boot() {
    state.settings = loadSettings();
    state.sort = state.settings.sort || 'updated';
    applyTheme(false);
    paintStaticIcons();
    bindChrome();
    bindGlobal();
    bindContextMenu();
    bindDrop();

    loadVault();

    if (!state.crypto.locked && state.settings.lastSelectedId) {
      const note = state.notes.find((n) => n.id === state.settings.lastSelectedId && !n.deletedAt);
      if (note) state.selectedId = note.id;
    }

    renderChrome();
    renderList();
    renderDetail();
    renderVaultLine();
    updateSearchClear();
    initNative();
    if (!state.crypto.locked) setTimeout(queueScheduleReminderSync, 1200);

    if (IS_NATIVE && !state.crypto.locked) {
      setTimeout(() => persist(), 1200);
    }

    if (state.crypto.locked) {
      showLock();
    } else {
      consumeLaunchParams();
    }

    setInterval(checkAutoLock, 15000);
    setInterval(() => {
      if (state.ui.space === 'schedule' && !state.crypto.locked && !state.ui.overlay) {
        const list = $('#schedUpcoming');
        const top = list ? list.scrollTop : 0;
        renderScheduleSidebar();
        if (list) list.scrollTop = top;
      }
    }, 60000);

    if (storageBroken) {
      setTimeout(() => toast('这里存不了，用桌面版吧', { icon: 'shield', duration: 6000 }), 800);
    }

    syncHotkeyHints();

    registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

/**
 * Build-time static landing (SSG for crawlers and clients without JavaScript).
 *
 * The app is a client-rendered SPA on static hosting (GitHub Pages / Firebase Hosting),
 * so the HTML that leaves the server contains no content at all — a search engine that
 * does not execute JavaScript sees an empty page. Real SSR would need a Node runtime,
 * which neither host has, so the indexable content is generated here instead, at build
 * time, and injected into #root. React replaces it on mount, so the running app is
 * unchanged.
 *
 * The wording is read from the same locale file the app uses (src/locales/en.json), so
 * the shell cannot drift from the UI, and the links are built from the canonical URL
 * that index.html already declares — no second copy of the address.
 *
 * Only the public landing is generated. The authenticated app (plans, profile, friends)
 * is per-user data behind sign-in and must not be prerendered.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

export const STATIC_LANDING_START = '<!-- static-landing:start -->';
export const STATIC_LANDING_END = '<!-- static-landing:end -->';

const LOCALE_FILE = 'src/locales/en.json';
const CANONICAL_LINK = /<link[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*>/i;

/**
 * Tailwind classes copied verbatim from the same elements in App.tsx, so the utilities
 * are guaranteed to exist in the compiled CSS and the shell is styled before any
 * JavaScript has run. No inline styles and no scripts, so the production CSP is
 * untouched.
 */
const CLASS = {
  page: 'min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white font-sans',
  main: 'max-w-3xl mx-auto px-6 py-16 space-y-8',
  hero: 'bg-gradient-to-br from-emerald-500/10 to-transparent p-8 rounded-[32px] border border-emerald-500/10 dark:border-emerald-500/10',
  h1: 'text-3xl font-bold mb-3 tracking-tight leading-tight italic font-black',
  lead: 'text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6 max-w-md italic',
  row: 'flex flex-wrap gap-3',
  ctaPrimary:
    'px-6 py-3.5 rounded-2xl bg-emerald-500 text-black font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20',
  ctaSecondary:
    'px-6 py-3.5 rounded-2xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 shadow-sm',
  section: 'space-y-4',
  h2: 'text-2xl font-black italic uppercase tracking-tighter',
  h2Small: 'text-zinc-600 dark:text-zinc-400 text-xs font-bold uppercase tracking-[0.2em]',
  muted: 'text-zinc-600 dark:text-zinc-400 italic text-sm',
};

type Locale = Record<string, unknown>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readLocale(): Locale {
  const file = resolve(process.cwd(), LOCALE_FILE);
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Locale;
  } catch (error) {
    throw new Error(
      `[static-landing] could not read ${LOCALE_FILE}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function pick(locale: Locale, key: string): string {
  const value = key.split('.').reduce<unknown>((node, part) => (node as Locale | undefined)?.[part], locale);
  if (typeof value !== 'string') {
    throw new Error(`[static-landing] missing translation key "${key}" in ${LOCALE_FILE}`);
  }
  return escapeHtml(value);
}

function renderShell(locale: Locale, site: string): string {
  const link = (label: string, href: string, className: string) =>
    `<a class="${className}" href="${escapeHtml(href)}">${label}</a>`;

  return `
    <div class="${CLASS.page}">
      <main class="${CLASS.main}">
        <div class="${CLASS.hero}">
          <h1 class="${CLASS.h1}">${pick(locale, 'home.hero_title')}</h1>
          <p class="${CLASS.lead}">${pick(locale, 'home.hero_subtitle')}</p>
          <div class="${CLASS.row}">
            ${link(pick(locale, 'home.create_plan'), site, CLASS.ctaPrimary)}
            ${link(pick(locale, 'home.join_plan'), site, CLASS.ctaSecondary)}
          </div>
        </div>

        <div class="${CLASS.section}">
          <h2 class="${CLASS.h2Small}">${pick(locale, 'home.active_plans')}</h2>
          <p class="${CLASS.muted}">${pick(locale, 'home.no_active_plans')}</p>
        </div>

        <div class="${CLASS.section}">
          <h2 class="${CLASS.h2}">${pick(locale, 'auth.login')}</h2>
          <p class="${CLASS.lead}">${pick(locale, 'auth.login_subtitle')}</p>
          <div class="${CLASS.row}">
            ${link(pick(locale, 'auth.continue_google'), site, CLASS.ctaPrimary)}
          </div>
        </div>
      </main>
    </div>`;
}

export function staticLanding(): Plugin {
  return {
    name: 'static-landing',
    transformIndexHtml(html) {
      const start = html.indexOf(STATIC_LANDING_START);
      const end = html.indexOf(STATIC_LANDING_END);
      if (start === -1 || end === -1 || end < start) {
        throw new Error(
          `[static-landing] ${STATIC_LANDING_START} … ${STATIC_LANDING_END} not found in index.html — ` +
            'without those markers the page would ship without any indexable content.',
        );
      }
      const site = html.match(CANONICAL_LINK)?.[1] ?? '/';
      const shell = renderShell(readLocale(), site);
      return html.slice(0, start + STATIC_LANDING_START.length) + shell + html.slice(end);
    },
  };
}

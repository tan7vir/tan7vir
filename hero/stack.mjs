#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const HERE = dirname(fileURLToPath(import.meta.url));
const STACK = [
  ['ai / ml', [['python', 'Python', '3776AB'], ['pytorch', 'PyTorch', 'EE4C2C'], ['googlegemini', 'Gemini', '8E75B2'], ['ollama', 'Ollama', '000000'], ['claude', 'Claude', 'D97757'], ['openai', 'Codex', '000000']]],
  ['backend', [['fastapi', 'FastAPI', '009688'], ['nodedotjs', 'Node.js', '5FA04E'], ['express', 'Express', '0A0A0A'], ['postgresql', 'PostgreSQL', '4169E1'], ['mongodb', 'MongoDB', '47A248'], ['redis', 'Redis', 'FF4438']]],
  ['frontend', [['typescript', 'TypeScript', '3178C6'], ['react', 'React', '61DAFB'], ['nextdotjs', 'Next.js', '000000'], ['tailwindcss', 'Tailwind CSS', '06B6D4']]],
  ['desktop', [['rust', 'Rust', '000000'], ['tauri', 'Tauri', '24C8D8']]],
  ['infra', [['docker', 'Docker', '2496ED'], ['vercel', 'Vercel', '000000'], ['hetzner', 'Hetzner', 'D50C2D'], ['cloudflare', 'Cloudflare', 'F38020'], ['git', 'Git', 'F03C2E']]],
];
const THEMES = {
  dark: { bg: '#0a0a0b', fg: '#f5f2ea', accent: '#ff7a1a' },
  light: { bg: '#f5f2ea', fg: '#111111', accent: '#c45a0e' },
};
const VIEW = { w: 1200, radius: 20, pad: 40, row: 84 };
const COL = { label: 56, logos: 300, logo: 54, gap: 46, right: 1144 };
const MIN_CONTRAST = 3;
const MAX_BYTES = 150_000;

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v * t + y[i] * (1 - t)).toString(16).padStart(2, '0')).join('')}`;
};
const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};

// Brand colours that vanish on the card (black on dark, cyan on cream) move toward the
// text colour only until they clear WCAG's 3:1 for graphics, so each mark keeps its hue.
function visible(hex, theme) {
  for (let step = 0; step <= 20; step += 1) {
    const colour = mix(theme.fg, `#${hex}`, step / 20);
    if (contrast(colour, theme.bg) >= MIN_CONTRAST) return colour;
  }
  return theme.fg;
}

function pathsOf(slug) {
  const svg = readFileSync(join(HERE, 'logos', `${slug}.svg`), 'utf8');
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(paths.length > 0, `no path in logos/${slug}.svg`);
  return paths;
}

function render(theme, fontSrc) {
  const height = VIEW.pad * 2 + STACK.length * VIEW.row;
  const scale = COL.logo / 24;
  const rows = STACK.map(([group, items], r) => {
    const top = VIEW.pad + r * VIEW.row;
    const mid = top + VIEW.row / 2;
    const rule = r === 0 ? '' : `<path class="rule" d="M${COL.label} ${top}H${COL.right}"/>`;
    const logos = items.map(([slug, name, hex], i) => {
      const x = COL.logos + i * (COL.logo + COL.gap);
      const d = pathsOf(slug).map((p) => `<path d="${p}"/>`).join('');
      return `<g transform="translate(${x} ${mid - COL.logo / 2}) scale(${scale})" fill="${visible(hex, theme)}"><title>${name}</title>${d}</g>`;
    }).join('');
    return `${rule}<text class="g" x="${COL.label}" y="${mid + 8}"><tspan class="a">/</tspan> ${group}</text>${logos}`;
  }).join('\n');
  const names = STACK.map(([group, items]) => `${group}: ${items.map(([, name]) => name).join(', ')}`).join('. ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW.w} ${height}" width="${VIEW.w}" height="${height}" role="img" aria-label="Stack. ${names}.">
<style>@font-face{font-family:"Geist Mono";src:url(${fontSrc}) format("woff2")}
.g{font:22px "Geist Mono",ui-monospace,monospace;fill:${mix(theme.fg, theme.bg, 0.72)};letter-spacing:.04em}
.a{fill:${theme.accent}}
.rule{stroke:${mix(theme.fg, theme.bg, 0.1)};stroke-width:1}</style>
<rect width="${VIEW.w}" height="${height}" rx="${VIEW.radius}" fill="${theme.bg}"/>
<rect x=".5" y=".5" width="${VIEW.w - 1}" height="${height - 1}" rx="${VIEW.radius - 0.5}" fill="none" stroke="${mix(theme.fg, theme.bg, 0.09)}"/>
${rows}
</svg>
`;
}

const b64 = readFileSync(join(HERE, 'fonts', 'GeistMono-Regular.woff2.b64'), 'utf8').trim();
const fontSrc = b64.startsWith('data:') ? b64 : `data:font/woff2;base64,${b64}`;
const logoCount = STACK.reduce((n, [, items]) => n + items.length, 0);
for (const [name, theme] of Object.entries(THEMES)) {
  const svg = render(theme, fontSrc);
  assert.equal((svg.match(/<title>/g) || []).length, logoCount, 'one mark per tool');
  assert.ok(!/NaN|undefined|Infinity/.test(svg), 'no broken numbers');
  assert.ok(svg.length < MAX_BYTES, `stack-${name}.svg is ${svg.length} bytes`);
  writeFileSync(join(HERE, `stack-${name}.svg`), svg);
}
console.log(`${logoCount} marks in ${STACK.length} groups`);

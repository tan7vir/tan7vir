#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const HERE = dirname(fileURLToPath(import.meta.url));
const MAX_BYTES = 150_000;
const DAY_MS = 86_400_000;
const API_TIMEOUT_MS = 20_000;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const COPY = {
  name: 'TAN VIR',
  role: 'ai engineer · product · full-stack',
  thesis: ['I build systems that read, reason,', 'and hold up in production.'],
  context: 'software engineer at automata one · dhaka, bangladesh',
};

const BRAND = {
  void: '#0a0a0b', bone: '#f5f2ea', ink: '#111111', ghost: '#c6c6c6',
  amber: '#ff7a1a', amberDeep: '#c45a0e',
};

const THEMES = {
  dark: { bg: BRAND.void, fg: BRAND.bone, label: BRAND.ghost, accent: BRAND.amber, tone: { lit: 0.86, unplayed: 0.18, silence: 0.28, edge: 0.09 } },
  light: { bg: BRAND.bone, fg: BRAND.ink, label: BRAND.ink, accent: BRAND.amberDeep, tone: { lit: 0.84, unplayed: 0.15, silence: 0.26, edge: 0.1 } },
};

const EM = { antonCap: 0.859, antonLsb: 0.0098, monoAdvance: 0.6, monoLsb: 0.054 };

const VIEW = { w: 1200, h: 498, radius: 20 };
const GRID = { x0: 56, x1: 1144, top: 52 };
const TYPE = { name: 156, thesis: 31, label: 14, role: 19 };
const NAME_BASE = Math.round(GRID.top + EM.antonCap * TYPE.name);
const Y = { thesis: [NAME_BASE - 40, NAME_BASE], role: NAME_BASE + 38, caption: 268, top: 290, bottom: 414, tick: 424, ruler: 444 };
const BAR_WIDTH = 2;
const MOTION = { start: 0.35, sweep: 3.2, flash: 0.6, ping: 0.9, ease: [0.3, 0, 0.15, 1] };
const MOTION_LIMIT_S = 5;

function fail(message) {
  console.error(`render.mjs: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { login: 'tan7vir' };
  for (let i = 0; i < argv.length; i += 2) {
    const [key, value] = [argv[i], argv[i + 1]];
    if (!['--out', '--data', '--login'].includes(key)) fail(`unknown argument "${key}"`);
    if (value === undefined || value.startsWith('--')) fail(`${key} needs a value`);
    args[key.slice(2)] = value;
  }
  if (!args.out) fail('usage: node render.mjs --out <dir> [--data <calendar.json>] [--login tan7vir]');
  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(args.login)) fail(`"${args.login}" is not a valid GitHub login`);
  return args;
}

const QUERY = `query($login: String!) {
  user(login: $login) { contributionsCollection { contributionCalendar {
    totalContributions weeks { contributionDays { date contributionCount } }
  } } }
}`;

async function fetchCalendar(login) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) fail('GITHUB_TOKEN is not set. Export a token, or pass --data <calendar.json>.');
  let res;
  try {
    res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { authorization: `bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'hero-banner-render' },
      body: JSON.stringify({ query: QUERY, variables: { login } }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch (err) {
    fail(`could not reach the GitHub API: ${err.message}`);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) fail(`GitHub API returned HTTP ${res.status}${body?.message ? `: ${body.message}` : ''}`);
  if (body?.errors?.length) fail(`GitHub API error: ${body.errors.map((e) => e.message).join('; ')}`);
  const cal = body?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) fail(`GitHub API returned no contribution calendar for "${login}"`);
  return {
    total: cal.totalContributions,
    days: cal.weeks.flatMap((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))),
  };
}

function readCalendar(path) {
  try {
    return JSON.parse(readFileSync(resolve(path), 'utf8'));
  } catch (err) {
    return fail(`could not read ${path}: ${err.message}`);
  }
}

const ymd = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
};
const toUTC = (iso) => {
  const { y, m, d } = ymd(iso);
  return Date.UTC(y, m, d);
};

function checkCalendar(cal) {
  if (!cal || !Array.isArray(cal.days) || cal.days.length === 0) fail('calendar has no days');
  if (!Number.isInteger(cal.total) || cal.total < 0) fail('calendar total must be a non-negative integer');
  cal.days.forEach((day, i) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day?.date ?? '')) fail(`day ${i} has a malformed date`);
    if (!Number.isInteger(day.count) || day.count < 0) fail(`${day.date} has a malformed count`);
    if (i > 0 && toUTC(day.date) - toUTC(cal.days[i - 1].date) !== DAY_MS) fail(`days are not consecutive at ${day.date}`);
  });
  return { total: cal.total, days: cal.days.map(({ date, count }) => ({ date, count })) };
}

const fmtInt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const num = (n) => String(Math.round(n * 100) / 100);
const fmtDate = (iso, withYear = true) => {
  const { y, m, d } = ymd(iso);
  return withYear ? `${d} ${MONTHS[m]} ${y}` : `${d} ${MONTHS[m]}`;
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const withSeparators = (text) => text.split(' · ').map(esc).join('<tspan class="sep"> · </tspan>');
const monoWidth = (text, size) => text.length * EM.monoAdvance * size;
const spanOf = (x, anchor, width) => (anchor === 'end' ? [x - width, x] : [x, x + width]);
const overlaps = ([a, b], [c, d], gap) => a < d + gap && c < b + gap;
const anchorAttr = (anchor) => (anchor === 'start' ? '' : ` text-anchor="${anchor}"`);

function mix(fg, bg, alpha) {
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [f, b] = [rgb(fg), rgb(bg)];
  return `#${f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, '0')).join('')}`;
}

// CSS eases time, not distance, so each bar's delay inverts the playhead's
// cubic-bezier to find when the head actually crosses that bar.
function timeAtProgress(progress, [x1, y1, x2, y2]) {
  const bez = (s, a, b) => 3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * b + s * s * s;
  let [lo, hi] = [0, 1];
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (bez(mid, y1, y2) < progress) lo = mid;
    else hi = mid;
  }
  return bez((lo + hi) / 2, x1, x2);
}

function summarize({ total, days }) {
  const peak = days.reduce((best, d) => (d.count > best.count ? d : best), days[0]);
  const monthStarts = days.flatMap((d, i) => (ymd(d.date).d === 1 ? [i] : []));
  return { total, days, peak, last: days[days.length - 1], monthStarts };
}

function waveGeometry(sum) {
  const pitch = (GRID.x1 - GRID.x0) / sum.days.length;
  const mid = (Y.top + Y.bottom) / 2;
  const half = (Y.bottom - Y.top) / 2 - BAR_WIDTH / 2;
  const [headFrom, headTo] = [GRID.x0 - 2, GRID.x1 + 2];
  const amp = (count) => (sum.peak.count === 0 ? 0 : half * Math.sqrt(count / sum.peak.count));
  const bars = sum.days.map((d, i) => {
    const x = GRID.x0 + (i + 0.5) * pitch;
    const at = MOTION.start + MOTION.sweep * timeAtProgress((x - headFrom) / (headTo - headFrom), MOTION.ease);
    return { x, h: amp(d.count), count: d.count, at, peak: d === sum.peak && d.count > 0 };
  });
  return { pitch, mid, bars, headFrom, headTo };
}

function waveSvg(geo) {
  const paths = geo.bars.map((b) => (b.count === 0
    ? `<path class="z" d="M${num(b.x)} ${num(geo.mid - 0.05)}v.1"/>`
    : `<path${b.peak ? ' class="pk"' : ''} d="M${num(b.x)} ${num(geo.mid - b.h)}V${num(geo.mid + b.h)}" style="--d:${b.at.toFixed(3)}s"/>`));
  return `<g id="wave" class="w">${paths.join('')}</g>`;
}

function rulerSvg(sum, geo) {
  const xAt = (i) => GRID.x0 + i * geo.pitch;
  const endText = fmtDate(sum.last.date);
  const endSpan = spanOf(geo.headTo, 'end', monoWidth(endText, TYPE.label));
  const bounds = [...new Set([0, ...sum.monthStarts, sum.days.length])];
  const months = bounds.slice(0, -1).flatMap((from, k) => {
    const name = MONTHS[ymd(sum.days[from].date).m];
    const [a, b] = [xAt(from), xAt(bounds[k + 1])];
    const span = spanOf((a + b) / 2 - monoWidth(name, TYPE.label) / 2, 'start', monoWidth(name, TYPE.label));
    const fits = span[0] >= a + 5 && span[1] <= b - 5 && !overlaps(span, endSpan, 12);
    return fits ? [`<text class="m f" x="${num((a + b) / 2)}" y="${Y.ruler}" text-anchor="middle">${name}</text>`] : [];
  });
  const ticks = sum.monthStarts.map((i) => `M${num(xAt(i))} ${Y.tick}v5`).join('');
  return `<path class="tick" d="${ticks}"/>${months.join('')}<text class="m end" x="${num(geo.headTo)}" y="${Y.ruler}" text-anchor="end">${esc(endText)}</text>`;
}

function peakFlag(sum, geo, blocked) {
  if (sum.peak.count === 0) return null;
  const bar = geo.bars[sum.days.indexOf(sum.peak)];
  const text = `peak ${fmtInt(sum.peak.count)} · ${fmtDate(sum.peak.date, false)}`;
  const width = monoWidth(text, TYPE.label);
  const slot = [[bar.x + 7, 'start'], [bar.x - 7, 'end']]
    .map(([x, anchor]) => ({ x, anchor, span: spanOf(x, anchor, width) }))
    .find(({ span }) => span[0] >= GRID.x0 && span[1] <= GRID.x1 && blocked.every((b) => !overlaps(span, b, 14)));
  return slot ? { ...slot, text, bar } : null;
}

function captionSvg(sum, geo) {
  const period = sum.days.length >= 365 ? 'in the last year' : `in the last ${sum.days.length} days`;
  const total = fmtInt(sum.total);
  const items = [`contributions ${period}`, 'one bar per day', 'sqrt scale'];
  const captionSpan = spanOf(GRID.x0, 'start', monoWidth(`${total} ${items.join(' · ')}`, TYPE.label));
  const flag = peakFlag(sum, geo, [captionSpan, [geo.headTo - 20, geo.headTo + 20]]);
  if (!flag && sum.peak.count > 0) items.push(`peak ${fmtInt(sum.peak.count)} on ${fmtDate(sum.peak.date, false)}`);
  const x = num(GRID.x0 - EM.monoLsb * TYPE.label);
  const caption = `<text class="m" x="${x}" y="${Y.caption}"><tspan class="hi">${total}</tspan> ${withSeparators(items.join(' · '))}</text>`;
  if (!flag) return caption;
  const pole = `M${num(flag.bar.x)} ${Y.caption - 10}V${num(geo.mid - flag.bar.h - 5)}`;
  const label = `<text class="m" x="${num(flag.x)}" y="${Y.caption}"${anchorAttr(flag.anchor)}>${esc(flag.text)}</text>`;
  return `${caption}<g class="flag" style="--d:${flag.bar.at.toFixed(3)}s"><path class="tick" d="${pole}"/>${label}</g>`;
}

function playheadSvg(geo) {
  const [x, y] = [num(geo.headTo), Y.top - 8];
  return `<g class="ph"><circle class="glow" cx="${x}" cy="${y}" r="12"/><path d="M${x} ${y}V${Y.bottom + 8}"/>`
    + `<circle cx="${x}" cy="${y}" r="3.5"/><circle class="ping" cx="${x}" cy="${y}" r="18"/></g>`;
}

function textSvg() {
  const monoX = (x, size) => num(x - EM.monoLsb * size);
  return [
    `<text class="name" x="${num(GRID.x0 - EM.antonLsb * TYPE.name)}" y="${NAME_BASE}">${esc(COPY.name)}</text>`,
    `<text class="role" x="${monoX(GRID.x0, TYPE.role)}" y="${Y.role}">${withSeparators(COPY.role)}</text>`,
    ...COPY.thesis.map((line, i) => `<text class="thesis" x="${GRID.x1}" y="${Y.thesis[i]}" text-anchor="end">${esc(line)}</text>`),
    `<text class="m" x="${GRID.x1}" y="${Y.role}" text-anchor="end">${withSeparators(COPY.context)}</text>`,
  ].join('');
}

function fontFaces() {
  const face = (family, file) => {
    const b64 = readFileSync(join(HERE, 'fonts', file), 'utf8').replace(/\s+/g, '');
    return `@font-face{font-family:${family};src:url(data:font/woff2;base64,${b64}) format("woff2")}`;
  };
  return [face('"Anton"', 'Anton-Regular.woff2.b64'), face('"Geist Mono"', 'GeistMono-Regular.woff2.b64'), face('"Roboto Flex"', 'RobotoFlex-Regular.woff2.b64')].join('');
}

function styleSvg(theme, fonts, geo) {
  const tone = (alpha, from = theme.fg) => mix(from, theme.bg, alpha);
  const c = {
    thesis: tone(0.88), muted: tone(0.62, theme.label), faint: tone(0.4, theme.label), line: tone(0.3),
    lit: tone(theme.tone.lit), unplayed: tone(theme.tone.unplayed), silence: tone(theme.tone.silence), edge: tone(theme.tone.edge),
  };
  const arrive = (MOTION.start + MOTION.sweep).toFixed(2);
  return `<style>${fonts}
.name{font:${TYPE.name}px "Anton",Impact,'Arial Narrow',sans-serif;fill:${theme.fg}}
.thesis{font:${TYPE.thesis}px "Roboto Flex",system-ui,'Segoe UI',Helvetica,sans-serif;fill:${c.thesis}}
.role{font:${TYPE.role}px "Geist Mono",ui-monospace,Menlo,Consolas,monospace;fill:${theme.fg};letter-spacing:.04em}
.role .sep{fill:${theme.accent}}
.m{font:${TYPE.label}px "Geist Mono",ui-monospace,Menlo,Consolas,monospace;fill:${c.muted}}
.hi{fill:${theme.fg}}
.sep,.f{fill:${c.faint}}
.end{fill:${theme.accent};animation:fade .5s ${arrive}s backwards}
.tick{stroke:${c.line};stroke-width:1;fill:none}
.edge{fill:none;stroke:${c.edge}}
.w path{stroke:${c.lit};stroke-width:${BAR_WIDTH};stroke-linecap:round;animation:lit ${MOTION.flash}s cubic-bezier(.2,.6,.35,1) var(--d) backwards}
.w .z{stroke:${c.silence};animation:none}
.w .pk{stroke:${theme.accent};animation-name:litpk}
.flag{animation:fade .4s var(--d) backwards}
.ph{animation:sweep ${MOTION.sweep}s cubic-bezier(${MOTION.ease.join(',')}) ${MOTION.start}s backwards}
.ph path{stroke:${theme.accent};stroke-width:1.5}
.ph circle{fill:${theme.accent}}
.ph .glow{fill:url(#glow)}
.ph .ping{fill:none;stroke:${theme.accent};stroke-width:1.2;vector-effect:non-scaling-stroke;opacity:0;transform-box:fill-box;transform-origin:center;animation:ping ${MOTION.ping}s cubic-bezier(.2,.7,.3,1) ${arrive}s}
@keyframes lit{0%{stroke:${c.unplayed}}1%{stroke:${theme.accent}}100%{stroke:${c.lit}}}
@keyframes litpk{0%{stroke:${c.unplayed}}1%{stroke:${theme.fg}}100%{stroke:${theme.accent}}}
@keyframes sweep{0%{transform:translateX(-${num(geo.headTo - geo.headFrom)}px)}}
@keyframes ping{0%{opacity:.9;transform:scale(.2)}100%{opacity:0;transform:none}}
@keyframes fade{0%{opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`;
}

function renderSvg(sum, themeName, fonts) {
  const theme = THEMES[themeName];
  const geo = waveGeometry(sum);
  const desc = `${fmtInt(sum.total)} GitHub contributions from ${fmtDate(sum.days[0].date)} to ${fmtDate(sum.last.date)}, drawn as an audio waveform with one bar per day.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW.w} ${VIEW.h}" width="${VIEW.w}" height="${VIEW.h}" role="img" aria-labelledby="t d">
<title id="t">${esc(`${COPY.name}. ${COPY.role}`)}</title>
<desc id="d">${esc(desc)}</desc>
${styleSvg(theme, fonts, geo)}
<defs><radialGradient id="glow"><stop offset="0" stop-color="${theme.accent}" stop-opacity=".5"/><stop offset="1" stop-color="${theme.accent}" stop-opacity="0"/></radialGradient></defs>
<rect width="${VIEW.w}" height="${VIEW.h}" rx="${VIEW.radius}" fill="${theme.bg}"/>
<rect class="edge" x=".5" y=".5" width="${VIEW.w - 1}" height="${VIEW.h - 1}" rx="${VIEW.radius - 0.5}"/>
${textSvg()}
${captionSvg(sum, geo)}
${waveSvg(geo)}
${rulerSvg(sum, geo)}
${playheadSvg(geo)}
</svg>
`;
}

function selfCheck(svg, sum, geo) {
  assert.equal(sum.days.reduce((a, d) => a + d.count, 0), sum.total, 'total must equal the sum of the days');
  const wave = svg.match(/<g id="wave"[^>]*>([\s\S]*?)<\/g>/);
  assert.ok(wave, 'waveform group is missing');
  assert.equal((wave[1].match(/<path /g) ?? []).length, sum.days.length, 'need exactly one bar per day');
  assert.ok(!/<script/i.test(svg), 'output must not contain <script');
  assert.ok(!/foreignObject/i.test(svg), 'output must not contain foreignObject');
  assert.ok(!/https?:/i.test(svg.replaceAll('xmlns="http://www.w3.org/2000/svg"', '')), 'output must not reference http resources');
  assert.ok(Buffer.byteLength(svg) < MAX_BYTES, `output is ${Buffer.byteLength(svg)} bytes, limit ${MAX_BYTES}`);
  assert.ok(!/url\((?!data:|#)/i.test(svg), 'url() may point only at data: or an in-document id');
  assert.ok(!/\b(?:NaN|undefined|Infinity)\b/.test(svg), 'an unset value leaked into the markup');
  const lastLit = Math.max(...geo.bars.map((b) => b.at)) + MOTION.flash;
  const motionEnd = Math.max(lastLit, MOTION.start + MOTION.sweep + MOTION.ping);
  assert.ok(motionEnd < MOTION_LIMIT_S, `motion ends at ${motionEnd.toFixed(2)} s, limit ${MOTION_LIMIT_S} s`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sum = summarize(checkCalendar(args.data ? readCalendar(args.data) : await fetchCalendar(args.login)));
  const fonts = fontFaces();
  const outDir = resolve(args.out);
  mkdirSync(outDir, { recursive: true });
  for (const theme of ['dark', 'light']) {
    const svg = renderSvg(sum, theme, fonts);
    selfCheck(svg, sum, waveGeometry(sum));
    const file = join(outDir, `hero-${theme}.svg`);
    writeFileSync(file, svg);
    console.log(`${file}  ${Buffer.byteLength(svg)} bytes`);
  }
  console.log(`${fmtInt(sum.total)} contributions over ${sum.days.length} days, peak ${sum.peak.count} on ${sum.peak.date}`);
}

main().catch((err) => fail(err.code === 'ERR_ASSERTION' ? `self-check failed: ${err.message.split('\n')[0]}` : err.stack ?? String(err)));

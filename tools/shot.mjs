#!/usr/bin/env node
/* Screenshot the preview harness at phone widths, and say what is clipped.
 *
 * Why this exists rather than `chrome --headless --screenshot`: Chrome clamps
 * a window to 500 CSS px and then crops the image to whatever --window-size
 * asked for, so a run at 360 renders the 500px layout and hands back a picture
 * of its left 360px. Every narrow-screen bug is invisible that way, and one
 * shipped because of it — the "Still getting to know" legend on the skills
 * summary was truncated on every phone and whole at the 880px the screenshots
 * were taken at. This drives Chrome over CDP and sets the metrics with
 * Emulation.setDeviceMetricsOverride, which is a real 320px viewport.
 *
 * It also measures clipping rather than leaving it to the eye: any leaf node
 * whose scrollWidth exceeds its clientWidth is text the learner cannot read,
 * and the page's own horizontal overflow is reported with it.
 *
 *   node tools/shot.mjs <outDir> <widths> <tag=url> [tag=url …]
 *   node tools/shot.mjs /tmp/shots 320,360,390,1024 \
 *     "skills=http://localhost:5199/preview.html?screen=skills&board=weak&slip=real"
 *
 * 320 is the floor worth supporting, 360 and 390 are where the learners are,
 * and one wide width confirms nothing stretches. Needs `npx vite --port 5199`
 * already running. Dev tool: not part of the build.
 */
import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [outDir, widthsArg, ...jobs] = process.argv.slice(2);
if (!outDir || !widthsArg || !jobs.length) {
    console.error('usage: node tools/shot.mjs <outDir> <w1,w2,…> <tag=url> …');
    process.exit(2);
}
const widths = widthsArg.split(',').map(Number).filter(Boolean);
mkdirSync(outDir, { recursive: true });

const profile = `/tmp/lp-shot-${process.pid}`;
const PORT = 9400 + (process.pid % 400);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn(CHROME, ['--headless', '--disable-gpu', '--no-sandbox',
    '--hide-scrollbars', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`, '--window-size=900,1000', 'about:blank'],
{ stdio: 'ignore' });

let page;
for (let i = 0; i < 80 && !page; i++) {
    try {
        const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
        page = list.find(t => t.type === 'page');
    } catch { /* chrome not listening yet */ }
    if (!page) await sleep(250);
}
if (!page) { chrome.kill(); throw new Error('chrome did not come up'); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let id = 0;
ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
await new Promise(r => ws.addEventListener('open', r, { once: true }));
const send = (method, params = {}) => new Promise((res, rej) => {
    const n = ++id;
    pending.set(n, m => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
});
await send('Page.enable');

/* A leaf whose content is wider than its box is text that has been cut off —
   ellipsis or not, the learner is reading half a label. */
const PROBE = `(() => {
  const bad = [];
  document.querySelectorAll('*').forEach(el => {
    if (el.children.length) return;
    const t = (el.textContent || '').trim();
    if (t && el.scrollWidth > el.clientWidth + 1) bad.push([t.slice(0, 50), el.scrollWidth + '>' + el.clientWidth]);
  });
  const de = document.documentElement;
  return JSON.stringify({
    hscroll: de.scrollWidth > de.clientWidth + 1 ? de.scrollWidth + '>' + de.clientWidth : null,
    bad,
  });
})()`;

let clipped = 0;
for (const job of jobs) {
    const cut = job.indexOf('=');
    const tag = job.slice(0, cut);
    const url = job.slice(cut + 1);
    for (const width of widths) {
        const mobile = width < 700;
        await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 2, mobile });
        await send('Page.navigate', { url: 'about:blank' });
        await send('Page.navigate', { url });
        await sleep(2600);
        const r = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
        const v = JSON.parse(r.result.value);
        if (v.hscroll || v.bad.length) { clipped++; console.log(`CLIP ${tag} @${width}`, JSON.stringify(v)); }
        else console.log(`ok   ${tag} @${width}`);
        const { cssContentSize } = await send('Page.getLayoutMetrics');
        const full = Math.min(Math.ceil(cssContentSize.height), 4000);
        await send('Emulation.setDeviceMetricsOverride', { width, height: full, deviceScaleFactor: 2, mobile });
        await sleep(300);
        const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
        writeFileSync(`${outDir}/${tag}-${width}.png`, Buffer.from(data, 'base64'));
    }
}

ws.close();
chrome.kill();
await sleep(200);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ }
console.log(clipped ? `${clipped} view(s) clip text` : 'nothing clipped');
process.exit(clipped ? 1 : 0);

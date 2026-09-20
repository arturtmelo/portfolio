#!/usr/bin/env node
// Builds Artur-Tavares-de-Melo-CV.pdf from the site's own print stylesheet (the Ctrl+P view), so the
// résumé file and the page cannot drift apart: edit index.html, run this, commit the PDF.
//
//   node scripts/build-cv.js
//   CHROME="/path/to/chrome" node scripts/build-cv.js     (when Chrome is somewhere unusual)
//
// No dependencies: Node 22+ (global WebSocket and fetch) and any Chromium-based browser installed.
'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'Artur-Tavares-de-Melo-CV.pdf');
const TITLE = 'Artur Tavares de Melo — Currículo';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findBrowser() {
  const home = process.env.LOCALAPPDATA || '';
  const absolute = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    home && home + '/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const p of absolute) if (p && fs.existsSync(p)) return p;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome']) {
    for (const dir of (process.env.PATH || '').split(path.delimiter)) {
      const p = path.join(dir, name);
      if (dir && fs.existsSync(p)) return p;
    }
  }
  throw new Error('Chrome/Chromium not found: set CHROME=/path/to/chrome');
}

async function main() {
  if (typeof WebSocket === 'undefined') throw new Error('Node 22+ is required (global WebSocket)');
  const exe = findBrowser();
  const port = 9300 + Math.floor(Math.random() * 600);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-chrome-'));
  const args = ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--no-first-run', '--disable-gpu', 'about:blank'];
  if (process.getuid && process.getuid() === 0) args.push('--no-sandbox'); // running as root (containers)
  const chrome = spawn(exe, args, { stdio: 'ignore' });
  let ws;
  try {
    let target = null;
    for (let i = 0; i < 80 && !target; i++) {
      try {
        const list = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
        target = list.find((t) => t.type === 'page') || null;
      } catch (e) { /* not up yet */ }
      if (!target) await sleep(250);
    }
    if (!target) throw new Error('the browser did not start');

    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let nextId = 0;
    const pending = new Map();
    const waiting = new Map();
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.method + ' ' + msg.error.message)); else resolve(msg.result);
      } else if (msg.method && waiting.has(msg.method)) {
        waiting.get(msg.method)();
        waiting.delete(msg.method);
      }
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
    const once = (method) => new Promise((resolve) => waiting.set(method, resolve));

    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    const loaded = once('Page.loadEventFired');
    await send('Page.navigate', { url: pathToFileURL(path.join(ROOT, 'index.html')).href });
    await loaded;
    // fonts in, and the hero's typing/scramble effects settled, before the page is laid out for paper
    await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 1800)))', awaitPromise: true });
    // the same hook a real Ctrl+P fires: the page finishes its effects and unhides everything for paper
    await send('Runtime.evaluate', { expression: "document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in-view')); window.dispatchEvent(new Event('beforeprint')); document.title = " + JSON.stringify(TITLE) });

    const pdf = await send('Page.printToPDF', {
      printBackground: false,
      displayHeaderFooter: false,
      preferCSSPageSize: true,   // A4 and its margins come from @page in css/style.css
      generateTaggedPDF: true,      // real text structure: selectable, searchable, screen-reader and ATS friendly
      generateDocumentOutline: true,
    });
    const buf = Buffer.from(pdf.data, 'base64');
    fs.writeFileSync(OUT, buf);
    const pages = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    console.log('wrote ' + path.relative(process.cwd(), OUT) + ' — ' + (buf.length / 1024).toFixed(0) + ' KB, ' + pages + ' page(s)');
  } finally {
    try { ws && ws.close(); } catch (e) { /* already closed */ }
    chrome.kill();
    await sleep(400);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* the browser may still hold a file: harmless in tmp */ }
  }
}

main().catch((e) => { console.error('build-cv failed:', e.message); process.exit(1); });

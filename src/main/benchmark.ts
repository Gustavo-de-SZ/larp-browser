import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import type { TabManager } from './tab-manager';

interface MemorySample {
  totalMB: number;
  browserMB: number;
  gpuMB: number;
  tabMB: number;
  utilityMB: number;
  processCount: number;
  nodeHeapMB: number;
}

function getMemoryStats(): MemorySample {
  const metrics = app.getAppMetrics();
  let totalWorkingSetKB = 0;
  let browserKB = 0;
  let gpuKB = 0;
  let tabKB = 0;
  let utilityKB = 0;

  for (const m of metrics) {
    const ws = m.memory.workingSetSize || 0;
    totalWorkingSetKB += ws;
    const type = (m.type || '').toLowerCase();
    if (type === 'browser') browserKB += ws;
    else if (type === 'gpu') gpuKB += ws;
    else if (type === 'tab') tabKB += ws;
    else utilityKB += ws;
  }

  return {
    totalMB: Number((totalWorkingSetKB / 1024).toFixed(1)),
    browserMB: Number((browserKB / 1024).toFixed(1)),
    gpuMB: Number((gpuKB / 1024).toFixed(1)),
    tabMB: Number((tabKB / 1024).toFixed(1)),
    utilityMB: Number((utilityKB / 1024).toFixed(1)),
    processCount: metrics.length,
    nodeHeapMB: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)),
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Deterministic mock test payloads (100% offline, zero network flakiness)
function generateTestPayload(type: 'article' | 'dom' | 'canvas' | 'form' | 'dashboard', index: number): string {
  let content = '';
  if (type === 'article') {
    content = `
      <h1>Document Article #${index}</h1>
      <p>Simulating rich text document with typography, styling, and multiple content blocks.</p>
      ${Array.from({ length: 40 })
        .map((_, i) => `<p>Paragraph ${i}: Performance testing DOM layout calculations and font rendering in Chromium view.</p>`)
        .join('')}
    `;
  } else if (type === 'dom') {
    content = `
      <h1>DOM Heavy Component Grid #${index}</h1>
      <div style="display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px;">
        ${Array.from({ length: 500 })
          .map((_, i) => `<div style="padding: 4px; border: 1px solid #ccc; font-size: 10px;">Item ${i}</div>`)
          .join('')}
      </div>
    `;
  } else if (type === 'canvas') {
    content = `
      <h1>Canvas & Animation Stream #${index}</h1>
      <canvas id="c" width="400" height="300" style="border:1px solid #999;"></canvas>
      <script>
        const ctx = document.getElementById('c').getContext('2d');
        let x = 0;
        function draw() {
          ctx.clearRect(0, 0, 400, 300);
          ctx.fillStyle = '#6366f1';
          ctx.fillRect((x % 350), 50, 50, 50);
          x += 2;
          requestAnimationFrame(draw);
        }
        draw();
      </script>
    `;
  } else if (type === 'form') {
    content = `
      <h1>Data Entry & Forms #${index}</h1>
      <form>
        ${Array.from({ length: 20 })
          .map((_, i) => `
            <div style="margin: 8px 0;">
              <label>Field ${i}:</label>
              <input type="text" value="Default form value ${i}" />
              <input type="checkbox" checked />
            </div>
          `)
          .join('')}
      </form>
    `;
  } else {
    content = `
      <h1>Analytics Dashboard Mock #${index}</h1>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        ${Array.from({ length: 8 })
          .map((_, i) => `
            <div style="flex: 1 1 180px; padding: 16px; background: #f4f4f5; border-radius: 8px;">
              <h3>Metric Card ${i}</h3>
              <p style="font-size: 24px; font-weight: bold;">${(i * 123.45).toFixed(2)}</p>
            </div>
          `)
          .join('')}
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html>
  <head>
    <title>Benchmark Tab #${index} - ${type.toUpperCase()}</title>
    <style>body { font-family: sans-serif; padding: 20px; }</style>
  </head>
  <body>${content}</body>
</html>`;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

export async function runBenchmark(
  window: BrowserWindow,
  tabManager: TabManager,
  startupTimeMs: number
) {
  console.log('\n=============================================================');
  console.log('            LARP BROWSER PERFORMANCE BENCHMARK               ');
  console.log('=============================================================\n');
  console.log(`[1/6] Startup: Browser ready in ${startupTimeMs.toFixed(1)} ms`);

  // Allow initial window and WebContentsView to paint
  await sleep(1000);

  // 1. Baseline Memory (1 New Tab)
  const baseline = getMemoryStats();
  console.log(`[2/6] Baseline Memory: ${baseline.totalMB} MB total (${baseline.processCount} processes, V8 Heap: ${baseline.nodeHeapMB} MB)`);

  // 2. Load 9 additional tabs (total 10 tabs)
  console.log('[3/6] Scaling: Loading 9 additional tabs (total 10 active tabs)...');
  const testPayloads = [
    { type: 'article' as const, name: 'Rich Article 1' },
    { type: 'dom' as const, name: 'DOM Grid (500 nodes)' },
    { type: 'canvas' as const, name: '2D Canvas Animation' },
    { type: 'form' as const, name: 'Complex Form' },
    { type: 'dashboard' as const, name: 'Analytics Dashboard' },
    { type: 'article' as const, name: 'Rich Article 2' },
    { type: 'dom' as const, name: 'DOM Grid 2' },
    { type: 'canvas' as const, name: 'Canvas Particle Sim' },
    { type: 'form' as const, name: 'Settings & Inputs' },
  ];

  const tabStart = performance.now();
  const createdTabIds: string[] = [];

  for (let i = 0; i < testPayloads.length; i++) {
    const p = testPayloads[i];
    const url = generateTestPayload(p.type, i + 2);
    const id = await tabManager.createTab(url);
    createdTabIds.push(id);
    await sleep(250); // slight delay to mirror realistic tab opening pace
  }

  const tabOpenDurationMs = performance.now() - tabStart;
  await sleep(1500); // Allow all tabs to complete DOM layout and rendering

  const loadedState = getMemoryStats();
  const avgPerTabMB = Number(((loadedState.totalMB - baseline.totalMB) / 9).toFixed(1));
  console.log(`      -> 10 Tabs Active Memory: ${loadedState.totalMB} MB (+${(loadedState.totalMB - baseline.totalMB).toFixed(1)} MB, ~${avgPerTabMB} MB/tab)`);

  // 3. Tab Switcher Thumbnail & Response Benchmark
  console.log('[4/6] Tab Switcher HUD: Benchmarking preview capture and cycling...');
  const thumbStart = performance.now();
  const activeTabId = tabManager.getState().activeTabId;
  if (activeTabId) {
    await tabManager.capturePreview(activeTabId);
  }
  const thumbDurationMs = performance.now() - thumbStart;
  const avgThumbMs = Number(thumbDurationMs.toFixed(1));

  // Measure switcher cycle latency
  tabManager.openSwitcher();
  const cycleStart = performance.now();
  for (let i = 0; i < 5; i++) {
    tabManager.cycleSwitcher('forward');
  }
  const cycleDurationMs = performance.now() - cycleStart;
  const avgCycleMs = Number((cycleDurationMs / 5).toFixed(2));
  tabManager.closeSwitcher();

  console.log(`      -> Thumbnail Capture: ${avgThumbMs} ms/tab | Switcher Cycle: ${avgCycleMs} ms/action`);

  // 4. Tab Hibernation Benchmark
  console.log('[5/6] Tab Hibernation: Putting 9 inactive tabs to sleep...');
  tabManager.hibernateAllInactive();
  await sleep(1200); // Wait for background throttling and Chromium memory trim

  const hibernatedState = getMemoryStats();
  const memoryReclaimedMB = Number((loadedState.totalMB - hibernatedState.totalMB).toFixed(1));
  const reductionPercent = Number(((memoryReclaimedMB / loadedState.totalMB) * 100).toFixed(1));

  console.log(`      -> Hibernated Memory: ${hibernatedState.totalMB} MB`);
  console.log(`      -> Memory Reclaimed: ${memoryReclaimedMB} MB (${reductionPercent}% reduction)`);

  // 5. Wakeup Latency
  console.log('[6/6] Tab Wakeup: Restoring a sleeping tab...');
  const wakeupTabId = createdTabIds[0];
  const wakeupStart = performance.now();
  await tabManager.switchTab(wakeupTabId);
  const wakeupDurationMs = Number((performance.now() - wakeupStart).toFixed(1));
  console.log(`      -> Wakeup Response Time: ${wakeupDurationMs} ms`);

  // 6. Final Results Table
  const report = {
    timestamp: new Date().toISOString(),
    platform: process.platform,
    arch: process.arch,
    metrics: {
      coldStartupTimeMs: Number(startupTimeMs.toFixed(1)),
      baselineMemoryTotalMB: baseline.totalMB,
      baselineBrowserProcessMB: baseline.browserMB,
      baselineGpuProcessMB: baseline.gpuMB,
      tenTabsActiveMemoryMB: loadedState.totalMB,
      tenTabsHibernatedMemoryMB: hibernatedState.totalMB,
      memoryReclaimedByHibernationMB: memoryReclaimedMB,
      hibernationReductionPercent: reductionPercent,
      avgThumbnailCaptureMs: avgThumbMs,
      switcherCycleLatencyMs: avgCycleMs,
      tabWakeupLatencyMs: wakeupDurationMs,
      tenTabsOpenDurationMs: Number(tabOpenDurationMs.toFixed(1)),
    },
  };

  const resultsPath = path.join(process.cwd(), 'benchmark-results.json');
  try {
    fs.writeFileSync(resultsPath, JSON.stringify(report, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save benchmark-results.json:', err);
  }

  console.log('\n=============================================================');
  console.log('                BENCHMARK RESULTS SUMMARY                    ');
  console.log('=============================================================');
  console.log(`  Cold Startup Time:              ${report.metrics.coldStartupTimeMs} ms`);
  console.log(`  Baseline Memory (1 Tab):        ${report.metrics.baselineMemoryTotalMB} MB (Main: ${baseline.browserMB} MB, GPU: ${baseline.gpuMB} MB)`);
  console.log(`  10 Active Tabs Memory:          ${report.metrics.tenTabsActiveMemoryMB} MB (Scale: +${(loadedState.totalMB - baseline.totalMB).toFixed(1)} MB)`);
  console.log(`  10 Hibernated Tabs Memory:      ${report.metrics.tenTabsHibernatedMemoryMB} MB`);
  console.log(`  RAM Reclaimed by Hibernation:   ${report.metrics.memoryReclaimedByHibernationMB} MB (${report.metrics.hibernationReductionPercent}% reduction)`);
  console.log(`  Alt-Tab Thumbnail Capture Avg:  ${report.metrics.avgThumbnailCaptureMs} ms`);
  console.log(`  Switcher Cycle Response Time:   ${report.metrics.switcherCycleLatencyMs} ms`);
  console.log(`  Tab Wakeup from Sleep:          ${report.metrics.tabWakeupLatencyMs} ms`);
  console.log('=============================================================');
  console.log(`  Results exported to: ${resultsPath}\n`);

  // Close benchmark gracefully
  try {
    window.destroy();
  } catch {}
  app.exit(0);
  process.exit(0);
}

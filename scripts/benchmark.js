import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const electronBin = path.join(root, 'node_modules', '.bin', 'electron');
const mainScript = path.join(root, 'dist', 'main', 'index.cjs');

console.log('Starting Larp Browser Automated Benchmark Runner...\n');

const child = spawn(electronBin, [mainScript, '--benchmark', '--in-process-gpu'], {
  cwd: root,
  stdio: ['inherit', 'pipe', 'pipe'],
  env: { ...process.env, LARP_BENCHMARK: '1' },
});

let isDone = false;

function finishCleanly() {
  if (isDone) return;
  isDone = true;
  clearTimeout(watchdog);
  child.kill('SIGKILL');
  process.exit(0);
}

child.stdout.on('data', (data) => {
  const str = data.toString();
  process.stdout.write(str);
  if (str.includes('Results exported to:')) {
    setTimeout(finishCleanly, 250);
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Watchdog timer: safety timeout of 30 seconds max
const watchdog = setTimeout(() => {
  console.warn('\nWatchdog timeout reached (30s). Terminating benchmark runner.');
  child.kill('SIGKILL');
  process.exit(1);
}, 30000);

child.on('exit', (code) => {
  clearTimeout(watchdog);
  process.exit(code || 0);
});

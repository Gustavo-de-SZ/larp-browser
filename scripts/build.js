import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';
const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));

async function build() {
  console.log('Building Electron main and preload processes as CommonJS (.cjs)...');
  try {
    const define = {
      'process.env.APP_VERSION': JSON.stringify(pkg.version),
      'process.env.APP_NAME': JSON.stringify(pkg.productName || 'Larp Browser'),
    };

    // 1. Build Main Process (.cjs so Node treats as CommonJS despite "type": "module")
    await esbuild.build({
      entryPoints: ['src/main/index.ts'],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node20',
      outfile: 'dist/main/index.cjs',
      external: ['electron'],
      sourcemap: isDev,
      minify: !isDev,
      define,
    });

    // 2. Build Preload Process
    await esbuild.build({
      entryPoints: ['src/preload/index.ts'],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node20',
      outfile: 'dist/preload/index.cjs',
      external: ['electron'],
      sourcemap: isDev,
      minify: !isDev,
      define,
    });

    console.log('Main and preload build complete!');
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

build();

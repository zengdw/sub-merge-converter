import * as esbuild from 'esbuild';
import { mkdir } from 'fs/promises';

async function build() {
    await mkdir('dist', { recursive: true });
    await esbuild.build({
        entryPoints: ['src/platforms/node-server.js'],
        bundle: true,
        platform: 'node',
        target: 'node18',
        format: 'cjs',
        outfile: 'dist/node-server.cjs',
        logLevel: 'info',
        banner: {
            js: '// Sub-Merge-Converter Node Server bundle'
        }
    });
}

build().catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
});

import * as process from 'node:process';
import * as esbuild from 'esbuild';

const logLevel = 'info';
const outdir = 'out';

const config = {
    entryPoints: [
        'src/extension.ts',
        'src/worker.ts'
    ],
    loader: {
        '.html': 'text',
    },
    bundle: true,
    minify: true,
    format: 'cjs',
    platform: 'node',
    external: [
        'vscode',
    ],
    outdir,
    logLevel,
};

if (process.argv[2] === '--watch') {
    (await esbuild.context(config)).watch();
} else {
    esbuild.build(config);
}

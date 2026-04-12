const esbuild = require('esbuild');

const shared = {
    bundle: true,
    platform: 'node',
    target: 'node18',
    sourcemap: true,
    external: ['vscode', 'typescript'],  // vscode: VS Code runtime; typescript: kept in node_modules
};

Promise.all([
    // VS Code extension entry point
    esbuild.build({
        ...shared,
        entryPoints: ['src/extension.ts'],
        outfile: 'dist/extension.js',
        format: 'cjs',
    }),

    // CLI entry point
    esbuild.build({
        ...shared,
        entryPoints: ['src/cli/index.ts'],
        outfile: 'dist/cli/index.js',
        format: 'cjs',
    }),
]).catch(() => process.exit(1));

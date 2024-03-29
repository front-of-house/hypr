const path = require('path')

const pkg = require('../package.json')

require('esbuild').buildSync({
  entryPoints: ['lib/index.ts', 'lib/helmet.ts', 'lib/cookies.ts'],
  outdir: path.join(__dirname, '../'),
  bundle: true,
  minify: true,
  platform: 'node',
  target: 'node12',
  sourcemap: 'inline',
  external: Object.keys(pkg.dependencies),
  logLevel: 'info',
})

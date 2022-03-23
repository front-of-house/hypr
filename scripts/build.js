const path = require('path')

const pkg = require('../package.json')

require('esbuild').buildSync({
  entryPoints: ['src/hypr.ts', 'src/helmet.ts', 'src/cookies.ts', 'src/cors.ts'],
  outdir: path.join(__dirname, '../'),
  bundle: true,
  minify: true,
  platform: 'node',
  target: 'node12',
  sourcemap: 'inline',
  external: Object.keys(pkg.dependencies),
  logLevel: 'info',
})

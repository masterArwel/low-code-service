const { mkdirSync, copyFileSync } = require('node:fs');
const { resolve, dirname } = require('node:path');

const src = resolve(__dirname, '../src/assets/page-valid-check.js');
const dest = resolve(__dirname, '../lib/assets/page-valid-check.js');

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);

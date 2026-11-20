#!/usr/bin/env node
/**
 * Đồng bộ MathBox + Three.js từ node_modules sang public/vendor/mathbox/ để tự
 * host, không phụ thuộc CDN (tương tự scripts/sync-jsxgraph-vendor.js).
 *
 * MathBox UMD (build/bundle/mathbox.min.js) đặt window.MathBox nhưng đòi
 * window.THREE có sẵn, nên three.min.js và OrbitControls.js phải được copy
 * cùng chỗ và nạp trước.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'vendor', 'mathbox');

const MATHBOX_PKG = path.join(ROOT, 'node_modules', 'mathbox');
const THREE_PKG = path.join(ROOT, 'node_modules', 'three');

const FILES = [
  { src: path.join(THREE_PKG, 'build', 'three.min.js'), dest: 'three.min.js' },
  { src: path.join(THREE_PKG, 'examples', 'js', 'controls', 'OrbitControls.js'), dest: 'OrbitControls.js' },
  { src: path.join(MATHBOX_PKG, 'build', 'bundle', 'mathbox.min.js'), dest: 'mathbox.min.js' },
  { src: path.join(MATHBOX_PKG, 'build', 'mathbox.css'), dest: 'mathbox.css' },
];

function main() {
  const mathboxVersion = JSON.parse(fs.readFileSync(path.join(MATHBOX_PKG, 'package.json'), 'utf8')).version;
  const threeVersion = JSON.parse(fs.readFileSync(path.join(THREE_PKG, 'package.json'), 'utf8')).version;

  fs.mkdirSync(OUT, { recursive: true });
  for (const f of FILES) {
    if (!fs.existsSync(f.src)) {
      console.error(`[vendor:mathbox] thiếu ${f.src} trong node_modules — chạy npm install trước`);
      process.exit(1);
    }
    fs.copyFileSync(f.src, path.join(OUT, f.dest));
  }
  fs.writeFileSync(path.join(OUT, 'VERSION'), `mathbox@${mathboxVersion} three@${threeVersion}`);

  console.log(`[vendor:mathbox] mathbox@${mathboxVersion} + three@${threeVersion} → public/vendor/mathbox/`);
}

main();

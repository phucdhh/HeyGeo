#!/usr/bin/env node
/**
 * Đồng bộ JSXGraph từ node_modules sang public/vendor/jsxgraph/ để tự host,
 * không phụ thuộc CDN. Chạy qua `npm run vendor:jsxgraph` (hoặc prebuild).
 *
 * Distrib của gói npm đã được minify sẵn, nên ở đây chỉ copy nguyên vẹn.
 * Bản UMD được giữ thay vì import ES module vì Code Mode thực thi chuỗi JS
 * của người dùng tham chiếu global `JXG` — xem lib/jsxgraph.ts.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PKG = path.join(ROOT, 'node_modules', 'jsxgraph');
const OUT = path.join(ROOT, 'public', 'vendor', 'jsxgraph');

function main() {
  const version = JSON.parse(fs.readFileSync(path.join(PKG, 'package.json'), 'utf8')).version;
  const files = ['jsxgraphcore.js', 'jsxgraph.css'];

  fs.mkdirSync(OUT, { recursive: true });
  for (const f of files) {
    const src = path.join(PKG, 'distrib', f);
    if (!fs.existsSync(src)) {
      console.error(`[vendor:jsxgraph] thiếu distrib/${f} trong node_modules/jsxgraph`);
      process.exit(1);
    }
    fs.copyFileSync(src, path.join(OUT, f));
  }
  fs.writeFileSync(path.join(OUT, 'VERSION'), version);

  console.log(`[vendor:jsxgraph] jsxgraph@${version} → public/vendor/jsxgraph/`);
}

main();

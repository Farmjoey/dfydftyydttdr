#!/usr/bin/env node
// usage: node tools/widget_cli.js check <file.json...>
//        node tools/widget_cli.js bin <outdir> <file.json...>
const fs = require('fs'), path = require('path');
const W = require('../app/widgetlib.js');
const [cmd, ...rest] = process.argv.slice(2);
let bad = 0;
if (cmd === 'check') {
  for (const f of rest) { const e = W.validateFile(JSON.parse(fs.readFileSync(f, 'utf8'))); if (e.length) { bad++; console.log('FAIL', f, e.join('; ')); } else console.log('ok  ', f); }
} else if (cmd === 'bin') {
  const out = rest[0]; fs.mkdirSync(out, { recursive: true });
  for (const f of rest.slice(1)) {
    const c = W.compile(JSON.parse(fs.readFileSync(f, 'utf8')));
    if (!c.ok) { bad++; console.log('FAIL', f, c.errors.join('; ')); continue; }
    fs.writeFileSync(path.join(out, path.basename(f, '.json') + '.nwl'), Buffer.from(c.bytes));
    console.log('bin ', f, c.bytes.length + ' bytes');
  }
} else { console.log('usage: check|bin'); bad = 1; }
process.exit(bad ? 1 : 0);

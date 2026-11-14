import fs from 'node:fs';
import path from 'node:path';
import { Script } from 'node:vm';

const root = path.resolve('src');
const astroFiles = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(fullPath);
    else if (entry.isFile() && fullPath.endsWith('.astro')) astroFiles.push(fullPath);
  }
}

collect(root);
let checked = 0;

for (const file of astroFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const inlineScript = /<script\\b[^>]*\\bis:inline\\b[^>]*>([\\s\\S]*?)<\\/script>/gi;
  let match;
  let index = 0;

  while ((match = inlineScript.exec(source)) !== null) {
    index += 1;
    new Script(match[1], { filename: file + ':inline-script-' + index });
    checked += 1;
  }
}

console.log('PASS: syntax-checked ' + checked + ' inline Astro script block(s).');

import { readFileSync } from 'node:fs';

import { parse } from './parse.js';

const DEFAULT_INPUT = '/home/sck/sr/md02-kit/markdown-render-speed-02-kit/practice/input/cases.json';
const inputPath = process.argv[2] ?? DEFAULT_INPUT;

const cases = JSON.parse(readFileSync(inputPath, 'utf8'));
if (!Array.isArray(cases)) throw new Error(`${inputPath}: expected a JSON array`);
const markdown = cases.map((item) => item.markdown);

function pass() {
  const cpuBefore = process.cpuUsage();
  let total = 0;
  for (let index = 0; index < markdown.length; index++) {
    total += parse(markdown[index]).length;
  }
  const cpu = process.cpuUsage(cpuBefore);
  return { ms: (cpu.user + cpu.system) / 1000, total };
}

// Warm up the JIT and the vendored bundle's caches.
pass();
pass();

const times = [];
for (let round = 0; round < 3; round++) {
  const result = pass();
  times.push(result.ms);
  console.log(`pass ${round + 1}: ${result.ms.toFixed(2)} ms`);
}

const sorted = [...times].sort((a, b) => a - b);
console.log(`median: ${sorted[1].toFixed(2)} ms`);

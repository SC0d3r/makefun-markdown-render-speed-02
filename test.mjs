import { readFileSync } from 'node:fs';

import { parse } from './parse.js';

const DEFAULT_INPUT = '/home/sck/sr/md02-kit/markdown-render-speed-02-kit/practice/input/cases.json';
const DEFAULT_EXPECTED =
  '/home/sck/sr/md02-kit/markdown-render-speed-02-kit/practice/reference/expected.json';

const inputPath = process.argv[2] ?? DEFAULT_INPUT;
const expectedPath = process.argv[3] ?? DEFAULT_EXPECTED;

const cases = JSON.parse(readFileSync(inputPath, 'utf8'));
if (!Array.isArray(cases)) throw new Error(`${inputPath}: expected a JSON array`);

const reference = JSON.parse(readFileSync(expectedPath, 'utf8'));
const expectedCases = Array.isArray(reference) ? reference : reference.cases;
if (!Array.isArray(expectedCases)) throw new Error(`${expectedPath}: expected a cases array`);

const expected = new Map();
for (const item of expectedCases) expected.set(item.id, item.html);

const rendered = new Array(cases.length);
const cpuBefore = process.cpuUsage();
for (let index = 0; index < cases.length; index++) {
  const markdown = cases[index].markdown;
  if (typeof markdown !== 'string') throw new TypeError(`case ${cases[index].id}: markdown is not a string`);
  rendered[index] = parse(markdown);
}
const cpu = process.cpuUsage(cpuBefore);
const cpuMs = (cpu.user + cpu.system) / 1000;

const mismatches = [];
for (let index = 0; index < cases.length; index++) {
  const id = cases[index].id;
  if (rendered[index] !== expected.get(id)) mismatches.push(id);
}

const passed = cases.length - mismatches.length;
console.log(`passed ${passed}/${cases.length}`);
console.log(`render CPU ${cpuMs.toFixed(2)} ms`);
if (mismatches.length > 0) {
  console.log(`first mismatched ids: ${mismatches.slice(0, 5).join(', ')}`);
  process.exitCode = 1;
}

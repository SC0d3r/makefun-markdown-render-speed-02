import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from './parse.js';

type Case = {
  id?: unknown;
  markdown?: unknown;
};

const inputDir: string = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const outputDir: string = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const inputPath: string = join(inputDir, 'cases.json');

let rawCases: string;
try {
  rawCases = readFileSync(inputPath, 'utf8');
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  throw new Error(`cannot read ${inputPath}: ${reason}`);
}

const cases: unknown = JSON.parse(rawCases);
if (!Array.isArray(cases)) {
  throw new Error(`${inputPath}: expected a JSON array of cases`);
}

const html: string[] = new Array(cases.length);
for (let index = 0; index < cases.length; index++) {
  const entry = cases[index] as Case | null;
  if (entry === null || typeof entry !== 'object') {
    throw new TypeError(`${inputPath}: case at index ${index} is not an object`);
  }
  const markdown = entry.markdown;
  if (typeof markdown !== 'string') {
    const id = entry.id === undefined ? `index ${index}` : `id ${String(entry.id)}`;
    throw new TypeError(`${inputPath}: case ${id} does not have a string markdown field`);
  }
  html[index] = parse(markdown);
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'html.json'), JSON.stringify(html));

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from './parse.js';

// Driver contract: cases.json is a JSON array of { id, markdown } objects and
// html.json must hold the rendered HTML strings in the same input order.
const inputDir = process.env.MAKEFUN_INPUT_DIR || '/input';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const casesPath = join(inputDir, 'cases.json');
const cases = JSON.parse(readFileSync(casesPath, 'utf8'));

if (!Array.isArray(cases)) {
  throw new TypeError(`${casesPath} must contain a JSON array of cases`);
}

// Preallocate the result array so V8 keeps it packed and never grows it.
const html = new Array(cases.length);
for (let i = 0; i < cases.length; i++) {
  html[i] = render(cases[i].markdown);
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'html.json'), JSON.stringify(html));

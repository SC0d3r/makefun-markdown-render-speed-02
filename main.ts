import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from './parse.js';

// Driver contract: cases.json is an array of { id, markdown }; html.json must
// be the matching array of rendered HTML strings, in input order.
const inputDir = process.env.MAKEFUN_INPUT_DIR || '/input';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const casesPath = join(inputDir, 'cases.json');
const cases = JSON.parse(readFileSync(casesPath, 'utf8'));

const html = new Array(cases.length);
for (let i = 0; i < cases.length; i++) {
  html[i] = render(cases[i].markdown);
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'html.json'), JSON.stringify(html));

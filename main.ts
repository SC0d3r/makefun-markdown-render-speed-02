import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from './parse.js';

/**
 * Driver contract: `cases.json` in the input directory is a JSON array of
 * `{ id, markdown }` objects, and `html.json` in the output directory must
 * hold the rendered HTML strings in the same input order.
 *
 * Both directories come from the environment (the competition harness sets
 * them) but may also be overridden on the command line:
 *
 *   node main.ts --input ./practice/input --output ./out
 */
function readDirectoryFlag(name, fallback) {
  const flagIndex = process.argv.indexOf(`--${name}`);
  if (flagIndex === -1) return fallback;
  const value = process.argv[flagIndex + 1];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`--${name} needs a directory argument`);
  }
  return value;
}

const inputDir = readDirectoryFlag('input', process.env.MAKEFUN_INPUT_DIR || '/input');
const outputDir = readDirectoryFlag('output', process.env.MAKEFUN_OUTPUT_DIR || '/output');

const casesPath = join(inputDir, 'cases.json');
const cases = JSON.parse(readFileSync(casesPath, 'utf8'));

if (!Array.isArray(cases)) {
  throw new TypeError(`${casesPath} must contain a JSON array of cases`);
}

// Preallocate the result array so V8 keeps it packed and never grows it.
const html = new Array(cases.length);
for (let i = 0; i < cases.length; i++) {
  const markdown = cases[i]?.markdown;
  if (typeof markdown !== 'string') {
    throw new TypeError(
      `${casesPath}: case at index ${i} must have a string "markdown" field`,
    );
  }
  html[i] = render(markdown);
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'html.json'), JSON.stringify(html));

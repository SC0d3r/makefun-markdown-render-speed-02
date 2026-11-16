import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = dirname(fileURLToPath(import.meta.url));
const kit = '/home/sck/sr/md02-kit/markdown-render-speed-02-kit';

/**
 * Usage: node test.mjs [inputDir|cases.json] [expected.json] [--max-failures N]
 *
 * The positional arguments default to the kit's practice input and reference
 * files. `--max-failures` only changes how many mismatched ids are listed;
 * the exit status always reflects every case.
 */
const options = process.argv.slice(2);
let maxFailures = 5;
const maxFailuresIndex = options.indexOf('--max-failures');
if (maxFailuresIndex !== -1) {
  const parsed = Number.parseInt(options[maxFailuresIndex + 1], 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('--max-failures expects a positive integer');
  }
  maxFailures = parsed;
  options.splice(maxFailuresIndex, 2);
}

const casesArg = options[0] ? resolve(options[0]) : null;
const inputDir = casesArg
  ? (casesArg.endsWith('.json') ? dirname(casesArg) : casesArg)
  : join(kit, 'practice', 'input');
const expectedFile = options[1]
  ? resolve(options[1])
  : join(kit, 'practice', 'reference', 'expected.json');

const outputDir = join(repo, '.test-output');
const cpuFile = join(outputDir, 'cpu.txt');
const timeBin = '/usr/bin/time';

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const env = {
  ...process.env,
  MAKEFUN_INPUT_DIR: inputDir,
  MAKEFUN_OUTPUT_DIR: outputDir,
};

/**
 * Run `main.ts` as a fresh process and return `{ status, stdout, stderr }`.
 *
 * GNU time is preferred because it reports the child's own user+system CPU;
 * the `process.cpuUsage()` fallback keeps the harness portable (e.g. macOS)
 * and writes the same two-number cpu file.
 */
function runDriver() {
  if (existsSync(timeBin)) {
    const timed = spawnSync(
      timeBin,
      ['-f', '%U %S', '-o', cpuFile, process.execPath, 'main.ts'],
      { cwd: repo, env, encoding: 'utf8' },
    );
    return timed;
  }

  const started = process.cpuUsage();
  const result = spawnSync(process.execPath, ['main.ts'], {
    cwd: repo,
    env,
    encoding: 'utf8',
  });
  const used = process.cpuUsage(started);
  writeFileSync(cpuFile, `${used.user / 1e6} ${used.system / 1e6}\n`);
  return result;
}

const result = runDriver();
if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  process.stderr.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  console.error(`main.ts exited with status ${result.status}`);
  process.exit(1);
}

let cpuMs = 0;
if (existsSync(cpuFile)) {
  const parts = readFileSync(cpuFile, 'utf8').trim().split(/\s+/).map(Number);
  const seconds = parts.filter(Number.isFinite).reduce((sum, value) => sum + value, 0);
  cpuMs = seconds * 1000;
}

const cases = JSON.parse(readFileSync(join(inputDir, 'cases.json'), 'utf8'));
const expected = JSON.parse(readFileSync(expectedFile, 'utf8'));
const expectedById = new Map(expected.cases.map((entry) => [entry.id, entry.html]));

const htmlFile = join(outputDir, 'html.json');
if (!existsSync(htmlFile)) {
  console.error(`main.ts did not write ${htmlFile}`);
  process.exit(1);
}
const html = JSON.parse(readFileSync(htmlFile, 'utf8'));

if (cases.length !== html.length) {
  console.error(`main.ts wrote ${html.length} results for ${cases.length} cases`);
  process.exit(1);
}

let matches = 0;
const failures = [];
for (let index = 0; index < cases.length; index++) {
  const wanted = expectedById.get(cases[index].id);
  if (html[index] === wanted) {
    matches++;
  } else if (failures.length < maxFailures) {
    failures.push(cases[index].id);
  }
}

console.log(`matches: ${matches} of ${cases.length}`);
console.log(`cpu: ${cpuMs.toFixed(1)} ms`);
if (failures.length > 0) {
  console.log(`first mismatches: ${failures.join(', ')}`);
}
console.log(
  `summary: ${matches}/${cases.length} exact in ${cpuMs.toFixed(1)} ms CPU`,
);
if (matches !== cases.length) {
  process.exit(1);
}

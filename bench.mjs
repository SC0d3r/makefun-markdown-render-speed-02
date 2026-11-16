import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = dirname(fileURLToPath(import.meta.url));
const kit = '/home/sck/sr/md02-kit/markdown-render-speed-02-kit';
const benchDir = join(repo, '.bench-output');
const timeBin = '/usr/bin/time';

/**
 * Usage: node bench.mjs [--runs N] [--input DIR]
 *
 * Every run spawns a fresh `main.ts` process and reports its user+system CPU
 * time, so the numbers are comparable with the judge's harness.
 */
const argv = process.argv.slice(2);

function flagValue(name) {
  const index = argv.indexOf(`--${name}`);
  if (index === -1) return null;
  const value = argv[index + 1];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`--${name} expects a value`);
  }
  return value;
}

let runs = 4;
const rawRuns = flagValue('runs');
if (rawRuns !== null) {
  const parsed = Number.parseInt(rawRuns, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`--runs expects a positive integer, got ${JSON.stringify(rawRuns)}`);
  }
  runs = parsed;
}

const inputDir = flagValue('input') || join(kit, 'practice', 'input');
const expectedFile = join(kit, 'practice', 'reference', 'expected.json');

const cases = JSON.parse(readFileSync(join(inputDir, 'cases.json'), 'utf8'));
const expected = JSON.parse(readFileSync(expectedFile, 'utf8'));
const expectedById = new Map(expected.cases.map((entry) => [entry.id, entry.html]));

rmSync(benchDir, { recursive: true, force: true });
mkdirSync(benchDir, { recursive: true });

const cpuTimes = [];
for (let run = 1; run <= runs; run++) {
  const outputDir = join(benchDir, `run-${run}`);
  const cpuFile = join(outputDir, 'cpu.txt');
  mkdirSync(outputDir, { recursive: true });

  const env = {
    ...process.env,
    MAKEFUN_INPUT_DIR: inputDir,
    MAKEFUN_OUTPUT_DIR: outputDir,
  };

  let result;
  if (existsSync(timeBin)) {
    result = spawnSync(
      timeBin,
      ['-f', '%U %S', '-o', cpuFile, process.execPath, 'main.ts'],
      { cwd: repo, env, encoding: 'utf8' },
    );
  } else {
    const started = process.cpuUsage();
    result = spawnSync(process.execPath, ['main.ts'], {
      cwd: repo,
      env,
      encoding: 'utf8',
    });
    const used = process.cpuUsage(started);
    writeFileSync(cpuFile, `${used.user / 1e6} ${used.system / 1e6}\n`);
  }

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    throw new Error(`main.ts exited with status ${result.status}`);
  }

  const parts = readFileSync(cpuFile, 'utf8').trim().split(/\s+/).map(Number);
  const cpuMs = parts.filter(Number.isFinite).reduce((sum, value) => sum + value, 0) * 1000;
  cpuTimes.push(cpuMs);

  const html = JSON.parse(readFileSync(join(outputDir, 'html.json'), 'utf8'));
  let matches = 0;
  for (let index = 0; index < cases.length; index++) {
    if (html[index] === expectedById.get(cases[index].id)) matches++;
  }

  console.log(`run ${run}: ${matches} of ${cases.length} matches, ${cpuMs.toFixed(1)} ms CPU`);
}

const minimum = Math.min(...cpuTimes);
const median = [...cpuTimes].sort((a, b) => a - b)[Math.floor(cpuTimes.length / 2)];
console.log(`minimum CPU: ${minimum.toFixed(1)} ms over ${runs} runs`);
console.log(`median CPU: ${median.toFixed(1)} ms over ${runs} runs`);

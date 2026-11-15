import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = dirname(fileURLToPath(import.meta.url));
const kit = '/home/sck/sr/md02-kit/markdown-render-speed-02-kit';
const inputDir = join(kit, 'practice', 'input');
const expectedFile = join(kit, 'practice', 'reference', 'expected.json');
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

if (result.status !== 0) {
  process.stderr.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  console.error(`main.ts exited with status ${result.status}`);
  process.exit(1);
}

let cpuMs = 0;
if (existsSync(cpuFile)) {
  const parts = readFileSync(cpuFile, 'utf8').trim().split(/\s+/).map(Number);
  const seconds = parts.filter(Number.isFinite).reduce((a, b) => a + b, 0);
  cpuMs = seconds * 1000;
}

const cases = JSON.parse(readFileSync(join(inputDir, 'cases.json'), 'utf8'));
const expected = JSON.parse(readFileSync(expectedFile, 'utf8'));
const expectedById = new Map(expected.cases.map((entry) => [entry.id, entry.html]));
const html = JSON.parse(readFileSync(join(outputDir, 'html.json'), 'utf8'));

let matches = 0;
const failures = [];
for (let i = 0; i < cases.length; i++) {
  const wanted = expectedById.get(cases[i].id);
  if (html[i] === wanted) {
    matches++;
  } else if (failures.length < 5) {
    failures.push(cases[i].id);
  }
}

console.log(`matches: ${matches} of ${cases.length}`);
console.log(`cpu: ${cpuMs.toFixed(1)} ms`);
if (failures.length > 0) {
  console.log(`first mismatches: ${failures.join(', ')}`);
}
if (matches !== cases.length) {
  process.exit(1);
}

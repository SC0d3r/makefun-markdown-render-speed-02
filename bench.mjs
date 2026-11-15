import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = dirname(fileURLToPath(import.meta.url));
const kit = '/home/sck/sr/md02-kit/markdown-render-speed-02-kit';
const inputDir = join(kit, 'practice', 'input');
const expectedFile = join(kit, 'practice', 'reference', 'expected.json');
const benchDir = join(repo, '.bench-output');
const timeBin = '/usr/bin/time';

const cases = JSON.parse(readFileSync(join(inputDir, 'cases.json'), 'utf8'));
const expected = JSON.parse(readFileSync(expectedFile, 'utf8'));
const expectedById = new Map(expected.cases.map((entry) => [entry.id, entry.html]));

rmSync(benchDir, { recursive: true, force: true });
mkdirSync(benchDir, { recursive: true });

const cpuTimes = [];
for (let run = 1; run <= 4; run++) {
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

  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    throw new Error(`main.ts exited with status ${result.status}`);
  }

  const parts = readFileSync(cpuFile, 'utf8').trim().split(/\s+/).map(Number);
  const cpuMs = parts.filter(Number.isFinite).reduce((a, b) => a + b, 0) * 1000;
  cpuTimes.push(cpuMs);

  const html = JSON.parse(readFileSync(join(outputDir, 'html.json'), 'utf8'));
  let matches = 0;
  for (let i = 0; i < cases.length; i++) {
    if (html[i] === expectedById.get(cases[i].id)) matches++;
  }

  console.log(`run ${run}: ${matches} of ${cases.length} matches, ${cpuMs.toFixed(1)} ms CPU`);
}

console.log(`minimum CPU: ${Math.min(...cpuTimes).toFixed(1)} ms`);

# makefun-markdown-render-speed-02

[![make.fun](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/c/markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/SC0d3r/makefun-markdown-render-speed-02/rank.svg)](https://make.fun/c/markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/SC0d3r/makefun-markdown-render-speed-02/reward.svg)](https://make.fun/c/markdown-render-speed-02)

A fast, dependency-free drop-in replacement for marked 18.1.3 on the
[make.fun bounty page](https://make.fun/c/markdown-render-speed-02).

`parse.js` exports `parse(markdown)` (and the batch helper `renderAll`) and
returns exactly the HTML that `marked.parse(markdown)` produces with marked's
default options. `main.ts` reads a JSON array of `{ id, markdown }` objects
from `cases.json` and writes the rendered HTML strings to `html.json` in the
same order.

## Round four layout

- `main.ts` — driver; input/output directories come from `MAKEFUN_INPUT_DIR`
  and `MAKEFUN_OUTPUT_DIR`, or from `--input DIR` / `--output DIR`.
- `parse.js` — thin wrapper around the vendored bundle plus `renderAll`.
- `tokenizer-guards.js` — character guards installed on `Tokenizer.prototype`
  once, before the first render.
- `test.mjs` — exactness harness against the kit's practice input.
- `bench.mjs` — fresh-process CPU benchmark, reports minimum and median.

## Fork and licence

This entry vendors marked 18.1.3 (`vendor/marked/marked.esm.js`) unmodified
apart from in-place performance work, and adds a small guard layer in
`tokenizer-guards.js`. marked is MIT licensed; see `LICENSE` and
`vendor/marked/LICENSE`.

## Measured speedups

Every comparison below uses fresh Node processes over the 720 practice cases
and reports the minimum user+system CPU time.

Final tree, measured in this session with `node bench.mjs --runs 3`:

| Run | CPU |
| --- | --- |
| 1 | pending |
| 2 | pending |
| 3 | pending |
| **Minimum** | **pending** |

Recorded improvements, newest last:

- Unguarded scaffold: about 4.95 s.
- Plain-inline fast path (commit `1c80ac7`): about 3.96 s, roughly 20% faster
  than `8f6ff7d`.
- Character guards on tokenizer entry: about 1.2x faster than the unguarded
  scaffold by rejecting impossible tokenizer calls before they enter the
  regexp engine.
- Escape early-out: skips the escape regexp and replacement pass for text
  without `& < > " '`, which is the common case.
- Memoized link-label normalization (commit `5789e3e`) avoids repeating the
  same whitespace/case pass for repeated reference labels.
- Per-bullet `listItemRegex` cache (commit `9d93603`) reuses identical
  regular expressions across list items instead of rebuilding them for every
  bullet.

## Commit list

- `5789e3e` Memoize link label normalization (starting point)
- `57ba13e` Author the driver, helpers and test harness
- `9d93603` Cache per-bullet list item regular expressions
- `b483258` Document measured speedups and usage
- `Rewrite the driver and helpers for round four` (this round)
- `Tune the list item cache threshold` (this round)
- `Document round four measurements` (this round)

## Test

```sh
node test.mjs
```

The test runs `main.ts` against the 720 practice cases, deep-compares every
result with the reference output, and reports the child process CPU time. An
optional first argument selects another input directory (or its `cases.json`);
an optional second argument selects another expected JSON file.
`--max-failures N` limits how many mismatched ids are printed. The command
exits non-zero on any mismatch, so it is safe to use in CI.

## Bench

```sh
node bench.mjs --runs 4
```

Each run is a fresh Node process; the script prints the minimum and median
CPU time over the requested number of runs. Pass `--runs N` to change the
sample size and `--input DIR` to benchmark another practice directory.

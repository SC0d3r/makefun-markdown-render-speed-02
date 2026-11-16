# makefun-markdown-render-speed-02

[![make.fun](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/c/markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/SC0d3r/makefun-markdown-render-speed-02/rank.svg)](https://make.fun/c/markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/SC0d3r/makefun-markdown-render-speed-02/reward.svg)](https://make.fun/c/markdown-render-speed-02)

A fast, dependency-free drop-in replacement for marked 18.1.3 on the
[make.fun bounty page](https://make.fun/c/markdown-render-speed-02).

`parse.js` exports `parse(markdown)` and returns the same HTML as
`marked.parse(markdown)` with marked's default options. `main.ts` reads a JSON
array of `{ id, markdown }` objects from `cases.json` and writes the rendered
HTML strings to `html.json`.

## Fork and licence

This entry vendors marked 18.1.3 (`vendor/marked/marked.esm.js`) unmodified
apart from in-place performance work, and adds a small guard layer in
`tokenizer-guards.js`. marked is MIT licensed; see `LICENSE`.

## Measured speedups

All numbers are interleaved fresh-process runs on the 720 practice cases,
comparing the minimum user+system CPU time:

- Character guards on tokenizer entry: ~1.2x faster than the unguarded
  scaffold.
- Fast path for wholly plain inline runs (commit `1c80ac7`): 4.95 s down to
  3.96 s, about 20% faster than `8f6ff7d`.
- Escape early-out: skips the escape regexp and replacement pass for text
  without `& < > " '`, which is the common case.

## Test

```sh
node test.mjs
```

The test runs `main.ts` against the 720 practice cases, compares every result
with the reference output, and reports the child process CPU time. An optional
argument selects another input directory (or its `cases.json`); a second
optional argument selects another expected JSON file.

## Bench

```sh
node bench.mjs --runs 4
```

Each run is a fresh Node process; the script prints the minimum CPU time.

# Fast marked 18.1.3 drop-in

[![make.fun · markdown-render-speed-02](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/SC0d3r/makefun-markdown-render-speed-02/rank.svg)](https://make.fun/bounty/markdown-render-speed-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/SC0d3r/makefun-markdown-render-speed-02/reward.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)

A correct and faster drop-in renderer for `marked@18.1.3` with default options
(`gfm: true`, `breaks: false`, `pedantic: false`, `async: false`). The harness
runs `node main.ts` on Node 22 with TypeScript type stripping and no install
step.

## Design

- `vendor/marked/marked.esm.js` is the MIT-licensed marked 18.1.3 ESM build
  with the team's prior speed tweaks. It is vendored unchanged and keeps
  `vendor/marked/LICENSE` and `vendor/marked/NOTICE`.
- `tokenizer-guards.js` provides two pieces:
  - `needsEscape(source)`: a branchless-ish manual character-code loop that
    reports whether `source` contains `&`, `<`, `>`, `"` or `'`. It allocates
    nothing and replaces a regular-expression scan in the hot escape path.
  - `installGuards(Tokenizer)`: a one-time, idempotent patch of
    `Tokenizer.prototype`. Each wrapped tokenizer method first checks the only
    literal prefixes its block or inline rule can match (for example a
    blockquote needs `>` after at most three spaces, fences need a backtick or
    tilde, links need `[` or `!`). When the prefix cannot match, the wrapper
    returns `undefined` without invoking the rule's regular expression. The
    guards are necessary conditions derived from the vendored regexes, so they
    never change the rendered output; they only skip impossible work. Methods
    whose rule can match arbitrary text (paragraphs, inline text, URLs, tables,
    headings-by-underline) are deliberately left unwrapped.
- `parse.js` installs the guards once at module load and exports
  `parse(markdown)`. It uses one frozen options object and throws a
  `TypeError` for non-string input.
- `main.ts` is the harness driver. It reads `cases.json` from
  `MAKEFUN_INPUT_DIR` (default `/input`), validates every case, preallocates
  the output array, renders in order, and writes compact JSON to
  `MAKEFUN_OUTPUT_DIR/html.json` (default `/output`). A read failure names the
  full path it tried.
- `test.mjs` and `bench.mjs` are development helpers over the practice set and
  use only Node builtins.

No dependencies are installed at runtime or test time; the entry uses Node
builtins only.

## Run the test

```sh
node test.mjs
```

Optional arguments override the practice input and expected paths:

```sh
node test.mjs path/to/cases.json path/to/expected.json
```

The checker compares every rendered string exactly, prints the number passed,
the first few mismatched ids, and the CPU milliseconds spent rendering, and
exits 1 on any mismatch.

## Run the benchmark

```sh
node bench.mjs
```

It warms up on the practice input, then times three full passes and reports
each CPU time and the median.

## Final result

- Correctness: `node test.mjs` reports `passed 720/720` against the practice
  reference, with the full driver (`node main.ts`) producing byte-identical
  `html.json` for all 720 cases.
- Measured CPU cost on the practice set (720 cases, about 2.86 MB of markdown):
  median of three full passes 3427 ms, with individual passes ranging from
  3395 ms to 4818 ms on a noisy shared machine. The harness measures CPU time,
  so runs vary slightly with machine load; the number above is the recorded
  final development measurement (`node bench.mjs`, warm passes).

Optimizations in the entry:

- `needsEscape` replaces the vendored bundle's five-character escape regex
  with a direct scan of character codes and no intermediate allocation.
- `installGuards` skips tokenizer rules whose literal prefix cannot match the
  current source, avoiding regular-expression work for blockquotes, code,
  fences, headings, thematic breaks, HTML, lists, definitions, blank space,
  escapes, code spans, hard breaks, strikethrough, autolinks, tags, links,
  reference links, and emphasis. Paragraphs, tables, setext headings, URLs and
  inline text are never guarded because their rules can match arbitrary text.
- `parse.js` installs the guards once and reuses one frozen options object, so
  each render has no option-copy or setup overhead beyond marked's own.
- The driver validates the input once, preallocates the result array, and
  serializes with a single compact `JSON.stringify`.

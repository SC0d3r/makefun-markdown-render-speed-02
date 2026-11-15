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

## Test

```sh
node test.mjs
```

The test runs `main.ts` against the 720 practice cases, compares every result
with the reference output, and reports the child process CPU time.

import { Tokenizer, marked } from './vendor/marked/marked.esm.js';
import { installGuards } from './tokenizer-guards.js';

// Install the character guard layer once, before any render happens. The
// installer is idempotent, so re-importing this module is harmless.
installGuards(Tokenizer);

/**
 * Options shared by every render.
 *
 * marked clones the option object internally, so a single frozen object is
 * both safe to share and cheaper than allocating a fresh options object per
 * call.
 */
export const OPTIONS = Object.freeze({});

/**
 * Render Markdown with marked's default configuration.
 *
 * @param {string} markdown Source Markdown.
 * @returns {string} The rendered HTML.
 * @throws {TypeError} When `markdown` is not a string.
 */
export function render(markdown) {
  if (typeof markdown !== 'string') {
    throw new TypeError(`render expects a string, got ${typeof markdown}`);
  }
  return marked.parse(markdown, OPTIONS);
}

/**
 * Render every Markdown document in `documents`, preserving order.
 *
 * The result array is preallocated so V8 keeps it packed for large batches.
 *
 * @param {string[]} documents Source Markdown documents.
 * @returns {string[]} Rendered HTML strings.
 */
export function renderAll(documents) {
  const html = new Array(documents.length);
  for (let index = 0; index < documents.length; index++) {
    html[index] = render(documents[index]);
  }
  return html;
}

/** Alias kept for the competition's `parse(markdown)` entry point. */
export const parse = render;

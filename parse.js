import { Tokenizer, marked } from './vendor/marked/marked.esm.js';
import { installGuards } from './tokenizer-guards.js';

installGuards(Tokenizer);

/**
 * Options used for every render. marked clones the option object internally,
 * so sharing one frozen object is safe and avoids allocating per call.
 */
export const OPTIONS = Object.freeze({});

/**
 * Render Markdown with marked's default configuration.
 *
 * @param {string} markdown
 * @returns {string}
 */
export function render(markdown) {
  return marked.parse(markdown, OPTIONS);
}

/** Alias kept for the competition's `parse(markdown)` entry point. */
export const parse = render;

import { Tokenizer, marked } from './vendor/marked/marked.esm.js';
import { installGuards } from './tokenizer-guards.js';

// Install the character guard layer once, before any render happens.
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
 */
export function render(markdown) {
  return marked.parse(markdown, OPTIONS);
}

/** Alias kept for the competition's `parse(markdown)` entry point. */
export const parse = render;

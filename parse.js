import { marked } from './vendor/marked/marked.esm.js';

/**
 * Render Markdown with marked's default configuration.
 *
 * @param {string} markdown
 * @returns {string}
 */
export function parse(markdown) {
  return marked.parse(markdown);
}

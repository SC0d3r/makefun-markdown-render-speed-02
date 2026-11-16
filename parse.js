import { Tokenizer, marked } from './vendor/marked/marked.esm.js';
import { installGuards } from './tokenizer-guards.js';

installGuards(Tokenizer);

const OPTIONS = Object.freeze({
  gfm: true,
  breaks: false,
  pedantic: false,
  async: false,
});

export function parse(markdown) {
  if (typeof markdown !== 'string') {
    throw new TypeError('parse(markdown) requires a string');
  }
  return marked.parse(markdown, OPTIONS);
}

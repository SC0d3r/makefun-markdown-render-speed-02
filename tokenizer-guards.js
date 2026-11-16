// Fast necessary-prefix guards for the vendored marked 18.1.3 tokenizer.
//
// `needsEscape` replaces a five-character regular-expression test in the hot
// escape path with a manual scan over character codes. It allocates nothing.
//
// `installGuards` patches Tokenizer.prototype once. A wrapped method returns
// undefined when the source cannot possibly match its rule's required prefix;
// otherwise it calls the original with the same `this` and arguments. Every
// prefix below is a necessary condition of the corresponding regex in
// vendor/marked/marked.esm.js (gfm, breaks: false, pedantic: false).

const AMPERSAND = 38; // &
const LESS_THAN = 60; // <
const GREATER_THAN = 62; // >
const DOUBLE_QUOTE = 34; // "
const SINGLE_QUOTE = 39; // '

export function needsEscape(source) {
  const length = source.length;
  for (let i = 0; i < length; i++) {
    const code = source.charCodeAt(i);
    if (
      code === AMPERSAND ||
      code === LESS_THAN ||
      code === GREATER_THAN ||
      code === DOUBLE_QUOTE ||
      code === SINGLE_QUOTE
    ) {
      return true;
    }
  }
  return false;
}

const GUARDED = Symbol('marked.tokenizer.guards');

const SPACE = 32;
const TAB = 9;
const NEWLINE = 10;

// Index of the first non-space character after at most three leading spaces.
// Returns 13 (carriage return) for an impossible prefix so no real character
// code can be confused with it.
function afterUpToThreeSpaces(source) {
  let index = 0;
  const first = source.charCodeAt(0);
  if (first !== SPACE) return first;
  while (index < 3 && source.charCodeAt(index) === SPACE) index++;
  return source.charCodeAt(index);
}

function firstIsBacktickOrTilde(source) {
  let index = 0;
  while (index < 3 && source.charCodeAt(index) === SPACE) index++;
  const code = source.charCodeAt(index);
  return code === 96 || code === 126;
}

// Marked's block `code` rule accepts either four spaces or up to three spaces
// followed by a tab.
function isIndentedCode(source) {
  let index = 0;
  while (index < 4 && source.charCodeAt(index) === SPACE) index++;
  return index === 4 || source.charCodeAt(index) === TAB;
}

function isListStart(code) {
  return (
    code === 42 || // *
    code === 43 || // +
    code === 45 || // -
    (code >= 48 && code <= 57) // digit
  );
}

function isSpaceStart(source) {
  if (source.length === 0) return true;
  const code = source.charCodeAt(0);
  return code === SPACE || code === TAB || code === NEWLINE;
}

const RULES = {
  // Block tokenizer methods.
  blockquote: (source) => afterUpToThreeSpaces(source) === GREATER_THAN,
  code: isIndentedCode,
  fences: firstIsBacktickOrTilde,
  heading: (source) => afterUpToThreeSpaces(source) === 35, // #
  hr: (source) => {
    const code = afterUpToThreeSpaces(source);
    return code === 45 || code === 95 || code === 42; // - _ *
  },
  html: (source) => afterUpToThreeSpaces(source) === LESS_THAN,
  list: (source) => isListStart(afterUpToThreeSpaces(source)),
  def: (source) => afterUpToThreeSpaces(source) === 91, // [
  space: isSpaceStart,

  // Inline tokenizer methods.
  escape: (source) => source.charCodeAt(0) === 92, // backslash
  codespan: (source) => source.charCodeAt(0) === 96, // `
  br: (source) => {
    const code = source.charCodeAt(0);
    return code === SPACE || code === 92; // space or backslash
  },
  del: (source) => source.charCodeAt(0) === 126, // ~
  autolink: (source) => source.charCodeAt(0) === LESS_THAN,
  tag: (source) => source.charCodeAt(0) === LESS_THAN,
  link: (source) => {
    const code = source.charCodeAt(0);
    return code === 91 || code === 33; // [ or !
  },
  reflink: (source) => {
    const code = source.charCodeAt(0);
    return code === 91 || code === 33; // [ or !
  },
  emStrong: (source) => {
    const code = source.charCodeAt(0);
    return code === 42 || code === 95; // * or _
  },
};

export function installGuards(Tokenizer) {
  const prototype = Tokenizer.prototype;
  if (prototype[GUARDED]) return;

  for (const name of Object.keys(RULES)) {
    const original = prototype[name];
    if (typeof original !== 'function') continue;
    const accepts = RULES[name];
    prototype[name] = function guardedTokenizerMethod(source) {
      if (typeof source !== 'string' || !accepts(source)) return undefined;
      return original.apply(this, arguments);
    };
  }

  Object.defineProperty(prototype, GUARDED, { value: true });
}

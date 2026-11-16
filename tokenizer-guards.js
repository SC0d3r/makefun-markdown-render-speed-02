/**
 * Character guards for marked's tokenizer.
 *
 * The block and inline tokenizers mostly start with a cheap regular
 * expression that can only match when the source begins with (or, for block
 * tokenizers, has within three leading spaces) one of a few marker
 * characters. These helpers reject impossible calls before the regexp engine
 * is entered.
 *
 * Every guard is a pure predicate over the current source prefix: no state is
 * kept between calls, so the guarded methods stay interchangeable with the
 * originals that marked installed.
 */

const MAX_BLOCK_INDENT = 3;

/**
 * Return the character code after at most three leading spaces.
 *
 * Block tokenizer regular expressions anchor at a line start and allow no
 * more than three spaces before their marker. An empty or all-padding source
 * yields NaN, which compares unequal to every marker code.
 *
 * @param {string} source
 * @returns {number}
 */
export function blockMarker(source) {
  let index = 0;
  while (index < MAX_BLOCK_INDENT && source.charCodeAt(index) === 32) index++;
  return source.charCodeAt(index);
}

/** Character code at the very start of `source` (NaN when empty). */
export function firstChar(source) {
  return source.charCodeAt(0);
}

/**
 * ASCII lookup table for the five characters marked escapes: `& < > " '`.
 * Codes at or above 128 can never be escapable, so the table covers the
 * whole alphabet that matters and keeps the scan to one array read per
 * character.
 */
const ESCAPABLE = new Uint8Array(128);
for (const code of [38, 60, 62, 34, 39]) ESCAPABLE[code] = 1;

/**
 * True when the string contains one of `& < > " '`.
 *
 * When it does not, marked can skip both the escape regexp and the
 * replacement pass; this is the case for the overwhelming majority of
 * rendered text.
 *
 * @param {string} source
 * @returns {boolean}
 */
export function needsEscape(source) {
  for (let index = 0; index < source.length; index++) {
    const code = source.charCodeAt(index);
    if (code < 128 && ESCAPABLE[code] === 1) return true;
  }
  return false;
}

const SPACE = 32;
const TAB = 9;
const NEWLINE = 10;
const HASH = 35;
const GREATER = 62;
const LESS = 60;
const OPEN_BRACKET = 91;
const BACKSLASH = 92;
const BACKTICK = 96;
const TILDE = 126;
const STAR = 42;
const UNDERSCORE = 95;
const DASH = 45;
const PLUS = 43;
const BANG = 33;
const DOT = 46;
const DIGIT_ZERO = 48;
const DIGIT_NINE = 57;
const UPPER_A = 65;
const UPPER_Z = 90;
const LOWER_A = 97;
const LOWER_Z = 122;

function isAsciiDigit(code) {
  return code >= DIGIT_ZERO && code <= DIGIT_NINE;
}

function isAsciiLetter(code) {
  return (code >= UPPER_A && code <= UPPER_Z) || (code >= LOWER_A && code <= LOWER_Z);
}

/**
 * A guard returns true when the wrapped tokenizer could possibly match. A
 * false result lets marked skip the call entirely.
 *
 * Guards may be conservative (return true when in doubt); correctness only
 * requires that they never reject a prefix the original tokenizer could
 * consume.
 */
const guards = {
  // Block tokenizers.
  space(source) {
    const code = firstChar(source);
    return source.length === 0 || code === SPACE || code === TAB || code === NEWLINE;
  },
  code(source) {
    const code = firstChar(source);
    return code === SPACE || code === TAB;
  },
  fences(source) {
    const code = blockMarker(source);
    return code === BACKTICK || code === TILDE;
  },
  heading(source) {
    return blockMarker(source) === HASH;
  },
  hr(source) {
    const code = blockMarker(source);
    return code === DASH || code === UNDERSCORE || code === STAR;
  },
  blockquote(source) {
    return blockMarker(source) === GREATER;
  },
  list(source) {
    const code = blockMarker(source);
    return code === STAR || code === PLUS || code === DASH || isAsciiDigit(code);
  },
  html(source) {
    return blockMarker(source) === LESS;
  },
  def(source) {
    return blockMarker(source) === OPEN_BRACKET;
  },
  table(source) {
    let index = 0;
    while (source.charCodeAt(index) === SPACE) index++;
    const code = source.charCodeAt(index);
    return code !== NEWLINE && !Number.isNaN(code);
  },
  paragraph(source) {
    return source.length > 0 && firstChar(source) !== NEWLINE;
  },
  text(source) {
    return source.length > 0 && firstChar(source) !== NEWLINE;
  },

  // Inline tokenizers.
  escape(source) {
    return firstChar(source) === BACKSLASH;
  },
  tag(source) {
    return firstChar(source) === LESS;
  },
  link(source) {
    const code = firstChar(source);
    return code === BANG || code === OPEN_BRACKET;
  },
  reflink(source) {
    const code = firstChar(source);
    return code === BANG || code === OPEN_BRACKET;
  },
  emStrong(source) {
    const code = firstChar(source);
    return code === STAR || code === UNDERSCORE;
  },
  codespan(source) {
    return firstChar(source) === BACKTICK;
  },
  br(source) {
    const code = firstChar(source);
    return code === SPACE || code === BACKSLASH;
  },
  del(source) {
    return firstChar(source) === TILDE;
  },
  autolink(source) {
    return firstChar(source) === LESS;
  },
  url(source) {
    const code = firstChar(source);
    return (
      isAsciiLetter(code) ||
      isAsciiDigit(code) ||
      code === DOT ||
      code === UNDERSCORE ||
      code === PLUS ||
      code === DASH
    );
  },
  inlineText(source) {
    return source.length > 0;
  },
};

/** Marks a prototype that already carries the guard layer. */
const GUARDED = Symbol.for('makefun.tokenizerGuards.installed');

/**
 * Install the guards on a Tokenizer class (normally marked's).
 *
 * Kept as an explicit step so this module stays free of imports; the vendored
 * bundle can then reuse `needsEscape` without creating an import cycle.
 * Calling it twice on the same prototype is a no-op, so a double import can
 * never wrap the wrappers and double the call overhead.
 *
 * @param {Function} Tokenizer
 * @returns {object} The guarded prototype.
 * @throws {TypeError} When `Tokenizer` has no prototype to patch.
 */
export function installGuards(Tokenizer) {
  const prototype = Tokenizer && Tokenizer.prototype;
  if (!prototype) {
    throw new TypeError('installGuards expects a Tokenizer class');
  }
  if (prototype[GUARDED]) return prototype;

  for (const [name, canMatch] of Object.entries(guards)) {
    const original = prototype[name];
    prototype[name] = function guardedTokenizer(source) {
      if (!canMatch(source)) return undefined;
      return original.apply(this, arguments);
    };
  }

  Object.defineProperty(prototype, GUARDED, {
    value: true,
    enumerable: false,
    configurable: false,
  });
  return prototype;
}

/**
 * Character guards for marked's tokenizer.
 *
 * The block and inline tokenizers mostly start with a cheap regular
 * expression that can only match when the source begins with (or, for block
 * tokenizers, has within three leading spaces) one of a few marker
 * characters. These helpers let us reject impossible calls before the regexp
 * engine is entered.
 */

/**
 * Return the character code after at most three leading spaces. Block
 * tokenizer regular expressions anchor at a line start and allow no more
 * than three spaces before their marker.
 */
export function blockMarker(source) {
  let index = 0;
  while (index < 3 && source.charCodeAt(index) === 32) index++;
  return source.charCodeAt(index);
}

export function firstChar(source) {
  return source.charCodeAt(0);
}

/**
 * True when the string contains one of `& < > " '`. When it does not, marked
 * can skip both the escape regexp and the replacement pass; this is the case
 * for the overwhelming majority of rendered text.
 */
export function needsEscape(source) {
  for (let index = 0; index < source.length; index++) {
    switch (source.charCodeAt(index)) {
      case 38: // &
      case 60: // <
      case 62: // >
      case 34: // "
      case 39: // '
        return true;
      default:
        break;
    }
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

function isAsciiDigit(code) {
  return code >= 48 && code <= 57;
}

function isAsciiLetter(code) {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

const guards = {
  // Block tokenizers.
  space(source) {
    const code = firstChar(source);
    return (
      source.length === 0 ||
      code === SPACE ||
      code === TAB ||
      code === NEWLINE
    );
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
    return (
      code === STAR ||
      code === PLUS ||
      code === DASH ||
      isAsciiDigit(code)
    );
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

/**
 * Install the guards on a Tokenizer class (normally marked's). Kept as an
 * explicit step so this module stays free of imports; the vendored bundle can
 * then reuse `needsEscape` without creating an import cycle.
 */
export function installGuards(Tokenizer) {
  const prototype = Tokenizer.prototype;
  for (const [name, canMatch] of Object.entries(guards)) {
    const original = prototype[name];
    prototype[name] = function guardedTokenizer(source) {
      if (!canMatch(source)) return undefined;
      return original.apply(this, arguments);
    };
  }
  return prototype;
}

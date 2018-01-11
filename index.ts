import {
  PlorthArray,
  PlorthObject,
  PlorthQuote,
  PlorthString,
  PlorthSymbol,
  PlorthWord,
  PlorthValue,
  PlorthValueType
} from "plorth-types";

const SYMBOL_PATTERN = /[^()[\]{}:;,\s]/;

export default function parse(source: string): PlorthValue[] {
  return new Parser(source).parseProgram();
}

export class SyntaxError extends Error {
  offset: number;

  constructor(offset: number, message: string) {
    super(message);
    this.offset = offset;
  }
}

export class Parser {
  source: string;
  offset: number;

  constructor(source: string) {
    this.source = source;
    this.offset = 0;
  }

  parseProgram(): PlorthValue[] {
    const values = [];

    while (this.offset < this.source.length) {
      if (!this.skipWhitespaceAndComments()) {
        values.push(this.parseValue());
      }
    }

    return values;
  }

  parseValue(): PlorthValue {
    this.skipWhitespaceAndComments();

    switch (this.peek()) {
      case ":":
        return this.parseWord();

      case "(":
        return this.parseQuote();

      case "[":
        return this.parseArray();

      case "{":
        return this.parseObject();

      case "\"":
      case "'":
        return this.parseString();

      default:
        return this.parseSymbol();
    }
  }

  parseSymbol(): PlorthSymbol {
    let start;
    let id;

    this.skipWhitespaceAndComments();
    start = this.offset;
    if (!this.read(SYMBOL_PATTERN)) {
      throw this.error("Symbol expected");
    }
    while (this.read(SYMBOL_PATTERN));
    id = this.source.substring(start, this.offset);

    return {
      type: PlorthValueType.SYMBOL,
      start,
      end: this.offset,
      id
    };
  }

  parseWord(): PlorthWord {
    let start;
    let symbol;
    const values = [];

    this.skipWhitespaceAndComments();
    start = this.offset;
    if (!this.read(":")) {
      throw this.error("Word expected");
    }
    symbol = this.parseSymbol();

    for (;;) {
      this.skipWhitespaceAndComments();
      if (this.read(";")) {
        break;
      }
      values.push(this.parseValue());
    }

    return {
      type: PlorthValueType.WORD,
      start,
      end: this.offset,
      symbol,
      quote: {
        type: PlorthValueType.QUOTE,
        start,
        end: this.offset,
        values
      }
    };
  }

  parseQuote(): PlorthQuote {
    let start;
    const values = [];

    this.skipWhitespaceAndComments();
    start = this.offset;
    if (!this.read("(")) {
      throw this.error("Quote value expected");
    }

    for (;;) {
      this.skipWhitespaceAndComments();
      if (this.read(")")) {
        break;
      }
      values.push(this.parseValue());
    }

    return {
      type: PlorthValueType.QUOTE,
      start,
      end: this.offset,
      values
    };
  }

  parseArray(): PlorthArray {
    let start;
    const elements = [];

    this.skipWhitespaceAndComments();
    start = this.offset;
    if (!this.read("[")) {
      throw this.error("Array value expected");
    }

    for (;;) {
      this.skipWhitespaceAndComments();
      if (this.read("]")) {
        break;
      }
      elements.push(this.parseValue());
      if (this.read(",")) {
        continue;
      } else if (this.read("]")) {
        break;
      } else {
        throw this.error("Unterminated array value");
      }
    }

    return {
      type: PlorthValueType.ARRAY,
      start,
      end: this.offset,
      elements
    };
  }

  parseObject(): PlorthObject {
    let start;
    const properties: { [key: string]: PlorthValue } = {};

    this.skipWhitespaceAndComments();
    start = this.offset;
    if (!this.read("{")) {
      throw this.error("Object value expected");
    }

    for (;;) {
      let key;
      let value;

      this.skipWhitespaceAndComments();
      if (this.read("}")) {
        break;
      }
      key = this.parseString();
      this.skipWhitespaceAndComments();
      if (!this.read(":")) {
        throw this.error("Missing `:' after property key");
      }
      value = this.parseValue();
      properties[key.value] = value;
      if (this.read(",")) {
        continue;
      } else if (this.read("}")) {
        break;
      } else {
        throw this.error("Unterminated object value");
      }
    }

    return {
      type: PlorthValueType.OBJECT,
      start,
      end: this.offset,
      properties
    };
  }

  parseString(): PlorthString {
    let separator;
    let start;
    let value = "";

    this.skipWhitespaceAndComments();
    start = this.offset;
    if ((separator = this.read()) !== "\"" && separator !== "'") {
      throw this.error("String value expected");
    }
    for (;;) {
      if (!this.peek()) {
        throw this.error("Unterminated string");
      } else if (this.read(separator)) {
        break;
      } else if (this.read("\\")) {
        value += this.parseEscapeSequence();
      } else {
        value += this.read();
      }
    }

    return {
      type: PlorthValueType.STRING,
      start,
      end: this.offset,
      value
    };
  }

  private parseEscapeSequence(): string {
    const c = this.read();

    if (!c) {
      throw this.error("Unterminated escape sequence");
    }

    switch (c) {
      case "b":
        return "\b";

      case "t":
        return "\t";

      case "n":
        return "\n";

      case "r":
        return "\r";

      case "\"":
      case "'":
      case "\\":
      case "/":
        return c;

      case "u":
        {
          let result = 0;

          for (let i = 0; i < 4; ++i) {
            let x;

            if (!(x = this.read(/[0-9a-fA-F]/))) {
              throw this.error("Missing hexadecimal escape sequence");
            }
            if (x >= "A" && x <= "F") {
              result = result * 16 + (x.charCodeAt(0) - 65 + 10);
            } else if (x >= "a" && x <= "f") {
              result = result * 16 + (x.charCodeAt(0) - 97 + 10);
            } else {
              result = result * 16 + (x.charCodeAt(0) - 48);
            }
          }

          return String.fromCharCode(result);
        }

      default:
        throw this.error("Unrecognized escape sequence");
    }
  }

  private skipWhitespaceAndComments(): boolean {
    const originalOffset = this.offset;

    while (this.offset < this.source.length) {
      if (this.read("#")) {
        while (this.offset < this.source.length && !this.read(/(\n|\r)/)) {
          ++this.offset;
        }
      } else if (!this.read(/\s/)) {
        break;
      }
    }

    return originalOffset !== this.offset;
  }

  private peek(expected?: string | RegExp): string | null {
    if (this.offset < this.source.length) {
      const c = this.source[this.offset];

      if (!expected) {
        return c;
      } else if (expected instanceof RegExp) {
        if (!expected.test(c)) {
          return null;
        }
      } else if (expected !== c) {
        return null;
      }

      return c;
    }

    return null;
  }

  private read(expected?: string | RegExp): string | null {
    const c = this.peek(expected);

    if (c) {
      ++this.offset;
    }

    return c;
  }

  error(message: string): SyntaxError {
    return new SyntaxError(this.offset, message);
  }
}

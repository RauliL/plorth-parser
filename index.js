const SYMBOL_PATTERN = /[^()[\]{}:;,\s]/;

module.exports = source => new Parser(source).parseProgram();

class Parser {
  constructor (source) {
    this.source = source;
    this.offset = 0;
  }

  parseProgram () {
    const values = [];

    while (this.offset < this.source.length) {
      if (!this.skipWhitespaceAndComments()) {
        values.push(this.parseValue());
      }
    }

    return values;
  }

  parseValue () {
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

  parseSymbol () {
    let node;

    this.skipWhitespaceAndComments();
    node = this.startNode("symbol", { id: null });
    if (!this.read(SYMBOL_PATTERN)) {
      throw this.error("Symbol expected");
    }
    while (this.read(SYMBOL_PATTERN));
    this.endNode(node);
    node.id = this.source.substring(node.start, node.end);

    return node;
  }

  parseWord () {
    let node;

    this.skipWhitespaceAndComments();
    node = this.startNode("word", { symbol: null, values: [] });
    if (!this.read(":")) {
      throw this.error("Word expected");
    }
    node.symbol = this.parseSymbol();

    for (;;) {
      this.skipWhitespaceAndComments();
      if (this.read(";")) {
        break;
      }
      node.values.push(this.parseValue());
    }

    return this.endNode(node);
  }

  parseQuote () {
    let node;

    this.skipWhitespaceAndComments();
    node = this.startNode("quote", { values: [] });
    if (!this.read("(")) {
      throw this.error("Quote value expected");
    }

    for (;;) {
      this.skipWhitespaceAndComments();
      if (this.read(")")) {
        break;
      }
      node.values.push(this.parseValue());
    }

    return this.endNode(node);
  }

  parseArray () {
    let node;

    this.skipWhitespaceAndComments();
    node = this.startNode("array", { elements: [] });
    if (!this.read("[")) {
      throw this.error("Array value expected");
    }

    for (;;) {
      this.skipWhitespaceAndComments();
      if (this.read("]")) {
        break;
      }
      node.elements.push(this.parseValue());
      if (this.read(",")) {
        continue;
      } else if (this.read("]")) {
        break;
      } else {
        throw this.error("Unterminated array value");
      }
    }

    return this.endNode(node);
  }

  parseObject () {
    let node;

    this.skipWhitespaceAndComments();
    node = this.startNode("object", { properties: {} });
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
      node.properties[key.value] = value;
      if (this.read(",")) {
        continue;
      } else if (this.read("}")) {
        break;
      } else {
        throw this.error("Unterminated object value");
      }
    }

    return this.endNode(node);
  }

  parseString () {
    let node;
    let separator;

    this.skipWhitespaceAndComments();
    node = this.startNode("string", { value: "" });
    if ((separator = this.read()) !== "\"" && separator !== "'") {
      throw this.error("String value expected");
    }
    for (;;) {
      if (!this.peek()) {
        throw this.error("Unterminated string");
      } else if (this.read(separator)) {
        break;
      } else if (this.read("\\")) {
        node.value += this.parseEscapeSequence();
      } else {
        node.value += this.read();
      }
    }

    return this.endNode(node);
  }

  parseEscapeSequence () {
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

  skipWhitespaceAndComments () {
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

  peek (expected = null) {
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

  read (expected = null) {
    if (this.offset < this.source.length) {
      const c = this.source[this.offset++];

      if (!expected) {
        return c;
      } else if (expected instanceof RegExp) {
        if (expected.test(c)) {
          return c;
        }
      } else if (expected === c) {
        return c;
      }
      --this.offset;
    }

    return null;
  }

  error (message) {
    const err = new Error(message);

    err.offset = this.offset;

    return err;
  }

  startNode (type, data = null) {
    const node = { type, start: this.offset };

    if (data) {
      Object.assign(node, data);
    }

    return node;
  }

  endNode (node) {
    node.end = this.offset;

    return node;
  }
}

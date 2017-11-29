/* eslint-env node, mocha */

const parse = require("./dist/index").default;
const should = require("should");

describe("Plorth parser", () => {
  it("should be able to parse symbols", () => {
    const result = parse("foo bar");

    should.strictEqual(result.length, 2);
    should.strictEqual(result[0].type, "symbol");
    should.strictEqual(result[1].type, "symbol");
    should.strictEqual(result[0].id, "foo");
    should.strictEqual(result[1].id, "bar");
  });

  it("should be able to parse quotes", () => {
    const result = parse("( foo bar )");

    should.strictEqual(result.length, 1);
    should.strictEqual(result[0].type, "quote");
    should.strictEqual(result[0].values.length, 2);
  });

  it("should be able to parse words", () => {
    const result = parse(": foo bar ;");

    should.strictEqual(result.length, 1);
    should.strictEqual(result[0].type, "word");
    should.strictEqual(result[0].values.length, 1);
    should.strictEqual(result[0].values[0].type, "symbol");
    should.strictEqual(result[0].values[0].id, "bar");
  });

  it("should be able to parse arrays", () => {
    const result = parse("[1, 2, 3]");

    should.strictEqual(result.length, 1);
    should.strictEqual(result[0].type, "array");
    should.exists(result[0].elements);
    should.strictEqual(result[0].elements.length, 3);
    should.strictEqual(result[0].elements[0].type, "symbol");
    should.strictEqual(result[0].elements[0].id, "1");
  });

  it("should be able to parse objects", () => {
    const result = parse("{\"foo\": \"bar\"}");

    should.strictEqual(result.length, 1);
    should.strictEqual(result[0].type, "object");
    should.exists(result[0].properties);
    should.exists(result[0].properties.foo);
    should.strictEqual(result[0].properties.foo.type, "string");
  });

  it("should be able to parse strings", () => {
    const result = parse("\"foo bar\"");

    should.strictEqual(result.length, 1);
    should.strictEqual(result[0].type, "string");
    should.strictEqual(typeof result[0].value, "string");
    should.strictEqual(result[0].value, "foo bar");
  });

  it("should be able to parse escape sequences", () => {
    should.strictEqual(parse("\"\\r\\n\"")[0].value, "\r\n");
    should.strictEqual(parse("\"\\u00f4\"")[0].value, "\u00f4");
  });

  it("should be able to handle dangling commas", () => {
    parse("{\"foo\": \"bar\",}");
    parse("[foo, bar,]");
  });

  it("should be able to skip comments", () => {
    should.strictEqual(parse("# foo").length, 0);
    should.strictEqual(parse("foo # bar").length, 1);
    should.strictEqual(parse("foo # bar\nbaz").length, 2);
  });

  it("should throw exception on syntax error", () => {
    should.throws(() => parse("\"foo"));
    should.throws(() => parse("[foo"));
    should.throws(() => parse("{foo"));
    should.throws(() => parse("{\"foo\""));
    should.throws(() => parse("{\"foo\"}"));
    should.throws(() => parse(": foo"));
  });
});

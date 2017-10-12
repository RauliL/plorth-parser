# Plorth parser [![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url]

[travis-image]: https://img.shields.io/travis/RauliL/plorth-parser-js/master.svg
[travis-url]: https://travis-ci.org/RauliL/plorth-parser-js
[npm-image]: https://img.shields.io/npm/v/plorth-parser.svg
[npm-url]: https://npmjs.org/package/plorth-parser

Parser for the [Plorth] programming language, written in TypeScript.

[Plorth]: https://github.com/RauliL/plorth

## Usage example

```TypeScript
import parse from "plorth-parser";

const program = parse("'Hello, World!' println");

console.log(program[0].type); // "string"
console.log(program[1].type); // "symbol"
console.log(program[1].id);   // "println"
```

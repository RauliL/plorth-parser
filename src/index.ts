import Parser from "./parser";

import { PlorthValue } from "./types";

export default function parse(source: string): PlorthValue[] {
  return new Parser(source).parseProgram();
}

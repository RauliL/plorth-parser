export enum PlorthValueType {
  Symbol = "symbol",
  Word = "word",
  Quote = "quote",
  Array = "array",
  Object = "object",
  String = "string"
}

export interface PlorthValue {
  type: PlorthValueType;
  start: number;
  end: number;
}

export interface PlorthSymbol extends PlorthValue {
  type: PlorthValueType.Symbol;
  id: string;
}

export interface PlorthWord extends PlorthValue {
  type: PlorthValueType.Word;
  symbol: PlorthSymbol;
  values: PlorthValue[];
}

export interface PlorthQuote extends PlorthValue {
  type: PlorthValueType.Quote;
  values: PlorthValue[];
}

export interface PlorthArray extends PlorthValue {
  type: PlorthValueType.Array;
  elements: PlorthValue[];
}

export interface PlorthObject extends PlorthValue {
  type: PlorthValueType.Object;
  properties: { [key: string]: PlorthValue };
}

export interface PlorthString extends PlorthValue {
  type: PlorthValueType.String;
  value: string;
}

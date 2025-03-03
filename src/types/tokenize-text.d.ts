declare module 'tokenize-text' {
  interface TokenizerOptions {
    pattern?: RegExp;
    match?: RegExp;
    toLowercase?: boolean;
    filter?: (token: string) => boolean;
  }

  interface Token {
    value: string;
    index: number;
    match?: RegExpMatchArray;
  }

  interface Tokenizer {
    (text: string): Token[];
    pattern: RegExp;
    match: RegExp;
    toLowercase: boolean;
    filter: (token: string) => boolean;
  }

  export default function createTokenizer(options?: TokenizerOptions): Tokenizer;
}

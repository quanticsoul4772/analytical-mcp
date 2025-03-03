declare module 'pos' {
  export class Lexer {
    lex(text: string): string[];
  }

  export class Tagger {
    tag(words: string[]): Array<[string, string]>;
  }
}

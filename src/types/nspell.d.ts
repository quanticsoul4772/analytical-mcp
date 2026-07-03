declare module 'nspell' {
  interface NSpell {
    correct(word: string): boolean;
    suggest(word: string): string[];
    add(word: string): NSpell;
    remove(word: string): NSpell;
  }
  function nspell(aff: Buffer | string, dic?: Buffer | string): NSpell;
  export default nspell;
}

declare module 'wink-pos-tagger' {
  interface POSTag {
    word: string;
    tag: string;
    lemma?: string;
    normal?: string;
  }

  interface Tagger {
    tag(tokens: string[]): POSTag[];
    tagSentence(sentence: string): POSTag[];
  }

  export default function createTagger(): Tagger;
}

declare module 'spellchecker' {
  export function isMisspelled(word: string): boolean;
  export function getCorrectionsForMisspelling(word: string): string[];
  export function checkSpelling(text: string): Array<{ start: number, end: number }>;
  export function add(word: string): void;
  export function remove(word: string): void;
}

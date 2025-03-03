const fs = require('fs');
const path = require('path');

// Function to copy a file with .fixed.ts extension to the original file
function copyFixedFile(filePath) {
  const fixedFilePath = filePath.replace('.ts', '.fixed.ts');
  if (fs.existsSync(fixedFilePath)) {
    fs.copyFileSync(fixedFilePath, filePath);
    console.log(`Copied ${fixedFilePath} to ${filePath}`);
  } else {
    console.log(`Fixed file ${fixedFilePath} does not exist`);
  }
}

// Update the files
const filesToUpdate = [
  'src/utils/coreference_resolver.ts',
  'src/utils/rate_limit_manager.ts',
  'src/utils/relationship_extractor.ts'
];

filesToUpdate.forEach(file => {
  copyFixedFile(file);
});

// Create type declaration files if they don't exist
const typeDeclarations = [
  { path: 'src/types/pos.d.ts', content: `declare module 'pos' {
  export class Lexer {
    lex(text: string): string[];
  }

  export class Tagger {
    tag(words: string[]): Array<[string, string]>;
  }
}` },
  { path: 'src/types/wink-lemmatizer.d.ts', content: `declare module 'wink-lemmatizer' {
  export function noun(word: string): string;
  export function verb(word: string): string;
  export function adjective(word: string): string;
}` },
  { path: 'src/types/wink-pos-tagger.d.ts', content: `declare module 'wink-pos-tagger' {
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
}` },
  { path: 'src/types/spellchecker.d.ts', content: `declare module 'spellchecker' {
  export function isMisspelled(word: string): boolean;
  export function getCorrectionsForMisspelling(word: string): string[];
  export function checkSpelling(text: string): Array<{ start: number, end: number }>;
  export function add(word: string): void;
  export function remove(word: string): void;
}` },
  { path: 'src/types/tokenize-text.d.ts', content: `declare module 'tokenize-text' {
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
}` }
];

typeDeclarations.forEach(declaration => {
  if (!fs.existsSync(declaration.path)) {
    fs.mkdirSync(path.dirname(declaration.path), { recursive: true });
    fs.writeFileSync(declaration.path, declaration.content);
    console.log(`Created type declaration file: ${declaration.path}`);
  } else {
    console.log(`Type declaration file already exists: ${declaration.path}`);
  }
});

console.log('Update completed successfully!');

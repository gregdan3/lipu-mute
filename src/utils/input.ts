import { PHRASE_RE, PHRASE_DELIMS_RE } from "@utils/constants";

export type Separator = "+" | "-" | null;
export type Length = 1 | 2 | 3 | 4 | 5 | 6;

// searchable words/phrases after split by separator and stripped of whitespace
export interface Phrase {
  raw: string; // the user's given input for the phrase
  repr: string; // the way we will print the input on the legend

  term: string; // a single word or phrase, no separators or annotations
  length: Length; // how many words are in the phrase
  minSentLen: Length; // specified by user or overridden
  separator: Separator; // how the current phrase connects to the previous phrase
}

// searches after split by , and stripped of whitespace
export interface Query {
  raw: string; // unaltered user input, per-phrase
  repr: string; // to be printed later
  phrases: Phrase[];
  // error: string[];
}

export interface QueryError {
  query: Query;
  error: string;
}

export interface ProcessedQueries {
  queries: Query[];
  errors: QueryError[];
}

function queryRepr(phrases: Phrase[]): string {
  return phrases
    .map((phrase) => {
      if (phrase.separator) {
        return phrase.separator + " " + phrase.repr;
      }
      return phrase.repr;
    })
    .join(" ");
}

function countWords(phrase: string): number {
  // NOTE: this would fail to count UCSUR, but it is only used after split
  return phrase.split(/\s+/).length;
}

function cleanInput(input: string): string {
  input = input.toLowerCase();
  input = input.replace(/(.)\1+/g, "$1");
  // NOTE: UCSUR text is not replaced because I don't provide the unicode flag
  input = input.trim();
  return input;
}

function splitOnDelim(input: string, delimiter: string): string[] {
  return input
    .split(delimiter)
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

function toQueryTokens(query: string): string[] {
  const result = query.trim().split(PHRASE_DELIMS_RE);
  return result.filter((token) => token.length > 0);
}

function toPhrases(query: string, givenMinSentLen: Length): Phrase[] {
  const phrases: Phrase[] = [];
  let separator: Separator = null;
  let currentPhrase: string[] = [];

  const tokens = toQueryTokens(query);

  tokens.forEach((token) => {
    if (token === "+" || token === "-") {
      if (currentPhrase.length > 0) {
        // throws out trailing operators
        phrases.push(
          createPhrase(currentPhrase.join(" "), separator, givenMinSentLen),
        );
        currentPhrase = [];
      }
      separator = token as Separator;
    } else if (PHRASE_RE.test(token)) {
      currentPhrase.push(token);
    }
  });

  if (currentPhrase.length > 0) {
    phrases.push(
      createPhrase(currentPhrase.join(" "), separator, givenMinSentLen),
    );
  }

  return phrases;
}

function createPhrase(
  combinedPhrase: string,
  separator: Separator,
  givenMinSentLen: Length,
): Phrase {
  const [termWithMin, minLen] = combinedPhrase.split("_");
  const term = termWithMin.trim();
  const length = countWords(term) as Length;
  const parsedMinLen = minLen ? (parseInt(minLen, 10) as Length) : length;
  let repr = combinedPhrase;
  let minSentLen = Math.max(length, givenMinSentLen) as Length;

  if (minLen && parsedMinLen != minSentLen) {
    minSentLen = parsedMinLen;
  } else {
    repr = term;
  }

  return {
    raw: combinedPhrase,
    repr,
    term,
    length,
    minSentLen,
    separator,
  };
}

function toQueries(input: string, givenMinSentLen: Length): ProcessedQueries {
  const rawPhrases = splitOnDelim(input, ",");
  const queries = rawPhrases.map((query: string): Query => {
    const phrases = toPhrases(query, givenMinSentLen);
    return { raw: query, repr: queryRepr(phrases), phrases: phrases };
  });
  return { queries, errors: [] };
}

function dedupeQueries(queries: Query[]): ProcessedQueries {
  const seen = new Set<string>();
  const errors: QueryError[] = [];
  queries = queries.filter((query) => {
    if (seen.has(query.repr)) {
      errors.push({ query: query, error: "Duplicate query" });
      return false;
    } else {
      seen.add(query.repr);
      return true;
    }
  });

  return { queries, errors };
}

export function inputToQueries(
  input: string,
  givenMinSentLen: Length,
): ProcessedQueries {
  input = cleanInput(input);

  const { queries, errors: initErrors } = toQueries(input, givenMinSentLen);

  const { queries: dedupedQueries, errors: dupeErrors } =
    dedupeQueries(queries);

  return {
    queries: dedupedQueries,
    errors: initErrors.concat(dupeErrors),
  };
}

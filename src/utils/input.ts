type Separator = "+" | "-" | null;
type Length = 1 | 2 | 3 | 4 | 5 | 6;

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
  return phrase.split(" ").length;
  // TODO: allow UCSUR to be entered without spaces
}

function cleanInput(input: string): string {
  input = input.toLowerCase();
  input = input.replace(/(.)\1+/g, "$1");
  input = input.trim();
  return input;
}

function splitOnDelim(input: string, delimiter: string): string[] {
  return input
    .split(delimiter)
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

function toPhrases(query: string, givenMinSentLen: Length): Phrase[] {
  const phraseRegex = /^[a-zA-Z*\s]+(?:_\d)?$/; // star is for future wildcard
  const phrases: Phrase[] = [];
  let separator: Separator = null;
  let currentPhrase: string[] = [];

  const tokens = query.trim().split(/\s+/);

  tokens.forEach((token) => {
    if (token === "+" || token === "-") {
      if (currentPhrase.length > 0) {
        phrases.push(createPhrase(currentPhrase.join(" "), separator));
        currentPhrase = [];
      }
      separator = token as Separator;
    } else if (phraseRegex.test(token)) {
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
  if (parsedMinLen !== minSentLen && 1 <= parsedMinLen && parsedMinLen <= 6) {
    minSentLen = parsedMinLen;
  } else {
    repr = term;
  }

  // parsed overrides given unless <= length or > 6
  // given overrides length unless <= length or > 6
  // repr includes minLen only if parsed is used

  return {
    raw: combinedPhrase,
    repr,
    term,
    length,
    minSentLen: parsedMinLen,
    separator,
  };
}

function toQueries(input: string, givenMinSentLen: Length): Query[] {
  const rawPhrases = splitOnDelim(input, ",");
  const queries = rawPhrases.map((query: string): Query => {
    const phrases = toPhrases(query, givenMinSentLen);
    return { raw: query, repr: queryRepr(phrases), phrases: phrases };
  });
  return queries;
}

export function inputToQueries(
  input: string,
  givenMinSentLen: Length,
): Query[] {
  input = cleanInput(input);
  const queries = toQueries(input, givenMinSentLen);
  console.log(queries);
  return queries;
}

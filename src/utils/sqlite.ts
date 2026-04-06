import { createDbWorker } from "sql.js-httpvfs";
import type { WorkerHttpvfs } from "sql.js-httpvfs";
import {
  BASE_URL,
  DB_URL_PREFIX,
  LATEST_TIMESTAMP,
  EARLIEST_TIMESTAMP,
  UNIT_TIMES,
} from "@utils/constants";
import type {
  Length,
  Term,
  Query,
  Row,
  Params,
  AttributeId,
  Stringable,
} from "@utils/types";
import { SCALES } from "@utils/constants";
import { hasError } from "@utils/input";
import { scaleFunctions } from "@utils/post_processing/scaling";
import { smootherFunctions } from "@utils/post_processing/smoothing";
import { consoleLogAsync } from "@utils/debug";
import { makeError } from "@utils/errors";
import { WILDCARD_QUERY } from "@utils/queries";

let workerPromise: Promise<WorkerHttpvfs> | null = null;

export async function initDB(dbUrlPrefix: string): Promise<WorkerHttpvfs> {
  const worker = await createDbWorker(
    [
      {
        from: "inline",
        config: {
          // serverMode: "full",
          // requestChunkSize: 1024,
          // url: "/db/2025-10-20-trimmed.sqlite",

          serverMode: "chunked",
          requestChunkSize: 1024,
          databaseLengthBytes: 851628032,
          serverChunkSize: 26214400,
          urlPrefix: dbUrlPrefix,
          suffixLength: 3,
        },
      },
    ],
    `${BASE_URL}/ext/sqlite.worker.js`,
    `${BASE_URL}/ext/sql-wasm.wasm`,
  );
  return worker;
}

export async function queryDb(
  query: string,
  params: Stringable[],
): Promise<any[]> {
  if (!workerPromise) {
    workerPromise = initDB(DB_URL_PREFIX);
  }
  const worker = await workerPromise;
  await consoleLogAsync(query, params);
  const result = await worker.db.query(query, params);
  return result;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000; // stupidest hack of all time
const timezoneOffset = new Date().getTimezoneOffset() * 60 * 1000; // Offset in milliseconds

function localizeTimestamp(timestamp: number): number {
  return timestamp * 1000 + DAY_IN_MS;
}

function sumTerms(query: Query, params: Params) {
  const terms = query.terms;
  const nonEmpty = terms.filter((t) => t.data.length > 0);
  if (nonEmpty.length === 0) {
    query.data = [];
    // query.errors.push(makeError("NoResultsQuery", {}));
    // each term will report it is empty anyway
    return;
  }

  const expectedLen = nonEmpty[0].data.length;
  const validTerms = nonEmpty.filter(
    (t) => t.data!.length === expectedLen && !hasError(t),
  );

  if (validTerms.length === 0) {
    query.data = [];
    return;
  }

  if (validTerms.length === 1) {
    query.data = validTerms[0].data;
    return;
  }

  const result: Row[] = [];

  for (let i = 0; i < expectedLen; i++) {
    const day = validTerms[0].data[i].day;
    let totalHits = 0;

    for (const term of validTerms) {
      const op = term.operator ?? "+";
      const row = term.data[i];

      if (!row) continue;

      if (op === "-") {
        totalHits -= row.hits;
      } else if (op === "+") {
        totalHits += row.hits;
      }
    }

    result.push({ day, hits: totalHits, authors: NaN, hpa: NaN });
  }

  if (!SCALES[params.scale].sums && params.field !== "hits") {
    query.errors.push(makeError("NoSetMath", {}));
  }

  query.data = result;
}

async function resolveTerm(term: Term, params: Params) {
  let resp = await queryDb(UNIT_TIMES[params.unit].dataQuery, [
    term.text,
    term.attrId,
    params.start,
    params.end,
  ]);
  if (resp.length === 0) {
    const error = makeError("NoResultsTerm", { term: term.repr });
    term.errors.push(error);
    term.data = [];
    return;
  }

  resp = resp.map(
    (row: Row): Row => ({
      day: localizeTimestamp(row.day),
      hits: row.hits,
      authors: row.authors,
      hpa: row.authors ? row.hits / row.authors : 0,
    }),
  );

  const result: Row[] = [];
  let iResult = 0;
  let iCompare = 0;

  const totals = await fetchTotals(1, 0, params);

  // may be missing some periods - insert them
  while (iCompare < totals.length) {
    const comparisonDay = totals[iCompare].day;

    if (iResult < resp.length) {
      const resultDay = resp[iResult].day;

      // you can't directly compare dates...
      if (resultDay < comparisonDay) {
        iResult++;
      } else if (resultDay > comparisonDay) {
        result.push({ day: comparisonDay, hits: 0, authors: 0, hpa: 0 });
        iCompare++;
      } else {
        result.push(resp[iResult]);
        iResult++;
        iCompare++;
      }
    } else {
      result.push({ day: comparisonDay, hits: 0, authors: 0, hpa: 0 });
      iCompare++;
    }
  }

  term.data = result;
}

export async function resolveQuery(query: Query, params: Params) {
  if (params.start < EARLIEST_TIMESTAMP) {
    params.start = EARLIEST_TIMESTAMP;
  }
  if (params.end > LATEST_TIMESTAMP) {
    params.end = LATEST_TIMESTAMP;
  }

  if (hasError(query)) {
    // query.data = []; // TODO: is this a good idea?
    // query.errors.push(makeError("NoResultsQuery", {}));
    return;
  }

  const termDataPromises = query.terms.map(async (term: Term) => {
    await resolveTerm(term, params);
  });
  await Promise.all(termDataPromises);

  sumTerms(query, params);

  // TODO: pass a term's length or attr into this? which?
  const totals = await fetchTotals(1, 0, params);

  query.data = scaleFunctions[params.scale](query.data, totals, params.field);
  if (
    params.smoothing > 0 &&
    SCALES[params.scale].smoothable &&
    UNIT_TIMES[params.unit].smoothable
  ) {
    const smootherFunction = smootherFunctions[params.smoother];
    query.data = smootherFunction(query.data, params.smoothing, params.field);
  }
}

async function fetchTotals(
  termLen: Length,
  attrId: AttributeId,
  params: Params,
): Promise<Row[]> {
  let result = await queryDb(UNIT_TIMES[params.unit].totalQuery, [
    termLen,
    attrId,
    params.start,
    params.end,
  ]);
  result = result.map(
    (row: Row): Row => ({
      day: localizeTimestamp(row.day),
      hits: row.hits,
      authors: row.authors,
      hpa: row.hits,
      // WARNING:
      // Technically, this should be (h/a) / (H/A) according to how the field is
      // defined. Here, I assign hpa to hits directly, because what I actually
      // want to display is "The hits/author of this word is what percent of the
      // entire language?" Which is (h/a) / (H).
      // The original function would yield "This word's hits/author is what percent of
      // the average hits per author?"
      // Total data is never directly visible to the user, so this *works*.
    }),
  );
  return result as Row[];
}

export async function fetchTopTerms(term: Term): Promise<string[]> {
  // term which has an attached wildcard
  const result = await queryDb(WILDCARD_QUERY, [
    term.len,
    term.attrId,
    term.text,
  ]);
  return result.map((term: { term: string }) => term.term);
}

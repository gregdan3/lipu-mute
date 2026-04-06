import {
  SCALES,
  SMOOTHERS,
  LENGTHS,
  SMOOTHINGS,
  SAMPLE_SEARCHES,
  FIELDS,
  UNIT_TIMES,
} from "@utils/constants";
import type { Params, SearchURLParams, RanksURLParams } from "@utils/types";

import { randomElem, isValidTimestamp } from "@utils/other";

function coalesceTimestamp(maybeTimestamp: string | null): string | null {
  let timestamp = null;
  if (isValidTimestamp(maybeTimestamp)) {
    timestamp = maybeTimestamp as string;
  }
  return timestamp;
}

function coalesceRandomly(
  maybeParam: string | null,
  // TODO: callable validation function for maybeParam
  defaultParams: string[],
): string {
  let param = randomElem(defaultParams);
  if (maybeParam) {
    param = maybeParam;
  }
  return param;
}

function coalesceParam<T extends string>(
  maybeValue: string | null,
  options: readonly T[] | Record<T, unknown>,
): T | null {
  if (!maybeValue) return null;
  if (Array.isArray(options)) {
    return options.includes(maybeValue as T) ? (maybeValue as T) : null;
  }
  if (maybeValue in options) {
    return maybeValue as T;
  }
  return null;
}

export function getSearchParams(): SearchURLParams {
  const urlParams = new URLSearchParams(window.location.search);

  const query = coalesceRandomly(urlParams.get("query"), SAMPLE_SEARCHES);

  const scale = coalesceParam(urlParams.get("scale"), SCALES);
  const field = coalesceParam(urlParams.get("field"), FIELDS);
  const unit = coalesceParam(urlParams.get("unit"), UNIT_TIMES);
  const smoothing = coalesceParam(urlParams.get("smoothing"), SMOOTHINGS);
  const smoother = coalesceParam(urlParams.get("smoother"), SMOOTHERS);

  const start = coalesceTimestamp(urlParams.get("start"));
  const end = coalesceTimestamp(urlParams.get("end"));

  return { query, scale, field, unit, smoothing, smoother, start, end };
}

export function getRanksParams(): RanksURLParams {
  const urlParams = new URLSearchParams(window.location.search);

  const termLen = coalesceParam(urlParams.get("termLen"), LENGTHS);

  const yearParam = urlParams.get("year") || "";
  const year = coalesceTimestamp(yearParam);

  return { termLen, year };
}

export function toURLParams(params: Params) {
  const urlParams = new URLSearchParams();
  for (const key in params) {
    if (params[key]) {
      urlParams.append(key, params[key]);
    }
  }

  const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

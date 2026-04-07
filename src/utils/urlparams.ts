import {
  SCALES,
  SMOOTHERS,
  LENGTHS,
  SMOOTHINGS,
  SAMPLE_SEARCHES,
  FIELDS,
  UNIT_TIMES,
  defaultStart,
  defaultEnd,
  defaultScale,
  defaultField,
  defaultSmoother,
  defaultSmoothing,
  defaultUnit,
} from "@utils/constants";
import type {
  Scale,
  Field,
  Params,
  RanksURLParams,
  UnitTime,
} from "@utils/types";

import { randomElem, isValidTimestamp } from "@utils/other";

function coalesceTimestamp(
  maybeTimestamp: string | null,
  fallback: string | null = null,
): string | null {
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
  fallback: T | null = null,
): T | null {
  if (!maybeValue) return fallback;
  if (Array.isArray(options)) {
    return options.includes(maybeValue as T) ? (maybeValue as T) : fallback;
  }
  if (maybeValue in options) {
    return maybeValue as T;
  }
  return fallback;
}

export function getSearchParams(): Params {
  const urlParams = new URLSearchParams(window.location.search);

  const query = coalesceRandomly(urlParams.get("query"), SAMPLE_SEARCHES);

  const scale = coalesceParam(
    urlParams.get("scale"),
    SCALES,
    defaultScale,
  ) as Scale;
  const field = coalesceParam(
    urlParams.get("field"),
    FIELDS,
    defaultField,
  ) as Field;
  const unit = coalesceParam(
    urlParams.get("unit"),
    UNIT_TIMES,
    defaultUnit,
  ) as UnitTime;
  const smoothing = coalesceParam(
    urlParams.get("smoothing"),
    SMOOTHINGS,
    defaultSmoothing,
  ) as Number;
  const smoother = coalesceParam(
    urlParams.get("smoother"),
    SMOOTHERS,
    defaultSmoother,
  ) as Smoother;

  const start = coalesceTimestamp(
    urlParams.get("start"),
    defaultStart,
  ) as Number;
  const end = coalesceTimestamp(urlParams.get("end"), defaultEnd) as Number;

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

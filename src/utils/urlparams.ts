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
  Smoother,
  Smoothing,
} from "@utils/types";
import { createEnumValidator } from "@utils/types";

import { randomElem, isValidTimestamp } from "@utils/other";

const validateScale = createEnumValidator(Object.keys(SCALES));
const validateField = createEnumValidator(Object.keys(FIELDS));
const validateUnit = createEnumValidator(Object.keys(UNIT_TIMES));
const validateSmoother = createEnumValidator(Object.keys(SMOOTHERS));
const validateSmoothing = createEnumValidator(
  SMOOTHINGS.map((n) => n.toString()),
);

function coalesceTimestamp(
  maybeTimestamp: string | null,
  fallback: string | null = null,
): string | null {
  if (!maybeTimestamp || !isValidTimestamp(maybeTimestamp)) {
    return fallback;
  }
  return maybeTimestamp;
}

function getParam<T>(
  value: string | null,
  parse: (v: string | null) => T | null,
  fallback: T,
): T {
  const parsed = parse(value);
  return parsed ?? fallback;
}

function parseTimestamp(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

export function getSearchParams(): Params {
  const url = new URLSearchParams(window.location.search);

  const query = url.get("query") ?? randomElem(SAMPLE_SEARCHES);
  const scale = getParam(
    url.get("scale"),
    validateScale,
    defaultScale,
  ) as Scale;
  const field = getParam(
    url.get("field"),
    validateField,
    defaultField,
  ) as Field;
  const unit = getParam(url.get("unit"), validateUnit, defaultUnit) as UnitTime;
  const smoother = getParam(
    url.get("smoother"),
    validateSmoother,
    defaultSmoother,
  ) as Smoother;
  const smoothing = Number(
    getParam(
      url.get("smoothing"),
      validateSmoothing,
      defaultSmoothing.toString(),
    ),
  );
  const start = parseTimestamp(url.get("start"), defaultStart) as number;
  const end = parseTimestamp(url.get("end"), defaultEnd) as number;

  return {
    query,
    scale,
    field,
    unit,
    smoothing,
    smoother,
    start,
    end,
  };
}

export function toURLParams(params: Params) {
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    urlParams.set(key, String(value));
  }

  const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

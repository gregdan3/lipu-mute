import type { Scale, UnitTime } from "@utils/types";
import { SAMPLE_SEARCHES, SCALES, UNIT_TIMES } from "@utils/constants";
import { randomElem } from "@utils/other";

export function shouldDisableScale(scale: Scale | undefined) {
  return scale && SCALES[scale] && SCALES[scale].sums;
}
export function shouldDisableSmoothing(
  scale: Scale | undefined,
  unit: UnitTime | undefined,
) {
  return scale && SCALES[scale].smoothable && UNIT_TIMES[unit].smoothable;
}

export async function copyUrlToClipboard() {
  const url = window.location.href;

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(url);
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = url;
    textArea.style.position = "absolute";
    textArea.style.left = "-9999px";
    document.body.prepend(textArea);

    try {
      textArea.select();
      document.execCommand("copy");
    } catch (error) {
      console.error(error);
    } finally {
      textArea.remove();
    }
  }
}

export function fetchElems<T extends Record<string, readonly [string, any]>>(
  defs: T,
) {
  const out = {} as {
    [K in keyof T]: InstanceType<T[K][1]>;
  };

  for (const key in defs) {
    const [id, Type] = defs[key];
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element #${id}`);
    out[key] = el as InstanceType<typeof Type>;
  }

  return out;
}

export function formatInteger(n: number): string {
  const suffixes = ["", "K", "M", "B", "T"];
  const tier = (Math.log10(Math.abs(n)) / 3) | 0;

  if (tier <= 0) return n.toString();

  const suffix = suffixes[tier];
  const scale = Math.pow(10, tier * 3);
  const scaled = n / scale;

  return scaled.toFixed(1).replace(/\.0$/, "") + suffix;
}

export function formatRaw(n: number, sigDigits: number = 5): string {
  if (n >= 1 || n === 0 || n <= -1) {
    return n.toString();
  }
  return n.toFixed(sigDigits);
}

export function formatPercentage(n: number, sigDigits: number = 2): string {
  if (n === 0) return "0%";

  n *= 100;

  const absValue = Math.abs(n);
  const magnitude = Math.floor(Math.log10(absValue));
  const scale = Math.pow(10, magnitude - sigDigits + 1);

  const rounded = Math.round(n / scale) * scale;

  const formatted = rounded.toPrecision(sigDigits);

  return parseFloat(formatted).toString() + "%";
}

export const FORMATTERS = {
  raw: (n: number) => formatRaw(n, 2),
  longRaw: (n: number) => formatRaw(n, 5),
  percent: (n: number) => formatPercentage(n, 2),
  longPercent: (n: number) => formatPercentage(n, 5),
  int: formatInteger,
} as const;

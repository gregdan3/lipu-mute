// @ts-expect-error: no types for -more module
import domtoimage from "dom-to-image-more";
import type { Scale, UnitTime } from "@utils/types";
import { SCALES, UNIT_TIMES } from "@utils/constants";

export function shouldDisableScale(scale: Scale | undefined) {
  return scale && SCALES[scale] && SCALES[scale].sums;
}
export function shouldDisableSmoothing(
  scale: Scale | undefined,
  unit: UnitTime | undefined,
) {
  return (
    !!scale && !!unit && SCALES[scale].smoothable && UNIT_TIMES[unit].smoothable
  );
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

async function padBlob(
  blob: Blob,
  padding: number,
  bgColor: string,
): Promise<Blob> {
  const img = new Image();
  const url = URL.createObjectURL(blob);

  img.src = url;

  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
  });

  URL.revokeObjectURL(url);

  const canvas = document.createElement("canvas");

  const width = img.width + padding * 2;
  const height = img.height + padding * 2;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  ctx.drawImage(img, padding, padding);

  const newBlob: Blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b as Blob), "image/png");
  });

  return newBlob;
}

async function makeGraphImage(bgcolor: string = "#f2f2f2") {
  const main = document.querySelector("main");
  if (!main) return;
  const blob = await domtoimage.toBlob(main, { bgcolor });
  if (!blob) return;

  const padded = await padBlob(blob, 20, bgcolor);

  return padded;
}

export async function downloadGraphImage() {
  const blob = await makeGraphImage();
  if (!blob) return;
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `ilo-muni-${new Date().toISOString()}.png`;
  document.body.appendChild(a);

  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyGraphImage() {
  const blob = await makeGraphImage();
  if (!blob) return;
  const item = new ClipboardItem({ "image/png": blob });
  await navigator.clipboard.write([item]);
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

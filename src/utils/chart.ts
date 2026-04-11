import { htmlLegendPlugin, crossHairPlugin } from "@utils/plugins";
import { FORMATTERS } from "@utils/ui.ts";
import { FIELDS, SCALES } from "@utils/constants.ts";
import { truncateLabel } from "@utils/other.ts";
import { parseInput, hasError } from "@utils/input";
import { resolveQuery } from "@utils/sqlite";
import type { FormatterFn, Field, Row, Query, Params } from "@utils/types";
import type { Tick } from "chart.js";
import type { ChartTypeRegistry, TooltipItem } from "chart.js/auto";
import Chart from "chart.js/auto";
import "chartjs-adapter-date-fns";
import { defaults } from "@utils/constants";

function makeParams(params: Partial<Params>): Params {
  const merged = { ...defaults, ...params };
  if (merged.query === undefined) {
    throw new Error("makeParams: query is required");
  }
  // @ts-expect-error: c'mon dude
  return merged;
}

export class UsageChart {
  private chart: Chart<keyof ChartTypeRegistry, Row[], unknown> | null = null;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  // it's caller's responsibility to ensure that Params is coherent
  async update(pParams: Partial<Params>): Promise<Query[]> {
    const params = makeParams(pParams);

    const queries = await parseInput(params.query!);
    await Promise.all(queries.map((query) => resolveQuery(query, params)));

    const graphable = queries.filter((q) => !hasError(q));
    // don't update the page if there are no graphable queries
    if (graphable.length === 0) {
      return queries;
    }

    let epsilon = 0;
    if (SCALES[params.scale!].axis === "logarithmic") {
      epsilon = adjustZeroLogScale(graphable, params.field!);
    }

    const datasets = await this.buildData(graphable);
    const options = await this.buildConfig(params, epsilon);

    if (!this.chart) {
      this.chart = new Chart(this.canvas, {
        type: "line",
        data: { datasets },
        // @ts-expect-error: what does it even want
        options,
        plugins: [htmlLegendPlugin, crossHairPlugin],
      });
      return queries;
    }

    this.chart.data.datasets = datasets;
    // @ts-expect-error: what does it even want
    this.chart.options = options;
    this.chart.update();

    return queries;
  }

  async buildData(queries: Query[]) {
    return queries.map((q) => ({
      label: q.repr,
      data: q.data,
    }));
  }

  async buildConfig(params: Params, epsilon: number) {
    const scale = SCALES[params.scale];
    const field = params.field;
    const useHtmlLegend = !!document.getElementById("usageLegend");

    const config = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      line: {
        datasets: { normalized: true },
      },
      scales: {
        x: {
          type: "time",
          axis: "x",
          time: {
            unit: "month",
            round: "month",
            tooltipFormat: "MMM yyyy",
          },
          grid: {
            drawOnChartArea: true,
            color: "#EAEAEA",
            tickColor: "#9e9e9e",
            lineWidth: 2,
          },
          ticks: {
            major: { enabled: true },
            padding: 1,
            callback: function (
              value: string | number,
              index: number,
              ticks: Tick[],
            ) {
              const tick = ticks[index];
              const date = new Date(tick.value);

              // const last = ticks.length - 1;
              // if (index == 0 || index == last) {
              //   return `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;
              // }

              // null ticks aren't drawn at all; empty string draws a tick and grid line
              return tick.major ? date.getFullYear() : null; // : date.toLocaleString("default", { month: "short" });
            },
          },
          border: {
            width: 2,
            color: "#9e9e9e",
          },
          // beforeFit: function (axis) {
          //   // @ts-expect-error
          //   let lbs: string[] = axis.chart.config.data.labels!;
          //   let len = lbs.length - 1;
          //   axis.ticks.push({ value: len, label: lbs[len] });
          // },
        },
        y: {
          type: scale.axis,
          axis: "y",
          suggestedMin: 0,
          grid: {
            color: "#EAEAEA",
            lineWidth: 2,
            tickColor: "#9e9e9e",
            tickLength: 6,
          },
          border: {
            display: false,
          },
          ticks: {
            callback: FORMATTERS[scale.axisNums],
          },
        },
      },
      elements: {
        point: { radius: 1, hoverRadius: 5 },
        line: { tension: 0.4 },
      },
      parsing: {
        xAxisKey: "day",
        yAxisKey: field,
      },
      hover: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
      plugins: {
        legend: {
          display: !useHtmlLegend,
        },
        htmlLegend: {
          containerID: "usageLegend",
        },
        tooltip: {
          mode: "nearest",
          axis: "x",
          intersect: false,
          position: "cursor",
          animation: false,
          yAlign: "center",
          itemSort: function (
            a: TooltipItem<keyof ChartTypeRegistry>,
            b: TooltipItem<keyof ChartTypeRegistry>,
          ): number {
            // @ts-expect-error: why let me reference the config then
            const key = a.chart.config._config!.options.parsing.yAxisKey;

            // @ts-expect-error: it doesn't know about `raw`
            return b.raw[key] - a.raw[key];
            // TODO: order by shown field
          },
          callbacks: {
            label: (ctx: TooltipItem<keyof ChartTypeRegistry>) =>
              formatLabel(ctx, FORMATTERS[scale.tooltipNums], epsilon),
          },
        },
      },
    };
    return config;
  }
}

function adjustZeroLogScale(queries: Query[], field: Field) {
  const allWholeNumbers = queries.every((q) =>
    q.data.every((d) => Number.isInteger(d[field])),
  );

  const allStrictlyPos = queries
    .flatMap((q) => q.data.map((d) => d[field]))
    .filter((v) => v > 0);

  let epsilon: number;
  if (allWholeNumbers) {
    epsilon = 1;
  } else if (allStrictlyPos.length > 0) {
    epsilon = Math.min(...allStrictlyPos) * 0.5;
  } else {
    epsilon = 1e-9;
  }

  // push all queries' data up by epsilon
  for (const query of queries) {
    query.data = query.data.map((d) => ({
      ...d,
      [field]: d[field] + epsilon,
    }));
  }
  return epsilon;
}

function formatLabel(
  ctx: TooltipItem<keyof ChartTypeRegistry>,
  format: FormatterFn,
  epsilon: number,
): string {
  // @ts-expect-error: why let me reference the config then
  const key: Field = ctx.chart.config._config!.options.parsing.yAxisKey;
  const field: string = FIELDS[key]["label"].toLowerCase();
  // @ts-expect-error: it doesn't know about `raw`
  const formattedData = format(ctx.raw[key] - epsilon);
  const truncLabel = truncateLabel(ctx.dataset.label!);
  const label = `${truncLabel}: ${formattedData} ${field}`;
  return label;
}

export class UsageChartElem extends HTMLElement {
  chart: UsageChart | null = null;

  async connectedCallback() {
    const params: Params = JSON.parse(this.dataset.params!);
    const canvas = this.querySelector("canvas") as HTMLCanvasElement;
    this.chart = new UsageChart(canvas);

    // chart was constructed with a Params
    // set up initial query
    if (params.query) {
      await this.chart.update(params);
    }
  }
}

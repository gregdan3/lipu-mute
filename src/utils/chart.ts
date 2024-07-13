import { htmlLegendPlugin, verticalLinePlugin } from "@utils/plugins";
import type { Result } from "@utils/search";
import type { ChartTypeRegistry, TooltipItem } from "chart.js/auto";
import Chart from "chart.js/auto";
import "chartjs-adapter-date-fns";

function roundForGraph(num: number): number {
  if (num >= 1) {
    return num;
  }
  if (num === 0) {
    return num;
  }
  const exponent = Math.floor(Math.log10(Math.abs(num))) + 1;
  const multiplier = Math.pow(10, 5 - exponent);
  return Math.floor(num * multiplier) / multiplier;
}

export async function first_chart_build(
  canvas: HTMLCanvasElement,
  data: Result[],
) {
  const chart = new Chart(canvas, {
    type: "line",
    data: {
      datasets: data.map((result: Result) => ({
        label: result.phrase,
        data: result.data,
      })),
    },
    plugins: [htmlLegendPlugin, verticalLinePlugin],
    options: {
      responsive: true,
      animation: { duration: 100, easing: "easeInOutQuint" },
      line: {
        datasets: { normalized: true },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "month",
            round: "month",
            tooltipFormat: "MMM yyyy",
          },
          // beforeFit: function (axis) {
          //   // @ts-expect-error
          //   let lbs: string[] = axis.chart.config.data.labels!;
          //   let len = lbs.length - 1;
          //   axis.ticks.push({ value: len, label: lbs[len] });
          // },
        },
        y: {
          beginAtZero: true,
        },
      },
      elements: {
        point: { radius: 0, hoverRadius: 5 },
        line: { tension: 0.4 },
      },
      parsing: {
        xAxisKey: "day",
        yAxisKey: "occurrences",
      },
      hover: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        // @ts-expect-error: registration can't fix inline config
        htmlLegend: {
          containerID: "usageLegend",
        },
        zoom: {
          limits: {
            x: { min: "original", max: "original" },
            y: { min: "original", max: "original" },
          },
          zoom: {
            wheel: {
              enabled: false,
            },
            pinch: {
              enabled: true,
            },
            drag: {
              enabled: true,
              backgroundColor: "rgba(220, 220, 255, 0.3)",
              borderColor: "rgba(150, 150, 255, 0.8)",
              borderWidth: 2,
            },
            mode: "x",
            // scaleMode: "x",
            // overScaleMode: "x",
          },
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
            // @ts-expect-error: it doesn't know about `raw`
            return b.raw.occurrences - a.raw.occurrences;
          },
          callbacks: {
            label: (ctx: TooltipItem<keyof ChartTypeRegistry>) => {
              // @ts-expect-error: it doesn't know about `raw`
              const occurrences = roundForGraph(ctx.raw.occurrences);
              return `${ctx.dataset.label}: ${occurrences}`;
            },
          },
        },
      },
    },
  });
  return chart;
}

export async function rebuild_chart(
  chart: Chart<"line", Row[], unknown>,
  data: Result[],
) {
  chart.data.datasets = data.map((result: Result) => ({
    label: result.phrase,
    data: result.data,
  }));
  chart.update();
}
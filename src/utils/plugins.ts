import type {
  ChartType,
  Point,
  TooltipPosition,
  TooltipPositionerFunction,
} from "chart.js/auto";
import Chart, { Element, Tooltip } from "chart.js/auto";
import annotationPlugin from "chartjs-plugin-annotation";
import { truncateLabel } from "@utils/other.ts";

// i slapped a bunch of ignores in here because it's chart.js's code
const getOrCreateLegendList = (chart: Chart, id: string) => {
  const legendContainer = document.getElementById(id)!;
  let listContainer = legendContainer.querySelector("ul");

  if (!listContainer) {
    listContainer = document.createElement("ul");
    listContainer.style.display = "flex";
    listContainer.style.flexDirection = "row";
    listContainer.style.flexWrap = "wrap";
    listContainer.style.margin = "0";
    listContainer.style.padding = "0";

    legendContainer.appendChild(listContainer);
  }

  return listContainer;
};

export const htmlLegendPlugin = {
  id: "htmlLegend",
  afterUpdate(chart: Chart, args: any, options: any) {
    const ul = getOrCreateLegendList(chart, options.containerID);

    // Remove old legend items
    while (ul.firstChild) {
      ul.firstChild.remove();
    }

    // Reuse the built-in legendItems generator
    // @ts-ignore
    const items = chart.options.plugins.legend.labels.generateLabels(chart);

    items.forEach((item) => {
      const li = document.createElement("li");
      li.style.alignItems = "center";
      li.style.cursor = "pointer";
      li.style.display = "flex";
      li.style.flexDirection = "row";
      li.style.marginLeft = "10px";

      li.onclick = () => {
        // @ts-ignore
        const { type } = chart.config;
        if (type === "pie" || type === "doughnut") {
          // Pie and doughnut charts only have a single dataset and visibility is per item
          chart.toggleDataVisibility(item.index!);
        } else {
          chart.setDatasetVisibility(
            item.datasetIndex!,
            !chart.isDatasetVisible(item.datasetIndex!),
          );
        }
        chart.update();
      };

      // Color box
      const boxSpan = document.createElement("span");
      boxSpan.style.background = item.fillStyle!.toString()!;
      boxSpan.style.borderColor = item.strokeStyle!.toString()!;
      boxSpan.style.borderWidth = item.lineWidth + "px";
      boxSpan.style.display = "inline-block";
      boxSpan.style.flexShrink = "0";
      boxSpan.style.height = "20px";
      boxSpan.style.marginRight = "10px";
      boxSpan.style.width = "20px";

      // Text
      const textContainer = document.createElement("p");
      textContainer.style.color = item.fontColor?.toString()!;
      textContainer.style.margin = "0";
      textContainer.style.padding = "0";
      textContainer.style.textDecoration = item.hidden ? "line-through" : "";

      const truncLabel = truncateLabel(item.text);
      const text = document.createTextNode(truncLabel);
      textContainer.appendChild(text);

      li.appendChild(boxSpan);
      li.appendChild(textContainer);
      ul.appendChild(li);
    });
  },
};

export const crossHairPlugin = {
  id: "crossHair",
  afterTooltipDraw: (chart: Chart) => {
    const tooltip = chart.tooltip;
    const ctx = chart.ctx;
    const area = chart.chartArea;

    if (!tooltip || !tooltip.caretX) {
      return;
    }

    // caret is cursor pos
    const x = tooltip.caretX;
    const y = tooltip.caretY;

    if (x < area.left || x > area.right || y < area.top || y > area.bottom) {
      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, area.top);
    ctx.lineTo(x, area.bottom);
    // ctx.moveTo(area.left, y);
    // ctx.lineTo(area.right, y);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(120, 130, 130, 0.8)";
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.restore();
  },
};

// @ts-expect-error: i am making a custom positioner
Tooltip.positioners.cursor = function (
  elements: Element[],
  eventPosition: Point,
): TooltipPosition | boolean {
  if (elements.length === 0) {
    return false;
  }

  const chart = this.chart;
  const chartArea = chart.chartArea;
  if (
    eventPosition.x! < chartArea.left ||
    eventPosition.x! > chartArea.right ||
    eventPosition.y! < chartArea.top ||
    eventPosition.y! > chartArea.bottom
  ) {
    return false;
  }

  return {
    x: eventPosition.x,
    y: eventPosition.y,
  };
};

declare module "chart.js" {
  interface TooltipPositionerMap {
    cursor: TooltipPositionerFunction<ChartType>;
  }
}

Chart.register(annotationPlugin);
Chart.register(htmlLegendPlugin);
Chart.register(crossHairPlugin);

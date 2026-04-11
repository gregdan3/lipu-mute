import type { Scale, Smoother, Field, Params, UnitTime } from "@utils/types";
import { FIELDS, SCALES, defaultScale } from "@utils/constants";
import { SAMPLE_SEARCHES, UNIT_TIMES } from "@utils/constants";
import { getSearchParams, toURLParams } from "@utils/urlparams";
import {
  fetchElems,
  shouldDisableScale,
  shouldDisableSmoothing,
} from "@utils/ui";
import { randomElem } from "@utils/other";
import { countQuery } from "@utils/analytics";

// constants expected when the chartController exists
export const CONTROLLER_ELEMENTS = {
  searchBox: ["searchBox", HTMLInputElement],

  scaleDropdown: ["scaleDropdown", HTMLSelectElement],
  fieldDropdown: ["fieldDropdown", HTMLSelectElement],
  smootherDropdown: ["smootherDropdown", HTMLSelectElement],
  smoothingDropdown: ["smoothingDropdown", HTMLSelectElement],

  startDropdown: ["startDropdown", HTMLSelectElement],
  endDropdown: ["endDropdown", HTMLSelectElement],
  unitDropdown: ["unitDropdown", HTMLSelectElement],

  advancedButton: ["advancedButton", HTMLElement],
  sampleQueryButton: ["sampleQueryButton", HTMLElement],

  usageForm: ["usageForm", HTMLFormElement],
} as const;

const PARAM_MAP = {
  query: "searchBox",
  field: "fieldDropdown",
  scale: "scaleDropdown",
  smoothing: "smoothingDropdown",
  smoother: "smootherDropdown",
  start: "startDropdown",
  end: "endDropdown",
  unit: "unitDropdown",
} satisfies Record<keyof Params, string>;

export const $ = fetchElems(CONTROLLER_ELEMENTS);

export function getPageParams(): Params {
  const params = {
    query: $.searchBox.value,
    scale: $.scaleDropdown.value as Scale,
    field: $.fieldDropdown.value as Field,
    smoother: $.smootherDropdown.value as Smoother,
    smoothing: Number($.smoothingDropdown.value),
    start: Number($.startDropdown.value),
    end: Number($.endDropdown.value),
    unit: $.unitDropdown.value as UnitTime,
  };
  return params;
}

export function setRandomQuery() {
  $.searchBox.value = randomElem(SAMPLE_SEARCHES);
}

export function toggleAdvanced() {
  [$.smootherDropdown, $.smoothingDropdown].forEach((el) => {
    el.classList.toggle("nodisplay");
  });
}

function boundDatePicker() {
  let start = Number($.startDropdown.value);
  let end = Number($.endDropdown.value);
  // manage bounds of start/end
  if (end < start) {
    [start, end] = [end, start];
    [$.startDropdown.value, $.endDropdown.value] = [
      $.endDropdown.value,
      $.startDropdown.value,
    ];
  } else if (end === start) {
    const opts = Array.from($.startDropdown.options, (o) => Number(o.value));
    const idx = opts.indexOf(start);

    if (idx < opts.length - 1) {
      // move end to next value
      end = opts[idx + 1];
      $.endDropdown.value = String(end);
    } else if (idx > 0) {
      start = opts[idx - 1];
      $.startDropdown.value = String(start);
    }
  }
}

function disableUnusableScales() {
  const scale = $.scaleDropdown.value as Scale;
  const field = $.fieldDropdown.value as Field;
  // certain scales sum
  // so if the selected field is not summable we disable the scale
  // also bounces the user back to defaultScale if necessary
  const summable = FIELDS[field].summable;
  const options = Array.from($.scaleDropdown.querySelectorAll("option"));
  options.forEach((option) => {
    const id = option.id as Scale | undefined;
    if (shouldDisableScale(id)) {
      option.disabled = !summable;
    }
  });
  // bounce user back to default scale
  if (!summable && SCALES[scale].sums) {
    $.scaleDropdown.value = defaultScale;
  }
}

function setSearchParams() {
  const searchParams = getSearchParams();
  const keys = Object.keys(PARAM_MAP) as (keyof Params)[];
  for (const key of keys) {
    const elemId = PARAM_MAP[key];
    const value = searchParams[key];

    if (value) {
      // @ts-expect-error: technically $ contains more than param elems
      ($[elemId] as HTMLInputElement | HTMLSelectElement).value =
        value.toString();
    }
  }
}

function controllerUpdated() {
  boundDatePicker();
  disableUnusableScales();

  const scale = $.scaleDropdown.value as Scale;
  const unit = $.unitDropdown.value as UnitTime;
  $.smootherDropdown.disabled = !shouldDisableSmoothing(scale, unit);
  $.smoothingDropdown.disabled = !shouldDisableSmoothing(scale, unit);

  const params = getPageParams();

  // send data to main
  document.dispatchEvent(
    new CustomEvent("chart-controller-updated", {
      detail: params,
      bubbles: true,
    }),
  );

  // TODO: does the act of querying
  // toURLParams(params);
  // countQuery();
}

export function initializeController() {
  const $ = fetchElems(CONTROLLER_ELEMENTS);

  setSearchParams();
  controllerUpdated();

  // if advanced button is clicked, toggle visibility of smoother/smoothing
  $.advancedButton.addEventListener("click", async () => {
    toggleAdvanced();
  });

  $.sampleQueryButton.addEventListener("click", async () => {
    setRandomQuery();
    controllerUpdated();
  });

  $.usageForm.addEventListener("change", async () => {
    controllerUpdated();
  });
}

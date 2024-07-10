import { createDbWorker, WorkerHttpvfs } from "sql.js-httpvfs";
import Chart from "chart.js/auto";

import {
  inputToPhrases,
  first_chart_build,
  fetch_many_occurrences,
  rebuild_chart,
  Row,
  consoleLogAsync,
} from "./utils";

const workerUrl = new URL(
  "sql.js-httpvfs/dist/sqlite.worker.js",
  import.meta.url,
);
const wasmUrl = new URL("sql.js-httpvfs/dist/sql-wasm.wasm", import.meta.url);

const SAMPLE_SEARCHES = [
  // duh
  "toki, pona, toki pona",
  // phrase trends
  "tomo tawa, ilo tawa",
  // semantically identical words
  "lukin, oko, lukin + oko",
  "ale, ali, ale + ali",
  "ala, x, ala + x",
  "anu, y, anu + y",
  // word groups
  "walo, pimeja, laso, loje, jelo",
  "soweli, waso, kala, akesi, pipi",
  "meli, mije, tonsi",
  "pu, ku, su",
  // modifier usage
  "wawa sewi, wawa mute, wawa suli, wawa a",
  // grammatical things
  "kepeken ilo, kepeken e ilo",
  "kin la, namako la, poka la, sama la",
  // names
  "kekan, kekan san, jan kekan, mun kekan",
  "sonja, jan sonja",
];

async function user_request(
  worker: WorkerHttpvfs,
  chart: Chart<"line", Row[], unknown>,
  input: string,
  min_sent_len: number,
  relative: boolean,
) {
  const phrases = inputToPhrases(input);
  if (phrases.length === 0) {
    return;
  }

  const results = await fetch_many_occurrences(
    worker,
    phrases,
    min_sent_len,
    relative,
  );
  if (results.length === 0) {
    // TODO: tell user nothing came back
    return;
  }
  if (results.length < phrases.length) {
    // TODO: tell user some (which) words were not found
  }

  await rebuild_chart(chart, results);
}

document.addEventListener("DOMContentLoaded", async () => {
  const searchBox = document.getElementById("searchBox")! as HTMLInputElement;
  searchBox.value =
    SAMPLE_SEARCHES[Math.floor(Math.random() * SAMPLE_SEARCHES.length)];

  const sentLenSlider = document.getElementById(
    "sentLenRange",
  )! as HTMLInputElement;

  const relCheckbox = document.getElementById(
    "relCheckbox",
  )! as HTMLInputElement;
  relCheckbox.checked = Math.random() < 0.5;

  const usageCanvas = document.getElementById("usage")! as HTMLCanvasElement;
  const ranksCanvas = document.getElementById("ranks")! as HTMLCanvasElement;

  const worker = await createDbWorker(
    [
      {
        // TODO: investigate
        from: "inline",
        config: {
          serverMode: "full",
          url: "/db/2024-07-08-trimmed.sqlite",
          requestChunkSize: 1024, // TODO: reduce?
        },
      },
    ],
    workerUrl.toString(),
    wasmUrl.toString(),
  );

  const phrases = inputToPhrases(searchBox.value);
  const results = await fetch_many_occurrences(
    worker,
    phrases,
    Number(sentLenSlider.value),
    relCheckbox.checked,
  );
  const usageChart = await first_chart_build(usageCanvas, results);

  const form = document.getElementById("usageForm")! as HTMLFormElement;
  form.addEventListener("change", async () => {
    const queryText = searchBox.value;
    const sentLen = Number(sentLenSlider.value);
    const relative = relCheckbox.checked;
    // @ts-ignore
    await user_request(worker, usageChart, queryText, sentLen, relative);
  });
});

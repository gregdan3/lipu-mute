// import type { Rank } from "@utils/types";
// import { isUCSUR, truncateLabel } from "@utils/other";
// import { getLinkuCategories } from "@utils/linku";
//
// const colorMap: { [key: string]: string } = {
//   core: "palegoldenrod",
//   common: "skyblue",
//   uncommon: "palevioletred",
//   obscure: "mediumpurple",
//   sandbox: "lightgray",
//   ucsur: "lightgreen",
//   unknown: "white",
// };
//
// function calcWidth(maxHits: number, thisHits: number): number {
//   // neither value can be 0
//   const adjustedThisHits = Math.log(thisHits);
//   const adjustedMaxHits = Math.log(maxHits);
//
//   return adjustedThisHits / adjustedMaxHits;
//   // return thisHits / maxHits;
// }
//
// async function makeGradient(term: string) {
//   // make a linear gradient with sharp cutoffs out of a list of words
//   const words = term.split(/\s+/);
//   const gradientStops: string[] = [];
//   const totalWords = words.length;
//
//   for (let i = 0; i < totalWords; i++) {
//     const word = words[i];
//     const classes = await getLinkuCategories(word);
//     let colorClass = classes.find((cls) =>
//       Object.prototype.hasOwnProperty.call(colorMap, cls),
//     )!;
//     if (isUCSUR(word)) {
//       colorClass = "ucsur";
//     }
//
//     const color = colorMap[colorClass];
//
//     const startPercent = (i / totalWords) * 100;
//     const endPercent = ((i + 1) / totalWords) * 100;
//     gradientStops.push(`${color} ${startPercent}%, ${color} ${endPercent}%`);
//   }
//
//   const gradient = `linear-gradient(to right, ${gradientStops.join(", ")})`;
//   return gradient;
// }
//
// async function assignWordClasses(
//   item: Rank,
//   termLen: number,
//   elem: HTMLElement,
// ) {
//   if (isUCSUR(item.term)) {
//     elem.classList.add("ucsur");
//   }
//
//   if (termLen === 1) {
//     const classes = await getLinkuCategories(item.term);
//     elem.classList.add(...classes);
//   }
// }
//
// async function makeDivEntry(
//   item: Rank,
//   index: number,
//   maxHits: number,
//   termLen: number,
// ): Promise<HTMLDivElement> {
//   const rankItem = document.createElement("div");
//   rankItem.classList.add("rankItem");
//
//   const rankText = document.createElement("span");
//   const word = truncateLabel(item.term);
//   rankText.textContent = `${index + 1}. ${word}: ${item.hits}`;
//
//   const rankBar = document.createElement("span");
//   rankBar.style.width = `${calcWidth(maxHits, item.hits) * 60}%`;
//   rankBar.classList.add("rankBar");
//
//   await assignWordClasses(item, termLen, rankBar);
//
//   rankItem.appendChild(rankText);
//   rankItem.appendChild(rankBar);
//
//   return rankItem;
// }
//
// async function makeTableEntry(
//   item: Rank,
//   index: number,
//   maxHits: number,
//   termLen: number,
// ): Promise<HTMLTableRowElement> {
//   const tableRow = document.createElement("tr");
//
//   const rankData = document.createElement("td");
//   rankData.textContent = `${index + 1}.`;
//   tableRow.appendChild(rankData);
//   rankData.classList.add("rankData");
//
//   const hitsData = document.createElement("td");
//   hitsData.textContent = item.hits.toString();
//   tableRow.appendChild(hitsData);
//   hitsData.classList.add("hitsData");
//
//   const word = truncateLabel(item.term);
//
//   const barData = document.createElement("td");
//   const barDiv = document.createElement("div");
//   barDiv.textContent = word;
//   barDiv.style.width = `${calcWidth(maxHits, item.hits) * 100}%`;
//   barData.classList.add("barData");
//   barDiv.style.background = await makeGradient(item.term);
//
//   await assignWordClasses(item, termLen, barDiv);
//   barData.appendChild(barDiv);
//   tableRow.appendChild(barData);
//
//   return tableRow;
// }
//
// export async function reloadBarChart(
//   div: HTMLDivElement,
//   results: Rank[],
//   termLen: number,
// ) {
//   div.innerHTML = "";
//
//   const rankTable = document.createElement("table");
//   rankTable.style.width = `100%`;
//   div.appendChild(rankTable);
//
//   const maxHits = results[0].hits;
//   const tableRows: HTMLElement[] = [];
//   for (const [index, item] of results.entries()) {
//     // if (item.term[0] !== "^" && item.term.slice(-1) !== "$") {
//     //   continue;
//     // }
//     const tableRow = await makeTableEntry(item, index, maxHits, termLen);
//     tableRows.push(tableRow);
//   }
//   rankTable.append(...tableRows);
// }

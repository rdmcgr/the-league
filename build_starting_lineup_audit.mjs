import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputPath = "/Users/rory/Documents/The League/History/Yahoo Starting Lineup Records Audit.xlsx";
const workbook = Workbook.create();
const summary = workbook.worksheets.add("Records");
const log = workbook.worksheets.add("Collection log");
const candidates = workbook.worksheets.add("Weekly candidates");

summary.showGridLines = false;
summary.getRange("A1").values = [["Yahoo Starting Lineup Records Audit"]];
summary.getRange("A1").format = {
  font: { name: "Arial", size: 14, bold: true, color: "#1F1F1F" },
  horizontalAlignment: "left",
  verticalAlignment: "center",
};
summary.getRange("A1").format.rowHeight = 24;
summary.getRange("A2").values = [["Scope: regular-season starters only, 2006–2025. Source: Yahoo Fantasy matchup pages."]];
summary.getRange("A2").format = { font: { name: "Arial", size: 10, italic: true, color: "#666666" } };
summary.getRange("A4:F4").values = [["Position", "Rank", "Player", "Points", "Season", "Week"]];
summary.getRange("A4:F4").format = {
  fill: "#1F4E78",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  borders: { preset: "outside", style: "thin", color: "#FFFFFF" },
};
const recordRows = [];
for (const position of ["QB", "RB", "WR", "TE"]) {
  for (let rank = 1; rank <= 3; rank++) recordRows.push([position, rank, "", null, null, null]);
}
summary.getRange("A5:F16").values = recordRows;
summary.getRange("A5:F16").format = { font: { name: "Arial", size: 10 }, verticalAlignment: "center" };
summary.getRange("D5:D16").format.numberFormat = "0.00";
summary.getRange("A4:F16").format.borders = { preset: "all", style: "thin", color: "#D9E2F3" };
summary.getRange("A4:F16").format.autofitColumns();
summary.getRange("A:A").format.columnWidth = 12;
summary.getRange("B:B").format.columnWidth = 9;
summary.getRange("C:C").format.columnWidth = 24;
summary.getRange("D:D").format.columnWidth = 12;
summary.getRange("E:F").format.columnWidth = 11;

log.showGridLines = false;
log.getRange("A1:H1").values = [["Season", "Week", "Status", "Matchups checked", "QB leader", "RB leader", "WR leader", "TE leader"]];
log.getRange("A1:H1").format = {
  fill: "#1F4E78",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
const weeksByYear = year => year === 2020 ? 13 : (year >= 2021 ? 14 : 13);
const collectedWeeks = new Map([
  ["2020-1", ["Collected", 5, "Russell Wilson — 31.78", "Josh Jacobs — 31.90", "Davante Adams — 27.60", "Mark Andrews — 17.80"]],
  ["2020-2", ["Collected", 5, "Dak Prescott — 39.80", "Aaron Jones Sr. — 41.60", "Calvin Ridley — 22.90", "Darren Waller — 16.50"]],
]);
const logRows = [];
for (let year = 2006; year <= 2025; year++) {
  for (let week = 1; week <= weeksByYear(year); week++) {
    const saved = collectedWeeks.get(`${year}-${week}`);
    logRows.push(saved ? [year, week, ...saved] : [year, week, "Not collected", null, "", "", "", ""]);
  }
}
log.getRange(`A2:H${logRows.length + 1}`).values = logRows;
log.getRange(`A2:B${logRows.length + 1}`).format.numberFormat = "0";
log.getRange(`D2:D${logRows.length + 1}`).format.numberFormat = "0";
log.getRange(`A1:H${logRows.length + 1}`).format.borders = { preset: "all", style: "thin", color: "#E6E6E6" };
log.getRange("A:H").format.autofitColumns();
log.getRange("A:A").format.columnWidth = 11;
log.getRange("B:B").format.columnWidth = 9;
log.getRange("C:C").format.columnWidth = 16;
log.getRange("D:D").format.columnWidth = 18;
log.getRange("E:H").format.columnWidth = 25;
log.freezePanes.freezeRows(1);

candidates.showGridLines = false;
candidates.getRange("A1:G1").values = [["Season", "Week", "Position", "Weekly rank", "Player", "Points", "Lineup slot"]];
candidates.getRange("A1:G1").format = {
  fill: "#1F4E78",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
const weeklyCandidates = [
  [2020, 1, "QB", 1, "Russell Wilson", 31.78, "QB"],
  [2020, 1, "QB", 2, "Lamar Jackson", 27.50, "QB"],
  [2020, 1, "QB", 3, "Kyler Murray", 26.30, "QB"],
  [2020, 1, "RB", 1, "Josh Jacobs", 31.90, "RB"],
  [2020, 1, "RB", 2, "Christian McCaffrey", 25.50, "RB"],
  [2020, 1, "RB", 3, "Ezekiel Elliott", 24.70, "RB"],
  [2020, 1, "WR", 1, "Davante Adams", 27.60, "WR"],
  [2020, 1, "WR", 2, "Adam Thielen", 25.00, "WR"],
  [2020, 1, "WR", 3, "Calvin Ridley", 24.90, "WR"],
  [2020, 1, "TE", 1, "Mark Andrews", 17.80, "TE"],
  [2020, 1, "TE", 2, "T.J. Hockenson", 11.60, "TE"],
  [2020, 1, "TE", 3, "Travis Kelce", 11.00, "TE"],
  [2020, 2, "QB", 1, "Dak Prescott", 39.80, "QB"],
  [2020, 2, "QB", 2, "Cam Newton", 34.58, "QB"],
  [2020, 2, "QB", 3, "Josh Allen", 34.50, "QB"],
  [2020, 2, "RB", 1, "Aaron Jones Sr.", 41.60, "W/R/T"],
  [2020, 2, "RB", 2, "Alvin Kamara", 29.40, "RB"],
  [2020, 2, "RB", 3, "Nick Chubb", 25.30, "RB"],
  [2020, 2, "WR", 1, "Calvin Ridley", 22.90, "WR"],
  [2020, 2, "WR", 2, "Stefon Diggs", 21.30, "WR"],
  [2020, 2, "WR", 3, "Terry McLaurin", 18.50, "WR"],
  [2020, 2, "TE", 1, "Darren Waller", 16.50, "TE"],
  [2020, 2, "TE", 2, "Travis Kelce", 15.00, "TE"],
  [2020, 2, "TE", 3, "Noah Fant", 13.70, "TE"],
];
candidates.getRange(`A2:G${weeklyCandidates.length + 1}`).values = weeklyCandidates;
candidates.getRange(`A2:D${weeklyCandidates.length + 1}`).format.numberFormat = "0";
candidates.getRange(`F2:F${weeklyCandidates.length + 1}`).format.numberFormat = "0.00";
candidates.getRange(`A1:G${weeklyCandidates.length + 1}`).format.borders = { preset: "all", style: "thin", color: "#E6E6E6" };
candidates.getRange("A:G").format.autofitColumns();
candidates.getRange("A:A").format.columnWidth = 11;
candidates.getRange("B:D").format.columnWidth = 12;
candidates.getRange("E:E").format.columnWidth = 24;
candidates.getRange("F:F").format.columnWidth = 12;
candidates.getRange("G:G").format.columnWidth = 14;
candidates.freezePanes.freezeRows(1);

workbook.recalculate();
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);

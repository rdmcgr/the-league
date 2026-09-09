import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputPath = "/Users/rory/Documents/The League/History/Yahoo Starting Lineup Records Audit.xlsx";
const workbook = Workbook.create();
const summary = workbook.worksheets.add("Records");
const log = workbook.worksheets.add("Collection log");

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

workbook.recalculate();
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);

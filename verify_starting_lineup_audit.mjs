import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const path = "/Users/rory/Documents/The League/History/Yahoo Starting Lineup Records Audit.xlsx";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
console.log((await workbook.inspect({ kind: "table", range: "Records!A1:F16", include: "values,formulas", tableMaxRows: 16, tableMaxCols: 6 })).ndjson);
console.log((await workbook.inspect({ kind: "table", range: "Collection log!A1:H8", include: "values,formulas", tableMaxRows: 8, tableMaxCols: 8 })).ndjson);
console.log((await workbook.inspect({ kind: "table", range: "Weekly candidates!A1:G25", include: "values,formulas", tableMaxRows: 25, tableMaxCols: 7 })).ndjson);
console.log((await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 50 }, summary: "formula errors" })).ndjson);
const preview = await workbook.render({ sheetName: "Records", range: "A1:F16", scale: 1.5 });
await fs.writeFile("/private/tmp/yahoo-lineup-audit-records.png", new Uint8Array(await preview.arrayBuffer()));

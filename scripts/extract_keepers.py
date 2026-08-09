#!/usr/bin/env python3
import json
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"


def col_to_index(ref: str) -> int:
    col = "".join(ch for ch in ref if ch.isalpha())
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch.upper()) - 64)
    return n


def parse_workbook(path: Path):
    zf = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in zf.namelist():
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
        for si in root.findall("a:si", NS):
            shared.append("".join(t.text or "" for t in si.findall(".//a:t", NS)))

    wb = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rid_to_target = {r.attrib["Id"]: r.attrib["Target"] for r in rels.findall(f"{REL_NS}Relationship")}
    sheets = {}
    for sheet in wb.findall("a:sheets/a:sheet", NS):
        name = sheet.attrib["name"]
        rid = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
        target = "xl/" + rid_to_target[rid]
        root = ET.fromstring(zf.read(target))
        rows = {}
        for row in root.findall("a:sheetData/a:row", NS):
            ridx = int(row.attrib["r"])
            cells = {}
            for c in row.findall("a:c", NS):
                ref = c.attrib.get("r", "A1")
                idx = col_to_index(ref)
                t = c.attrib.get("t")
                v = c.find("a:v", NS)
                val = None
                if t == "s" and v is not None and v.text is not None:
                    sidx = int(v.text)
                    val = shared[sidx] if sidx < len(shared) else None
                elif t == "inlineStr":
                    is_tag = c.find("a:is", NS)
                    if is_tag is not None:
                        val = "".join(t2.text or "" for t2 in is_tag.findall(".//a:t", NS))
                elif v is not None:
                    val = v.text
                cells[idx] = {"value": val, "_style": c.attrib.get("s")}
            if cells:
                rows[ridx] = cells
        sheets[name] = rows

    styles = {}
    if "xl/styles.xml" in zf.namelist():
        root = ET.fromstring(zf.read("xl/styles.xml"))
        cell_xfs = root.find("a:cellXfs", NS)
        if cell_xfs is not None:
            for idx, xf in enumerate(cell_xfs.findall("a:xf", NS)):
                styles[idx] = xf.attrib

    return sheets, styles


def cell(row, col):
    entry = row.get(col)
    if isinstance(entry, dict):
        return entry.get("value")
    return entry


def cell_style(row, col):
    entry = row.get(col)
    if isinstance(entry, dict):
        return entry.get("_style")
    return None


def cell_fill(row, col, styles):
    style = cell_style(row, col)
    if style is None:
        return None
    xf = styles.get(int(style))
    if xf is None:
        return None
    return xf.get("fillId")


def normalize(v):
    if v is None:
        return ""
    return str(v).strip()


def build_keepers(sheet, styles):
    header = sheet[5]
    header_years = [normalize(cell(header, 3))]  # 2025 only

    keepers = []
    current_owner = None
    current_values = []
    for r in range(6, max(sheet.keys()) + 1):
        row = sheet.get(r)
        if not row:
            continue
        owner = normalize(cell(row, 2))
        keeper = normalize(cell(row, 3))
        if owner:
            if current_owner and current_values:
                while len(current_values) < 2:
                    current_values.append({"value": "", "style": None})
                keepers.append({"owner": current_owner, "year": header_years[0], "values": current_values[:2]})
            current_owner = owner
            current_values = []
        if keeper:
            current_values.append({
                "value": keeper,
                "style": cell_style(row, 3),
                "fill": cell_fill(row, 3, styles),
            })

    if current_owner and current_values:
        while len(current_values) < 2:
            current_values.append({"value": "", "style": None})
        keepers.append({"owner": current_owner, "year": header_years[0], "values": current_values[:2]})

    notes = []
    for r in range(2, 5):
        row = sheet.get(r)
        if row and normalize(cell(row, 2)):
            notes.append(normalize(cell(row, 2)))

    return {
        "meta": {"source": "FF Keepers 0892026.xlsm", "sheet": "2025"},
        "headerYears": header_years,
        "notes": notes,
        "keepers": keepers,
    }


def main():
    src = Path("FF Keepers 0892026.xlsm")
    out = Path("data/keepers.json")
    sheets, styles = parse_workbook(src)
    data = build_keepers(sheets["2025"], styles)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()

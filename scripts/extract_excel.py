#!/usr/bin/env python3
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
REL_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"


def col_to_index(ref: str) -> int:
    col = "".join(ch for ch in ref if ch.isalpha())
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch.upper()) - 64)
    return n


def parse_xlsx(path: Path):
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
        rows = []
        for row in root.findall("a:sheetData/a:row", NS):
            cells = {}
            for c in row.findall("a:c", NS):
                ref = c.attrib.get("r", "A1")
                i = col_to_index(ref)
                t = c.attrib.get("t")
                v = c.find("a:v", NS)
                val = None
                if t == "s" and v is not None and v.text is not None:
                    idx = int(v.text)
                    val = shared[idx] if idx < len(shared) else None
                elif t == "inlineStr":
                    is_tag = c.find("a:is", NS)
                    if is_tag is not None:
                        val = "".join(t2.text or "" for t2 in is_tag.findall(".//a:t", NS))
                elif v is not None:
                    val = v.text
                cells[i] = val
            if cells:
                rows.append(cells)
        sheets[name] = rows

    return sheets


def get_row(rows, row_idx):
    for row in rows:
        if 1 in row or any(True for _ in row):
            pass
    # rows store no row number; infer by order impossible. Use pattern helper instead.


def row_to_list(cells, max_col=None):
    if not cells:
        return []
    m = max_col or max(cells)
    return [cells.get(i) for i in range(1, m + 1)]


def as_float(v):
    if v in (None, "", "-", "n/a"):
        return None
    try:
        return float(v)
    except Exception:
        return None


def as_int(v):
    if v in (None, "", "-", "n/a"):
        return None
    try:
        return int(float(v))
    except Exception:
        return None


def build_dataset(sheets):
    wins_rows = sheets["All Time Wins - Regular Season"]
    vis1_rows = sheets["Visual Data 1"]
    vis2_rows = sheets["Visual Data 2"]
    points_rows = sheets["All Time Pts - Regular Season"]
    trophy_rows = sheets["All Time - Trophy Counts"]
    three_rows = sheets["3 Season View"]
    five_rows = sheets["5 Season View"]

    # Visual sheets are clean: first row headers then teams.
    vis_years = [as_int(v) for v in row_to_list(vis1_rows[0])[1:] if as_int(v)]

    yearly_wins = []
    for row in vis1_rows[1:]:
        arr = row_to_list(row, 1 + len(vis_years))
        team = arr[0]
        if not team:
            continue
        wins = [as_int(v) or 0 for v in arr[1:1 + len(vis_years)]]
        yearly_wins.append({"team": team, "wins": wins})

    cumulative_wins = []
    for row in vis2_rows[1:]:
        arr = row_to_list(row, 1 + len(vis_years))
        team = arr[0]
        if not team:
            continue
        totals = [as_int(v) or 0 for v in arr[1:1 + len(vis_years)]]
        cumulative_wins.append({"team": team, "totals": totals})

    # All-time table: rows start where column A is team and col B has wins.
    all_time = []
    for row in wins_rows:
        team = row.get(1)
        wins = as_int(row.get(2))
        losses = as_int(row.get(3))
        if not team or wins is None or losses is None:
            continue
        total_games = as_int(row.get(6)) or (wins + losses)
        win_pct = as_float(row.get(4))
        active = (row.get(5) or "").strip().lower() == "yes"
        all_time.append(
            {
                "team": team,
                "wins": wins,
                "losses": losses,
                "games": total_games,
                "winPct": win_pct if win_pct is not None else (wins / total_games if total_games else 0),
                "active": active,
            }
        )

    # Build active-team set from all-time table and keep only active teams site-wide.
    active_teams = {r["team"] for r in all_time if r["active"]}
    all_time = [r for r in all_time if r["active"]]
    yearly_wins = [r for r in yearly_wins if r["team"] in active_teams]
    cumulative_wins = [r for r in cumulative_wins if r["team"] in active_teams]

    # Points table has header row with years at cols 4+
    points_years = []
    p_header = {}
    for row in points_rows:
        if row.get(2) == "Points - Overall Avg" and row.get(3) == "Points - Avg Last 3 Yrs":
            p_header = row
            break
    maxc = max(p_header) if p_header else 0
    for c in range(4, maxc + 1):
        y = as_int(p_header.get(c))
        if y:
            points_years.append((c, y))

    points = []
    for row in points_rows[1:]:
        team = row.get(1)
        overall = as_float(row.get(2))
        last3 = as_float(row.get(3))
        if not team or overall is None:
            continue
        by_year = []
        for c, y in points_years:
            v = as_float(row.get(c))
            if v is not None:
                by_year.append({"year": y, "points": v})
        points.append(
            {
                "team": team,
                "overallAvg": overall,
                "last3Avg": last3,
                "byYear": by_year,
            }
        )
    points = [r for r in points if r["team"] in active_teams]

    trophies = []
    for row in trophy_rows[1:]:
        team = row.get(1)
        active_raw = (row.get(2) or "").strip()
        # skip note rows
        if not team or active_raw not in ("Yes", "No"):
            continue
        first = as_int(row.get(6)) or 0
        second = as_int(row.get(7)) or 0
        third = as_int(row.get(8)) or 0
        total = as_int(row.get(9)) or (first + second + third)
        weighted = as_int(row.get(10)) or (first * 3 + second * 2 + third)
        trophies.append(
            {
                "team": team,
                "active": active_raw == "Yes",
                "first": first,
                "second": second,
                "third": third,
                "total": total,
                "weighted": weighted,
                "years": {
                    "first": row.get(3) or "",
                    "second": row.get(4) or "",
                    "third": row.get(5) or "",
                },
            }
        )
    trophies = [r for r in trophies if r["team"] in active_teams]

    # 3-season and 5-season tables
    def parse_window(rows, year_cols):
        out = []
        for row in rows:
            team = row.get(2)
            wins = as_int(row.get(3))
            losses = as_int(row.get(4))
            if not team or wins is None or losses is None:
                continue
            years = []
            for y, wc, lc in year_cols:
                w = as_int(row.get(wc))
                l = as_int(row.get(lc))
                if w is not None and l is not None:
                    years.append({"year": y, "wins": w, "losses": l})
            out.append({"team": team, "wins": wins, "losses": losses, "years": years})
        return out

    three_window = parse_window(three_rows, [(2024, 5, 6), (2023, 7, 8), (2022, 9, 10)])
    five_window = parse_window(five_rows, [(2024, 5, 6), (2023, 7, 8), (2022, 9, 10), (2021, 11, 12), (2020, 13, 14)])
    three_window = [r for r in three_window if r["team"] in active_teams]
    five_window = [r for r in five_window if r["team"] in active_teams]

    # Quick KPI values
    all_time_sorted = sorted(all_time, key=lambda x: x["wins"], reverse=True)
    kpi = {
        "mostWins": all_time_sorted[0]["team"] if all_time_sorted else None,
        "bestWinPct": max(all_time, key=lambda x: x["winPct"])["team"] if all_time else None,
        "trophyLeader": max(trophies, key=lambda x: x["weighted"])["team"] if trophies else None,
        "bestPointsAvg": max(points, key=lambda x: x["overallAvg"])["team"] if points else None,
    }

    return {
        "meta": {"league": "The League", "generatedFrom": "Season Win Tracker 02282026.xlsx"},
        "years": vis_years,
        "allTime": all_time,
        "yearlyWins": yearly_wins,
        "cumulativeWins": cumulative_wins,
        "points": points,
        "trophies": trophies,
        "threeSeason": three_window,
        "fiveSeason": five_window,
        "kpi": kpi,
    }


def main():
    src = Path("Season Win Tracker 02282026.xlsx")
    out = Path("data/league-data.json")
    sheets = parse_xlsx(src)
    data = build_dataset(sheets)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()

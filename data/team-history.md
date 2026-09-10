# Team history database

- `team-history.json` is the owner-facing database for the six completed seasons (2020–2025).
- `yahoo-rosters-raw.xlsx` and `yahoo-rosters-raw.json` contain the captured Yahoo end-of-season rosters: 60 team-seasons and 796 roster rows.
- Each owner uses a stable first-name/last-initial slug (`rory-m`, `nikki-t`, etc.). The `team_name` inside each season preserves that year's Yahoo team name.
- `record`, `points_for`, `points_rank`, `points_per_game`, and `points_per_game_rank` come from the league-history workbook.
- `playoff_finish` records the exact finish when the team reached the playoff field; teams that did not qualify are labeled `Missed playoffs`.
- `key_players` contains three rostered offensive players with the lowest final positional rank for that season. Positions are resolved from the source ranking table rather than Yahoo's flexible roster-slot label. Kickers and defenses are omitted from the key-player selection.
- Final position ranks and fantasy points come from the FantasyPros standard-scoring tables saved in `data/fantasypros/`, with one source URL stored on each key-player record.
- Eight roster entries were retained in `unmatched_roster_players` because they were kickers/IR players or were absent from the source table; none was needed for a three-player result.

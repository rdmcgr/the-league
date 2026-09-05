const state = {
  data: null,
  keepers: null,
  sortKey: 'team',
  sortDir: 'asc',
  winsMetric: 'last3Total',
  pointsMetric: 'last3Avg',
  trophyMetric: 'weighted',
  selectedTeam: null,
  startingLineups: null,
};

const TEAM_COLORS = {
  'Rory M.': '#ff8c1a',
  'Rich S.': '#4da3ff',
  'Kevin E.': '#f2c14e',
  'Dan F.': '#40c57e',
  'Mike L.': '#b88cff',
  'Kevin L.': '#23c9d6',
  'Nick P.': '#f26ca7',
  'Adam D.': '#a5d96a',
  'Paul L.': '#ff5a5f',
  'Nikki T.': '#c0cad8',
};

const teamColor = (name) => TEAM_COLORS[name] || '#dbe5f2';

const fmtPct = (n) => (n == null ? '-' : (n * 100).toFixed(1) + '%');
const fmtNum = (n, d = 0) => (n == null ? '-' : Number(n).toFixed(d));

function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');
  const selectTab = (tabName, updateUrl = false) => {
    const tab = [...tabs].find((candidate) => candidate.dataset.tab === tabName);
    const panel = document.getElementById(tabName);
    if (!tab || !panel) return;
    tabs.forEach((item) => item.classList.remove('active'));
    panels.forEach((item) => item.classList.remove('active'));
    tab.classList.add('active');
    panel.classList.add('active');
    if (updateUrl) history.replaceState(null, '', `#${tabName === 'futures' ? 'sportsbook' : tabName}`);
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => selectTab(tab.dataset.tab, true));
  });

  const tabFromHash = () => window.location.hash.slice(1) === 'sportsbook' ? 'futures' : window.location.hash.slice(1) || 'dashboard';
  selectTab(tabFromHash());
  window.addEventListener('hashchange', () => selectTab(tabFromHash()));
}

function initSportsbookOddsExplainer() {
  const openButtons = document.querySelectorAll('.sportsbook-odds-explainer-open');
  const dialog = document.getElementById('sportsbook-odds-dialog');
  const closeButton = document.getElementById('sportsbook-odds-dialog-close');
  const title = document.getElementById('sportsbook-odds-dialog-title');
  const text = document.getElementById('sportsbook-odds-dialog-text');
  if (!openButtons.length || !dialog || !closeButton || !title || !text) return;
  openButtons.forEach((button) => button.addEventListener('click', () => {
    title.textContent = button.dataset.explainerTitle;
    text.textContent = button.dataset.explainerText;
    dialog.showModal();
  }));
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
}

function sortedAllTime() {
  const items = [...state.data.allTime];
  const dir = state.sortDir === 'asc' ? 1 : -1;
  return items.sort((a, b) => {
    const av = a[state.sortKey];
    const bv = b[state.sortKey];
    if (typeof av === 'string') return av.localeCompare(bv) * dir;
    return (av - bv) * dir;
  });
}

function renderAllTimeTable() {
  const tbody = document.querySelector('#all-time-table tbody');
  tbody.innerHTML = sortedAllTime()
    .map(
      (r) => `<tr><td>${r.team}</td><td>${r.wins}</td><td>${r.losses}</td><td>${fmtPct(r.winPct)}</td></tr>`,
    )
    .join('');
}

function initAllTimeEvents() {
  document.querySelectorAll('#all-time-table th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      else {
        state.sortKey = key;
        state.sortDir = 'desc';
      }
      renderAllTimeTable();
    });
  });
}

function renderTrophyMini() {
  const list = [...state.data.trophies]
    .filter((t) => t.weighted >= 10)
    .sort((a, b) => b.weighted - a.weighted);
  const header = '<div class="mini-row mini-head"><span>Team</span><span>Weighted Trophy Count</span></div>';
  const rows = list
    .map((t) => `<div class="mini-row"><span>${t.team}</span><span>${t.weighted}</span></div>`)
    .join('');
  document.getElementById('trophy-mini').innerHTML = `${header}${rows}`;
}

function renderChampionshipMini() {
  const list = [...state.data.trophies]
    .filter((t) => t.first >= 2)
    .sort((a, b) => b.first - a.first || a.team.localeCompare(b.team));
  const header = '<div class="mini-row mini-head"><span>Team</span><span>Years</span><span>Total</span></div>';
  const rows = list
    .map((t) => {
      const years = t.years?.first || '-';
      return `<div class="mini-row"><span>${t.team}</span><span>${years}</span><span>${t.first}</span></div>`;
    })
    .join('');
  document.getElementById('championship-mini').innerHTML = `${header}${rows}`;
}

function parseYearList(text) {
  if (!text) return [];
  return String(text)
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
}

function renderCurrentChampion() {
  const seasons = state.data.trophies.flatMap((t) =>
    parseYearList(t.years?.first).map((year) => ({ team: t.team, year })),
  );
  const holder = document.getElementById('current-champion');

  if (!seasons.length) {
    holder.innerHTML = '<div class="small">No championship year data found.</div>';
    return;
  }

  const latestYear = Math.max(...seasons.map((s) => s.year));
  const champs = seasons.filter((s) => s.year === latestYear).map((s) => s.team);
  const displayChamps = champs.map((name) => (name === 'Nikki T.' ? `${name} 🏆` : name));
  const championPhoto =
    latestYear === 2025
      ? '<figure class="champion-photo-wrap"><img class="champion-photo" src="./images/nikki-2025-champion.JPG" alt="2025 Champion" loading="lazy" /></figure>'
      : '';
  holder.innerHTML = `<div class="champion-name">${displayChamps.join(', ')}</div><div class="small">Champion${champs.length > 1 ? 's' : ''} of the ${latestYear} season</div>${championPhoto}`;
}

function renderWinsTable() {
  const table = document.getElementById('wins-table');
  const legend = document.getElementById('wins-legend');
  const years = [...state.data.years].reverse();
  const rows = [...state.data.yearlyWins].sort((a, b) => b.wins.reduce((s, n) => s + n, 0) - a.wins.reduce((s, n) => s + n, 0));
  const valuesByYear = years.map((_, idx) => rows.map((r) => [...r.wins].reverse()[idx]));
  const rangeByYear = valuesByYear.map((vals) => ({ min: Math.min(...vals), max: Math.max(...vals) }));

  legend.innerHTML =
    '<span>Low</span><span class="heat-scale"></span><span>High</span><span class="small">(relative to each year)</span>';

  const head = `<thead><tr><th>Team</th>${years.map((y) => `<th>${y}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${rows
    .map((r) => {
      const winsDesc = [...r.wins].reverse();
      return `<tr><td>${r.team}</td>${winsDesc
        .map((w, i) => {
          if (w === 0) {
            return `<td style="background:transparent; color:#9aa8bb; font-weight:700">${w}</td>`;
          }
          const { min, max } = rangeByYear[i];
          const ratio = max === min ? 0.5 : (w - min) / (max - min);
          const hue = 355 - ratio * 225;
          const lightness = 17 + ratio * 24;
          const bg = `hsl(${hue.toFixed(1)} 68% ${lightness.toFixed(1)}%)`;
          const text = ratio > 0.55 ? '#08120b' : '#f4f7fb';
          return `<td style="background:${bg}; color:${text}; font-weight:700">${w}</td>`;
        })
        .join('')}</tr>`;
    })
    .join('')}</tbody>`;
  table.innerHTML = head + body;
}

function renderWinsBarChart() {
  const container = document.getElementById('wins-bar-chart');
  if (!container) return;

  const years = state.data.years || [];
  const yearIdx = new Map(years.map((y, i) => [y, i]));
  const rangeYears = state.winsMetric === 'last3Total' ? [2023, 2024, 2025] : [2020, 2021, 2022, 2023, 2024, 2025];

  const rows = state.data.yearlyWins
    .map((r) => ({
      team: r.team,
      total: rangeYears.reduce((sum, y) => sum + (r.wins[yearIdx.get(y)] || 0), 0),
    }))
    .sort((a, b) => b.total - a.total || a.team.localeCompare(b.team));

  renderHorizontalBarChart(
    container,
    rows.map((r) => ({ team: r.team, value: r.total })),
    'value',
    'count',
  );
}

function renderWinsLeaders() {
  const holder = document.getElementById('wins-leaders');
  if (!holder) return;

  const years = state.data.years || [];
  const yearIdx = new Map(years.map((y, i) => [y, i]));
  const totalSince2020 = state.data.yearlyWins
    .map((r) => ({
      team: r.team,
      total: [2020, 2021, 2022, 2023, 2024, 2025].reduce((sum, y) => sum + (r.wins[yearIdx.get(y)] || 0), 0),
    }))
    .sort((a, b) => b.total - a.total || a.team.localeCompare(b.team));
  const totalLast3 = state.data.yearlyWins
    .map((r) => ({
      team: r.team,
      total: [2023, 2024, 2025].reduce((sum, y) => sum + (r.wins[yearIdx.get(y)] || 0), 0),
    }))
    .sort((a, b) => b.total - a.total || a.team.localeCompare(b.team));

  const since2020Leader = totalSince2020[0];
  const last3Leader = totalLast3[0];
  const since2020Leaders = totalSince2020.filter((r) => r.total === since2020Leader?.total);
  const last3Leaders = totalLast3.filter((r) => r.total === last3Leader?.total);
  const formatColoredNames = (leaders) =>
    leaders.map((r) => `<span style="color:${teamColor(r.team)}">${r.team}</span>`).join(', ');
  const since2020Names = formatColoredNames(since2020Leaders);
  const last3Names = formatColoredNames(last3Leaders);
  holder.innerHTML =
    since2020Leader && last3Leader
      ? `<span class="leader-chip">Most Wins Since 2020: ${since2020Names} (${since2020Leader.total})</span><span class="leader-sep">|</span><span class="leader-chip">Most Wins Last 3 Years: ${last3Names} (${last3Leader.total})</span>`
      : '<span class="small">Wins leaders unavailable with current data.</span>';
}

function makeSvg(width, height) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  return svg;
}

function renderHorizontalBarChart(container, rows, valueKey, mode = 'count') {
  const width = Math.max(container.clientWidth - 20, 520);
  const rowH = 28;
  const height = Math.max(200, rows.length * rowH + 28);
  const m = { t: 14, r: 52, b: 12, l: 96 };
  const chartW = width - m.l - m.r;
  const maxV = Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0));
  const svg = makeSvg(width, height);

  rows.forEach((r, i) => {
    const y = m.t + i * rowH;
    const v = Number(r[valueKey]) || 0;
    const w = (v / maxV) * chartW;

    const team = document.createElementNS(svg.namespaceURI, 'text');
    team.setAttribute('x', 8);
    team.setAttribute('y', y + 14);
    team.setAttribute('fill', '#dbe5f2');
    team.setAttribute('font-size', '11');
    team.textContent = r.team;
    svg.appendChild(team);

    const rect = document.createElementNS(svg.namespaceURI, 'rect');
    rect.setAttribute('x', m.l);
    rect.setAttribute('y', y + 4);
    rect.setAttribute('width', Math.max(2, w));
    rect.setAttribute('height', 14);
    rect.setAttribute('rx', '4');
    rect.setAttribute('fill', teamColor(r.team));
    svg.appendChild(rect);

    const val = document.createElementNS(svg.namespaceURI, 'text');
    val.setAttribute('x', Math.min(width - m.r + 4, m.l + w + 6));
    val.setAttribute('y', y + 15);
    val.setAttribute('fill', '#dbe5f2');
    val.setAttribute('font-size', '10');
    val.textContent = mode === 'count' ? `${Math.round(v)}` : fmtNum(v, 1);
    svg.appendChild(val);
  });

  container.innerHTML = '';
  container.appendChild(svg);
}

function renderLineChart(containerId = 'line-chart') {
  const container = document.getElementById(containerId);
  if (!container) return;
  const isMobile = window.innerWidth <= 700;
  const width = Math.max(container.clientWidth - 20, 520);
  const height = isMobile ? 240 : 320;
  const m = isMobile ? { t: 12, r: 14, b: 28, l: 40 } : { t: 16, r: 18, b: 40, l: 48 };
  const chartW = width - m.l - m.r;
  const chartH = height - m.t - m.b;

  const years = state.data.years;
  const series = state.data.cumulativeWins.find((s) => s.team === state.selectedTeam) || state.data.cumulativeWins[0];
  const maxY = Math.max(...series.totals) + 5;

  const x = (i) => m.l + (i / (years.length - 1)) * chartW;
  const y = (v) => m.t + (1 - v / maxY) * chartH;

  const svg = makeSvg(width, height);

  for (let g = 0; g <= 5; g += 1) {
    const gy = m.t + (g / 5) * chartH;
    const line = document.createElementNS(svg.namespaceURI, 'line');
    line.setAttribute('x1', m.l);
    line.setAttribute('x2', width - m.r);
    line.setAttribute('y1', gy);
    line.setAttribute('y2', gy);
    line.setAttribute('stroke', '#2a3443');
    line.setAttribute('stroke-width', '1');
    svg.appendChild(line);

    const val = document.createElementNS(svg.namespaceURI, 'text');
    val.setAttribute('x', 8);
    val.setAttribute('y', gy + 4);
    val.setAttribute('fill', '#9aa8bb');
    val.setAttribute('font-size', '11');
    val.textContent = Math.round(maxY * (1 - g / 5));
    svg.appendChild(val);
  }

  let pathData = '';
  series.totals.forEach((v, i) => {
    pathData += `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)} `;
  });

  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', pathData.trim());
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', teamColor(series.team));
  path.setAttribute('stroke-width', '4');
  svg.appendChild(path);

  series.totals.forEach((v, i) => {
    const c = document.createElementNS(svg.namespaceURI, 'circle');
    c.setAttribute('cx', x(i));
    c.setAttribute('cy', y(v));
    c.setAttribute('r', 3.5);
    c.setAttribute('fill', teamColor(series.team));
    svg.appendChild(c);

    if (i % 2 === 0 || i === years.length - 1) {
      const tx = document.createElementNS(svg.namespaceURI, 'text');
      tx.setAttribute('x', x(i) - 12);
      tx.setAttribute('y', height - 12);
      tx.setAttribute('fill', '#9aa8bb');
      tx.setAttribute('font-size', '10');
      tx.textContent = years[i];
      svg.appendChild(tx);
    }
  });

  const label = document.createElementNS(svg.namespaceURI, 'text');
  label.setAttribute('x', m.l + 8);
  label.setAttribute('y', m.t + 16);
  label.setAttribute('fill', '#f4f7fb');
  label.setAttribute('font-size', '14');
  label.setAttribute('font-weight', '700');
  label.textContent = `${series.team} | ${series.totals[series.totals.length - 1]} wins`;
  svg.appendChild(label);

  container.innerHTML = '';
  container.appendChild(svg);
}

function initTeamSelects() {
  const teams = state.data.cumulativeWins.map((s) => s.team);
  state.selectedTeam = state.selectedTeam || teams[0];
  ['wins-team-select'].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = teams.map((t) => `<option value="${t}">${t}</option>`).join('');
    select.value = state.selectedTeam;
    select.onchange = () => {
      state.selectedTeam = select.value;
      ['wins-team-select'].forEach((otherId) => {
        const other = document.getElementById(otherId);
        if (other) other.value = state.selectedTeam;
      });
      renderLineChart('wins-line-chart');
    };
  });
}

function renderRollingChart() {
  const container = document.getElementById('rolling-chart');
  if (!container) return;
  const width = Math.max(container.clientWidth - 20, 650);
  const height = 340;
  const m = { t: 20, r: 18, b: 42, l: 48 };
  const chartW = width - m.l - m.r;
  const chartH = height - m.t - m.b;

  const years = state.data.years || [];
  if (years.length < 3) {
    container.innerHTML = '<div class="small">Not enough years for rolling window.</div>';
    return;
  }
  const fullRollingYears = years.slice(2);
  const firstShownYear = 2020;
  const startIdx = Math.max(0, fullRollingYears.findIndex((y) => y >= firstShownYear));
  const rollingYears = fullRollingYears.slice(startIdx);
  const seasonGames = 14;
  const series = state.data.yearlyWins.map((team) => ({
    team: team.team,
    values: team.wins
      .slice(2)
      .map((_, i) => (team.wins[i] + team.wins[i + 1] + team.wins[i + 2]) / (3 * seasonGames))
      .slice(startIdx),
  }));

  const x = (i) => m.l + (i / (rollingYears.length - 1 || 1)) * chartW;
  const y = (v) => m.t + (1 - v) * chartH;
  const svg = makeSvg(width, height);

  [0, 0.25, 0.5, 0.75, 1].forEach((tick) => {
    const gy = y(tick);
    const line = document.createElementNS(svg.namespaceURI, 'line');
    line.setAttribute('x1', m.l);
    line.setAttribute('x2', width - m.r);
    line.setAttribute('y1', gy);
    line.setAttribute('y2', gy);
    line.setAttribute('stroke', '#2a3443');
    line.setAttribute('stroke-width', '1');
    svg.appendChild(line);

    const lbl = document.createElementNS(svg.namespaceURI, 'text');
    lbl.setAttribute('x', 8);
    lbl.setAttribute('y', gy + 4);
    lbl.setAttribute('fill', '#9aa8bb');
    lbl.setAttribute('font-size', '11');
    lbl.textContent = `${Math.round(tick * 100)}%`;
    svg.appendChild(lbl);
  });

  series.forEach((s) => {
    let pathData = '';
    s.values.forEach((v, i) => {
      pathData += `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)} `;
    });
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', pathData.trim());
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', teamColor(s.team));
    path.setAttribute('stroke-width', '2.5');
    svg.appendChild(path);
  });

  rollingYears.forEach((yr, i) => {
    if (i % 2 !== 0 && i !== rollingYears.length - 1) return;
    const tx = document.createElementNS(svg.namespaceURI, 'text');
    tx.setAttribute('x', x(i) - 12);
    tx.setAttribute('y', height - 12);
    tx.setAttribute('fill', '#9aa8bb');
    tx.setAttribute('font-size', '10');
    tx.textContent = yr;
    svg.appendChild(tx);
  });

  const latest = [...series].sort((a, b) => b.values[b.values.length - 1] - a.values[a.values.length - 1]);
  latest.forEach((s, i) => {
    const ly = m.t + 12 + i * 14;
    const line = document.createElementNS(svg.namespaceURI, 'line');
    line.setAttribute('x1', width - m.r - 180);
    line.setAttribute('x2', width - m.r - 166);
    line.setAttribute('y1', ly - 4);
    line.setAttribute('y2', ly - 4);
    line.setAttribute('stroke', teamColor(s.team));
    line.setAttribute('stroke-width', '3');
    svg.appendChild(line);

    const txt = document.createElementNS(svg.namespaceURI, 'text');
    txt.setAttribute('x', width - m.r - 160);
    txt.setAttribute('y', ly);
    txt.setAttribute('fill', '#dbe5f2');
    txt.setAttribute('font-size', '11');
    txt.textContent = `${s.team} ${fmtPct(s.values[s.values.length - 1])}`;
    svg.appendChild(txt);
  });

  container.innerHTML = '';
  container.appendChild(svg);
}

function renderYoYChart() {
  const container = document.getElementById('yoy-chart');
  if (!container) return;
  const years = state.data.years || [];
  if (years.length < 2) {
    container.innerHTML = '<div class="small">Not enough years for year-over-year comparison.</div>';
    return;
  }

  const prevYear = years[years.length - 2];
  const currYear = years[years.length - 1];
  document.getElementById('yoy-title').textContent = `Year-over-Year Win Change (${currYear} vs ${prevYear})`;

  const rows = state.data.yearlyWins
    .map((r) => ({
      team: r.team,
      delta: r.wins[years.length - 1] - r.wins[years.length - 2],
    }))
    .sort((a, b) => b.delta - a.delta || a.team.localeCompare(b.team));

  const isMobile = window.innerWidth <= 700;
  const width = Math.max(container.clientWidth - 20, 650);
  const height = isMobile ? 240 : 300;
  const m = isMobile ? { t: 14, r: 14, b: 46, l: 40 } : { t: 20, r: 18, b: 80, l: 44 };
  const chartW = width - m.l - m.r;
  const chartH = height - m.t - m.b;
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.delta)));
  const svg = makeSvg(width, height);
  const barW = chartW / rows.length;
  const zeroY = m.t + chartH / 2;

  const zeroLine = document.createElementNS(svg.namespaceURI, 'line');
  zeroLine.setAttribute('x1', m.l);
  zeroLine.setAttribute('x2', width - m.r);
  zeroLine.setAttribute('y1', zeroY);
  zeroLine.setAttribute('y2', zeroY);
  zeroLine.setAttribute('stroke', '#6d7b8f');
  zeroLine.setAttribute('stroke-width', '1.2');
  svg.appendChild(zeroLine);

  rows.forEach((r, i) => {
    const h = (Math.abs(r.delta) / maxAbs) * (chartH / 2 - 8);
    const x = m.l + i * barW + 6;
    const y = r.delta >= 0 ? zeroY - h : zeroY;
    const rect = document.createElementNS(svg.namespaceURI, 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', Math.max(barW - 10, 10));
    rect.setAttribute('height', h);
    rect.setAttribute('fill', r.delta >= 0 ? '#38c172' : '#d64550');
    rect.setAttribute('rx', '3');
    svg.appendChild(rect);

    const tv = document.createElementNS(svg.namespaceURI, 'text');
    tv.setAttribute('x', x + 2);
    tv.setAttribute('y', r.delta >= 0 ? y - 3 : y + h + 12);
    tv.setAttribute('fill', '#dbe5f2');
    tv.setAttribute('font-size', '10');
    tv.textContent = r.delta > 0 ? `+${r.delta}` : `${r.delta}`;
    svg.appendChild(tv);

    const tl = document.createElementNS(svg.namespaceURI, 'text');
    tl.setAttribute('x', x);
    tl.setAttribute('y', height - 18);
    tl.setAttribute('fill', '#9aa8bb');
    tl.setAttribute('font-size', '10');
    tl.setAttribute('transform', `rotate(30 ${x} ${height - 18})`);
    tl.textContent = r.team;
    svg.appendChild(tl);
  });

  container.innerHTML = '';
  container.appendChild(svg);
}

function renderRankTable() {
  const table = document.getElementById('rank-table');
  if (!table) return;
  const allYears = state.data.years || [];
  const years = allYears.filter((y) => y >= 2022 && y <= 2025).sort((a, b) => b - a);
  const teams = state.data.yearlyWins.map((r) => r.team).sort((a, b) => a.localeCompare(b));
  const yearIndexMap = new Map(allYears.map((y, i) => [y, i]));

  const ranksByYear = years.map((_, idx) => {
    const sourceIdx = yearIndexMap.get(years[idx]);
    const ordered = [...state.data.yearlyWins]
      .map((r) => ({
        team: r.team,
        wins:
          (r.wins[sourceIdx] || 0) +
          (r.wins[sourceIdx - 1] || 0) +
          (r.wins[sourceIdx - 2] || 0),
      }))
      .sort((a, b) => b.wins - a.wins || a.team.localeCompare(b.team));
    const rankMap = {};
    ordered.forEach((r, i) => {
      rankMap[r.team] = i + 1;
    });
    return rankMap;
  });

  const head = `<thead><tr><th>Team</th><th>Change</th>${years.map((y) => `<th>${y}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${teams
    .map((team) => {
      const rowRanks = ranksByYear.map((m) => m[team]);
      const change = rowRanks[rowRanks.length - 1] - rowRanks[0];
      const changeText = change > 0 ? `+${change}` : `${change}`;
      const changeColor = change > 0 ? '#38c172' : change < 0 ? '#d64550' : '#9aa8bb';
      return `<tr><td>${team}</td><td style="color:${changeColor}; font-weight:700">${changeText}</td>${rowRanks.map((r) => `<td>${r}</td>`).join('')}</tr>`;
    })
    .join('')}</tbody>`;
  table.innerHTML = head + body;
}

function renderPointsRankTable() {
  const table = document.getElementById('rank-points-table');
  if (!table) return;
  const allYears = state.data.years || [];
  const years = allYears.filter((y) => y >= 2022 && y <= 2025).sort((a, b) => b - a);
  const teams = state.data.yearlyWins.map((r) => r.team).sort((a, b) => a.localeCompare(b));

  const pointsByTeamYear = {};
  state.data.points.forEach((p) => {
    const byYear = {};
    (p.byYear || []).forEach((entry) => {
      byYear[entry.year] = Number(entry.points) || 0;
    });
    pointsByTeamYear[p.team] = byYear;
  });

  const ranksByYear = years.map((year) => {
    const ordered = teams
      .map((team) => {
        const byYear = pointsByTeamYear[team] || {};
        const total = (byYear[year] || 0) + (byYear[year - 1] || 0) + (byYear[year - 2] || 0);
        return { team, total };
      })
      .sort((a, b) => b.total - a.total || a.team.localeCompare(b.team));

    const rankMap = {};
    ordered.forEach((r, i) => {
      rankMap[r.team] = i + 1;
    });
    return rankMap;
  });

  const head = `<thead><tr><th>Team</th><th>Change</th>${years.map((y) => `<th>${y}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${teams
    .map((team) => {
      const rowRanks = ranksByYear.map((m) => m[team] ?? teams.length);
      const change = rowRanks[rowRanks.length - 1] - rowRanks[0];
      const changeText = change > 0 ? `+${change}` : `${change}`;
      const changeColor = change > 0 ? '#38c172' : change < 0 ? '#d64550' : '#9aa8bb';
      return `<tr><td>${team}</td><td style="color:${changeColor}; font-weight:700">${changeText}</td>${rowRanks.map((r) => `<td>${r}</td>`).join('')}</tr>`;
    })
    .join('')}</tbody>`;
  table.innerHTML = head + body;
}

function renderPointsLeaders() {
  const holder = document.getElementById('points-leaders');
  if (!holder) return;

  const since2020 = state.data.points
    .map((p) => {
      const vals = (p.byYear || [])
        .filter((entry) => entry.year >= 2020)
        .map((entry) => Number(entry.points))
        .filter((v) => Number.isFinite(v));
      if (!vals.length) return null;
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      return { team: p.team, avg };
    })
    .filter(Boolean)
    .sort((a, b) => b.avg - a.avg);

  const last3 = state.data.points
    .map((p) => {
      const vals = [...(p.byYear || [])]
        .sort((a, b) => b.year - a.year)
        .slice(0, 3)
        .map((entry) => Number(entry.points))
        .filter((v) => Number.isFinite(v));
      if (vals.length < 3) return null;
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      return { team: p.team, avg };
    })
    .filter(Boolean)
    .sort((a, b) => b.avg - a.avg);

  const since2020Leader = since2020[0];
  const last3Leader = last3[0];
  const since2020Leaders = since2020.filter((r) => r.avg === since2020Leader?.avg);
  const last3Leaders = last3.filter((r) => r.avg === last3Leader?.avg);
  const formatColoredNames = (leaders) =>
    leaders.map((r) => `<span style="color:${teamColor(r.team)}">${r.team}</span>`).join(', ');
  const since2020Names = formatColoredNames(since2020Leaders);
  const last3Names = formatColoredNames(last3Leaders);
  holder.innerHTML =
    since2020Leader && last3Leader
      ? `<span class="leader-chip">Best Point Average Since 2020: ${since2020Names} (${fmtNum(since2020Leader.avg, 1)})</span><span class="leader-sep">|</span><span class="leader-chip">Best Point Average Last 3 Years: ${last3Names} (${fmtNum(last3Leader.avg, 1)})</span>`
      : '<span class="small">Best point-average leaders unavailable with current data.</span>';
}

function renderPointsChart() {
  const container = document.getElementById('bar-chart');
  if (!container) return;

  const valueForMetric = (r) => {
    if (state.pointsMetric === 'overallAvg') {
      const vals = (r.byYear || [])
        .filter((entry) => entry.year >= 2020 && entry.year <= 2025)
        .map((entry) => Number(entry.points))
        .filter((v) => Number.isFinite(v));
      if (!vals.length) return null;
      return vals.reduce((s, v) => s + v, 0) / vals.length;
    }
    return r[state.pointsMetric];
  };

  const rows = [...state.data.points]
    .map((r) => ({ ...r, metricValue: valueForMetric(r) }))
    .filter((r) => r.metricValue != null)
    .sort((a, b) => b.metricValue - a.metricValue);

  renderHorizontalBarChart(
    container,
    rows.map((r) => ({ team: r.team, value: r.metricValue })),
    'value',
    'decimal',
  );
}

function initMetricToggle() {
  document.querySelectorAll('.metric-toggle[data-metric]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.metric-toggle[data-metric]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.pointsMetric = btn.dataset.metric;
      renderPointsChart();
    });
  });
}

function initWinsToggle() {
  document.querySelectorAll('.wins-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wins-toggle').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.winsMetric = btn.dataset.winsMetric;
      renderWinsBarChart();
    });
  });
}

function renderTrophyChart() {
  const container = document.getElementById('trophy-chart');
  const isMobile = window.innerWidth <= 700;
  const width = Math.max(container.clientWidth - 20, 520);
  const height = isMobile ? 250 : 340;
  const m = isMobile ? { t: 12, r: 14, b: 44, l: 42 } : { t: 14, r: 18, b: 78, l: 52 };
  const chartW = width - m.l - m.r;
  const chartH = height - m.t - m.b;

  const metric = state.trophyMetric;
  const units = metric === 'weighted' ? { first: 3, second: 2, third: 1 } : { first: 1, second: 1, third: 1 };
  const rows = [...state.data.trophies].sort((a, b) =>
    metric === 'weighted' ? b.weighted - a.weighted : b.total - a.total,
  );
  const maxStack = Math.max(...rows.map((r) => (metric === 'weighted' ? r.weighted : r.total)));
  const barW = chartW / rows.length;

  const svg = makeSvg(width, height);
  const colors = { first: '#f2c14e', second: '#c0cad8', third: '#cd7f32' };

  rows.forEach((r, i) => {
    const x = m.l + i * barW + 8;
    const bw = Math.max(barW - 14, 10);
    let yBase = m.t + chartH;
    ['third', 'second', 'first'].forEach((k) => {
      const segmentValue = r[k] * units[k];
      const h = (segmentValue / maxStack) * chartH;
      if (!h) return;
      const rect = document.createElementNS(svg.namespaceURI, 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', yBase - h);
      rect.setAttribute('width', bw);
      rect.setAttribute('height', h);
      rect.setAttribute('fill', colors[k]);
      svg.appendChild(rect);
      yBase -= h;
    });

    const lbl = document.createElementNS(svg.namespaceURI, 'text');
    lbl.setAttribute('x', x);
    lbl.setAttribute('y', height - 18);
    lbl.setAttribute('fill', '#9aa8bb');
    lbl.setAttribute('font-size', '10');
    lbl.setAttribute('transform', `rotate(30 ${x} ${height - 18})`);
    lbl.textContent = r.team;
    svg.appendChild(lbl);
  });

  if (metric === 'weighted') {
    const isMobile = window.innerWidth <= 700;
    const modeLabel = document.createElementNS(svg.namespaceURI, 'text');
    modeLabel.setAttribute('x', width - m.r - 4);
    modeLabel.setAttribute('y', isMobile ? 12 : 14);
    modeLabel.setAttribute('text-anchor', 'end');
    modeLabel.setAttribute('fill', '#9aa8bb');
    modeLabel.setAttribute('font-size', isMobile ? '9' : '11');
    modeLabel.textContent = 'Weighted Methodology: 1st x3, 2nd x2, 3rd x1';
    svg.appendChild(modeLabel);
  }

  const legend = [
    ['1st', colors.first],
    ['2nd', colors.second],
    ['3rd', colors.third],
  ];
  legend.forEach(([t, c], i) => {
    const rect = document.createElementNS(svg.namespaceURI, 'rect');
    rect.setAttribute('x', width - m.r - 64);
    rect.setAttribute('y', m.t + 24 + i * 18);
    rect.setAttribute('width', 12);
    rect.setAttribute('height', 12);
    rect.setAttribute('fill', c);
    svg.appendChild(rect);

    const tx = document.createElementNS(svg.namespaceURI, 'text');
    tx.setAttribute('x', width - m.r - 46);
    tx.setAttribute('y', m.t + 34 + i * 18);
    tx.setAttribute('fill', '#e8edf6');
    tx.setAttribute('font-size', '11');
    tx.textContent = t;
    svg.appendChild(tx);
  });

  container.innerHTML = '';
  container.appendChild(svg);
}

function initTrophyToggle() {
  document.querySelectorAll('.trophy-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.trophy-toggle').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.trophyMetric = btn.dataset.trophyMetric;
      renderTrophyChart();
    });
  });
}

function renderTrophyTable() {
  const tbody = document.querySelector('#trophy-table tbody');
  tbody.innerHTML = [...state.data.trophies]
    .sort((a, b) => b.weighted - a.weighted)
    .map((r) => `<tr><td>${r.team}</td><td>${r.first}</td><td>${r.second}</td><td>${r.third}</td><td>${r.total}</td><td>${r.weighted}</td></tr>`)
    .join('');
}

function renderKeepers() {
  const data = state.keepers;
  if (!data) return;

  const table = document.getElementById('keepers-table');
  const rows = [...(data.keepers || [])].sort((a, b) => String(a.owner || '').localeCompare(String(b.owner || '')));
  const body = `<tbody>${rows
    .map((row) => `<tr><td class="keepers-cell keepers-owner" data-label="Owner">${row.owner}</td>${(row.values || [])
      .map((cell, idx) => {
        const cls = ['keepers-cell'];
        if (String(cell?.fill) === '10') cls.push('keepers-yellow');
        if (String(cell?.fill) === '7') cls.push('keepers-red');
        return `<td class="${cls.join(' ')}" data-label="Keeper ${idx + 1}">${cell?.value || '&nbsp;'}</td>`;
      })
      .join('')}</tr>`)
    .join('')}</tbody>`;
  table.innerHTML = body;

  const key = document.getElementById('keepers-key');
  if (key) {
    key.innerHTML = `
      <p><span class="keepers-swatch keepers-yellow-swatch"></span>Kept 2 consecutive years. Cannot be kept again by current team.</p>
      <p><span class="keepers-swatch keepers-red-swatch"></span>Kept 3 consecutive years after being traded. Must be returned to the draft or released into free agency.</p>
    `;
  }
}

function formatAmericanOdds(value) {
  return value == null ? 'TBD' : `${value > 0 ? '+' : ''}${Number(value).toLocaleString('en-US')}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function initStartingLineups() {
  const openButton = document.getElementById('starting-lineups-open');
  const dialog = document.getElementById('starting-lineups-dialog');
  const list = document.getElementById('starting-lineups-list');
  if (!state.startingLineups?.lineups?.length) return;
  const renderLineups = (team = null) => {
    const lineups = team ? state.startingLineups.lineups.filter((lineup) => lineup.team === team) : state.startingLineups.lineups;
    document.getElementById('starting-lineups-title').textContent = team || 'Week 1 Starting Offenses';
    list.innerHTML = lineups
      .map((lineup) => `<section class="starting-lineup"><h3>${escapeHtml(lineup.team)}</h3>${lineup.players.map((player) => `<div class="starting-lineup-player"><span>${escapeHtml(player.position)}</span><strong>${escapeHtml(player.name)}</strong></div>`).join('')}</section>`)
      .join('');
    dialog.showModal();
  };
  document.querySelectorAll('.roster-team-link').forEach((button) => button.addEventListener('click', () => renderLineups(button.dataset.team)));
  document.getElementById('starting-lineups-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
}

function impliedProbabilityFromAmericanOdds(odds) {
  const value = Number(odds);
  if (!Number.isFinite(value) || value === 0) return 0;
  return value > 0 ? 100 / (value + 100) : Math.abs(value) / (Math.abs(value) + 100);
}

function sortTeamsByOdds(teams, oddsByTeam) {
  return [...teams].sort(
    (a, b) =>
      impliedProbabilityFromAmericanOdds(oddsByTeam.get(b)?.americanOdds) -
        impliedProbabilityFromAmericanOdds(oddsByTeam.get(a)?.americanOdds) ||
      a.localeCompare(b),
  );
}

function populateFuturesSelect(select, teams, optional = false, oddsByTeam = new Map()) {
  if (!select) return;
  select.innerHTML = `${optional ? '<option value="">No second pick</option>' : '<option value="">Select a team</option>'}${teams
    .map((team) => `<option value="${team}">${team} (${formatAmericanOdds(oddsByTeam.get(team)?.americanOdds)})</option>`)
    .join('')}`;
}

function renderFutures(data, keeperTeams) {
  const comingSoon = Boolean(data.comingSoon);
  document.querySelector('.tab[data-tab="futures"]').innerHTML = comingSoon
    ? 'Sportsbook <span class="tab-coming-soon">(Coming Soon)</span>'
    : 'Sportsbook';
  document.getElementById('futures-coming-soon').hidden = !comingSoon;
  document.getElementById('futures-live-content').hidden = comingSoon;
  if (comingSoon) return;
  const odds = data.odds || [];
  const owners = data.owners || [];
  const isLocalPreview = window.location.protocol === 'file:';
  const isReady = data.marketStatus === 'open' && odds.length > 0 && !isLocalPreview;
  const status = document.getElementById('futures-status');
  const description = document.getElementById('futures-description');
  const tbody = document.querySelector('#futures-odds-table tbody');
  const form = document.getElementById('futures-form');
  const submit = document.getElementById('futures-submit');
  document.getElementById('futures-entry-block').hidden = data.marketStatus === 'locked';

  status.textContent = data.marketStatus === 'open' ? (odds.length ? 'Market Open' : 'Odds Pending') : 'Market Locked';
  status.className = `futures-status ${data.marketStatus === 'open' && odds.length ? 'open' : ''}`;
  description.textContent = isLocalPreview
    ? 'Local preview mode: odds are shown from the configuration file; submissions work on the hosted site.'
    : data.marketStatus === 'open' && !odds.length
    ? 'The market will open after the draft once preseason odds are posted.'
    : data.marketStatus === 'open'
      ? 'Let’s see who we collectively think has the best team before the season starts. Check out the market data below (click the header for more info) then scroll down to place your bet! Wagers are private until the market closes on Sunday, 9/13.'
      : 'The market is locked.';
  const sortedOdds = [...odds].sort(
    (a, b) =>
      impliedProbabilityFromAmericanOdds(b.americanOdds) - impliedProbabilityFromAmericanOdds(a.americanOdds) ||
      a.team.localeCompare(b.team),
  );
  tbody.innerHTML = odds.length
    ? sortedOdds.map((row) => `<tr><td><button class="roster-team-link" type="button" data-team="${escapeHtml(row.team)}">${escapeHtml(row.team)}</button></td><td>${fmtPct(row.yahooTitleChance)}</td><td>${fmtPct(row.probability)}</td><td>${formatAmericanOdds(row.americanOdds)}</td></tr>`).join('')
    : '<tr><td colspan="4" class="small">Preseason odds will be posted after the draft.</td></tr>';

  const ownerSelect = document.getElementById('futures-owner');
  if (ownerSelect && ownerSelect.options.length === 0) {
    ownerSelect.innerHTML = `<option value="">Select your name</option>${owners.map((owner) => `<option value="${owner}">${owner}</option>`).join('')}`;
  }
  const oddsByTeam = new Map(odds.map((row) => [row.team, row]));
  const teams = sortTeamsByOdds(keeperTeams.filter((team) => oddsByTeam.has(team)), oddsByTeam);
  populateFuturesSelect(document.getElementById('futures-team-1'), teams, false, oddsByTeam);
  populateFuturesSelect(document.getElementById('futures-team-2'), teams, false, oddsByTeam);
  const fieldsEnabled = data.marketStatus === 'open' && odds.length > 0;
  form.querySelectorAll('select, input').forEach((field) => (field.disabled = !fieldsEnabled));
  submit.disabled = !isReady;
  submit.textContent = isReady ? 'Submit Picks' : isLocalPreview ? 'Hosted Site Required' : data.marketStatus === 'open' ? 'Odds Pending' : 'Market Locked';

  const ledgerBlock = document.getElementById('futures-ledger-block');
  const handleBlock = document.getElementById('futures-handle-block');
  ledgerBlock.hidden = !data.publicWagersVisible;
  if (handleBlock) handleBlock.hidden = !data.publicWagersVisible;
  if (data.publicWagersVisible) {
    document.getElementById('futures-ledger-title').textContent = data.marketStatus === 'locked' ? 'Futures Picks' : 'Locked Futures Ledger';
    document.querySelector('#futures-ledger-table tbody').innerHTML = (data.wagers || [])
      .flatMap((wager) => (wager.picks || []).map((pick) => `<tr><td>${wager.owner}</td><td>${pick.team}</td><td>${pick.stake.toLocaleString()} credits</td><td>${formatAmericanOdds(pick.americanOdds)}</td></tr>`))
      .join('') || '<tr><td colspan="4" class="small">No futures were submitted.</td></tr>';

    const totalByTeam = new Map(odds.map((row) => [row.team, 0]));
    (data.wagers || []).forEach((wager) => {
      (wager.picks || []).forEach((pick) => totalByTeam.set(pick.team, (totalByTeam.get(pick.team) || 0) + Number(pick.stake || 0)));
    });
    const totals = [...totalByTeam.entries()]
      .map(([team, total]) => ({ team, total }))
      .sort((a, b) => b.total - a.total || a.team.localeCompare(b.team));
    const maxTotal = Math.max(1, ...totals.map((row) => row.total));
    const handleChart = document.getElementById('futures-handle-chart');
    if (handleChart) {
      handleChart.innerHTML = totals
        .map((row) => `<div class="futures-handle-row"><div class="futures-handle-label">${row.team} <span>${formatAmericanOdds(oddsByTeam.get(row.team)?.americanOdds)}</span></div><div class="futures-handle-track"><div class="futures-handle-bar" style="width:${(row.total / maxTotal) * 100}%"></div></div><div class="futures-handle-value">${row.total.toLocaleString()}</div></div>`)
        .join('');
    }
  }
}

function initFutures(data, keeperTeams) {
  renderFutures(data, keeperTeams);
  const form = document.getElementById('futures-form');
  const refreshEligibleTeams = () => {
    const owner = document.getElementById('futures-owner').value;
    const ownTeam = data.ownerTeams?.[owner];
    const eligibleTeams = keeperTeams.filter((team) => team !== ownTeam && (data.odds || []).some((odd) => odd.team === team));
    const oddsByTeam = new Map((data.odds || []).map((row) => [row.team, row]));
    const sortedTeams = sortTeamsByOdds(eligibleTeams, oddsByTeam);
    populateFuturesSelect(document.getElementById('futures-team-1'), sortedTeams, false, oddsByTeam);
    populateFuturesSelect(document.getElementById('futures-team-2'), sortedTeams, false, oddsByTeam);
  };
  document.getElementById('futures-owner').addEventListener('change', refreshEligibleTeams);
  const updateCreditMeter = () => {
    const firstStake = Number(document.getElementById('futures-stake-1').value || 0);
    const secondStake = Number(document.getElementById('futures-stake-2').value || 0);
    const used = firstStake + secondStake;
    const remaining = 1000 - used;
    const meter = document.getElementById('futures-credit-meter');
    meter.classList.toggle('over', remaining < 0);
    meter.classList.toggle('complete', remaining === 0);
    meter.innerHTML = `<strong>Credits used: ${used.toLocaleString()} / 1,000</strong><span>${remaining < 0 ? `${Math.abs(remaining).toLocaleString()} credits over the limit` : `${remaining.toLocaleString()} credits remaining`}</span>`;
  };
  document.getElementById('futures-stake-1').addEventListener('input', updateCreditMeter);
  document.getElementById('futures-stake-2').addEventListener('input', updateCreditMeter);
  updateCreditMeter();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const owner = document.getElementById('futures-owner').value;
    const firstTeam = document.getElementById('futures-team-1').value;
    const firstStake = Number(document.getElementById('futures-stake-1').value);
    const secondTeam = document.getElementById('futures-team-2').value;
    const secondStake = Number(document.getElementById('futures-stake-2').value || 0);
    const message = document.getElementById('futures-message');
    const setMessage = (text, type = 'error') => {
      message.textContent = text;
      message.className = `futures-message ${type}`;
    };
    if (!owner || !firstTeam || !firstStake) return;
    if (!secondTeam || !secondStake) { setMessage('Please select both picks and enter both stakes.'); return; }
    if (firstTeam === secondTeam) { setMessage('Your two picks must be different teams.'); return; }
    if (firstStake + secondStake !== 1000) { setMessage('Your two stakes must total exactly 1,000 credits.'); return; }
    const confirmed = window.confirm(
      `Submit futures picks for ${owner}?\n\n${firstTeam}: ${firstStake.toLocaleString()} credits\n${secondTeam}: ${secondStake.toLocaleString()} credits`,
    );
    if (!confirmed) return;
    try {
      const response = await fetch('./futures.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner, picks: [{ team: firstTeam, stake: firstStake }, { team: secondTeam, stake: secondStake }] }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your futures could not be saved.');
      setMessage(`✓ Picks saved for ${owner}.`, 'success');
    } catch (err) { setMessage(err.message || 'Your futures could not be saved.'); }
  });
}

function renderAll() {
  const years = state.data.years || [];
  if (years.length) {
    const title = `Cumulative Wins (${years[0]}-${years[years.length - 1]})`;
    document.getElementById('wins-trends-title').textContent = title;
    const rankYears = years.filter((y) => y >= 2022 && y <= 2025);
    const rankStart = rankYears[0] ?? years[0];
    const rankEnd = rankYears[rankYears.length - 1] ?? years[years.length - 1];
    document.getElementById('rank-title').textContent = `Rank of 3-Year Rolling Win Total (${rankStart}-${rankEnd})`;
    document.getElementById('rank-points-title').textContent = `Rank of 3-Year Rolling Point Total (${rankStart}-${rankEnd})`;
  }
  const pointsYears = [...new Set(state.data.points.flatMap((r) => (r.byYear || []).map((p) => p.year)))].sort((a, b) => a - b);
  document.getElementById('points-note').textContent = pointsYears.length
    ? `Note: includes data starting with the ${pointsYears[0]} season.`
    : 'Note: includes data starting with the N/A season.';
  renderPointsLeaders();
  renderCurrentChampion();
  renderAllTimeTable();
  renderChampionshipMini();
  renderTrophyMini();
  renderWinsLeaders();
  renderWinsBarChart();
  renderWinsTable();
  initTeamSelects();
  renderLineChart('wins-line-chart');
  renderYoYChart();
  renderRankTable();
  renderPointsRankTable();
  renderPointsChart();
  renderTrophyChart();
  renderTrophyTable();
  renderKeepers();
}

async function boot() {
  initTabs();
  initSportsbookOddsExplainer();
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  const res = await fetch('./data/league-data.json?v=20260228c', { cache: 'no-store' });
  state.data = await res.json();
  const keepersRes = await fetch('./data/keepers.json?v=20260809b', { cache: 'no-store' });
  state.keepers = await keepersRes.json();
  const lineupsRes = await fetch('./data/starting-lineups.json?v=20260904a', { cache: 'no-store' });
  state.startingLineups = await lineupsRes.json();
  const futuresSource = window.location.protocol === 'file:' ? './data/futures.json' : './futures.php';
  const futuresRes = await fetch(futuresSource, { cache: 'no-store' });
  const futures = await futuresRes.json();

  renderAll();
  initAllTimeEvents();
  initMetricToggle();
  initWinsToggle();
  initTrophyToggle();
  const winOwners = state.data.yearlyWins.map((row) => row.team);
  const keeperTeams = state.keepers.keepers.map((row) => row.owner);
  initFutures({ ...futures, owners: winOwners }, keeperTeams);
  initStartingLineups();

  window.addEventListener('resize', () => {
    renderWinsBarChart();
    renderLineChart('wins-line-chart');
    renderYoYChart();
    renderPointsChart();
    renderTrophyChart();
  });
}

boot().catch((err) => {
  document.body.innerHTML = `<main style="padding:2rem;color:#fff">Failed to load dashboard data.<br><pre>${String(err)}</pre></main>`;
});

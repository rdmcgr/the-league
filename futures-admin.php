<?php
session_start();
$passwordHash = '$2y$10$8pRuUWq2EWe9Ijeq3OAPqunlqkN4k0Hm27SpIwUGDhdeQ86yWNaYq';
$configFile = __DIR__ . '/data/futures.json';
$runtimeFile = __DIR__ . '/data/futures-runtime.json';
function read_admin_json($file, $fallback) { if (!file_exists($file)) return $fallback; $data = json_decode(file_get_contents($file), true); return is_array($data) ? array_merge($fallback, $data) : $fallback; }
function esc($value) { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); }
$config = read_admin_json($configFile, ['marketStatus' => 'open', 'publicWagersVisible' => false, 'odds' => []]);
$runtime = read_admin_json($runtimeFile, ['comingSoon' => (bool) ($config['comingSoon'] ?? false), 'marketStatus' => $config['marketStatus'], 'publicWagersVisible' => $config['publicWagersVisible'], 'wagers' => []]);
$error = '';
if (isset($_GET['logout'])) { unset($_SESSION['futures_admin']); header('Location: futures-admin.php'); exit; }
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) { if (password_verify((string) $_POST['password'], $passwordHash)) { $_SESSION['futures_admin'] = true; header('Location: futures-admin.php'); exit; } $error = 'Incorrect password.'; }
if (!empty($_SESSION['futures_admin']) && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['market_status'])) {
  $runtime['comingSoon'] = ($_POST['tab_mode'] ?? 'live') === 'coming-soon';
  $runtime['marketStatus'] = $_POST['market_status'] === 'locked' ? 'locked' : 'open';
  $runtime['publicWagersVisible'] = isset($_POST['public_wagers_visible']);
  file_put_contents($runtimeFile, json_encode($runtime, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
  header('Location: futures-admin.php'); exit;
}
if (!empty($_SESSION['futures_admin']) && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['remove_pick_owner'], $_POST['remove_pick_team'])) {
  $owner = trim((string) $_POST['remove_pick_owner']);
  $team = trim((string) $_POST['remove_pick_team']);
  foreach ($runtime['wagers'] as &$wager) {
    if (($wager['owner'] ?? '') === $owner) {
      $wager['picks'] = array_values(array_filter($wager['picks'] ?? [], fn($pick) => ($pick['team'] ?? '') !== $team));
    }
  }
  unset($wager);
  $runtime['wagers'] = array_values(array_filter($runtime['wagers'], fn($wager) => count($wager['picks'] ?? []) > 0));
  file_put_contents($runtimeFile, json_encode($runtime, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
  header('Location: futures-admin.php'); exit;
}
$loggedIn = !empty($_SESSION['futures_admin']);
?>
<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Futures Admin | The League</title><link rel="icon" href="./images/2026-league-logo.png?v=2026" type="image/png" /><link rel="stylesheet" href="./styles.css?v=20260904c" /></head><body><div class="bg-noise" aria-hidden="true"></div><header class="hero"><div class="hero-inner"><img class="hero-belt" src="./images/the-league-belt.png" alt="The League Championship Belt" /><div><div class="hero-topline">Shockafella Fantasy Football</div><h1>Futures Admin</h1></div></div></header><main>
<?php if (!$loggedIn): ?>
<section class="card block"><div class="block-header"><h2>Admin Login</h2></div><?php if ($error): ?><p class="small poll-message"><?= esc($error) ?></p><?php endif; ?><form method="post" class="poll-form poll-admin-login"><label class="poll-field"><span>Password</span><input type="password" name="password" autocomplete="current-password" required /></label><button type="submit" class="poll-submit">Enter</button></form></section>
<?php else: ?>
<section class="card block"><div class="block-header"><h2>Market Controls</h2><a class="admin-link" href="?logout=1">Logout</a></div><form method="post" class="poll-form"><label class="poll-field"><span>Live Site Tab</span><select name="tab_mode"><option value="live" <?= !$runtime['comingSoon'] ? 'selected' : '' ?>>Sportsbook — live market</option><option value="coming-soon" <?= $runtime['comingSoon'] ? 'selected' : '' ?>>Sportsbook (Coming Soon) — teaser</option></select></label><label class="poll-field"><span>Market Status</span><select name="market_status"><option value="open" <?= $runtime['marketStatus'] === 'open' ? 'selected' : '' ?>>Open — accepts submissions</option><option value="locked" <?= $runtime['marketStatus'] === 'locked' ? 'selected' : '' ?>>Locked — no changes</option></select></label><label class="inline-choice"><input type="checkbox" name="public_wagers_visible" <?= $runtime['publicWagersVisible'] ? 'checked' : '' ?> /> Publicly display wagers on the Sportsbook tab</label><button class="poll-submit" type="submit">Save Market Settings</button></form><p class="small">Use the teaser while the market is private; switch back to the live tab whenever you are ready to accept wagers.</p></section>
<?php
  $teamTotals = [];
  $teamOdds = [];
  foreach ($config['odds'] as $odd) { $teamTotals[$odd['team']] = 0; $teamOdds[$odd['team']] = $odd['americanOdds']; }
  foreach ($runtime['wagers'] as $wager) foreach (($wager['picks'] ?? []) as $pick) $teamTotals[$pick['team']] = ($teamTotals[$pick['team']] ?? 0) + (int) ($pick['stake'] ?? 0);
  arsort($teamTotals);
  $maxTeamTotal = max(1, ...array_values($teamTotals ?: [1]));
?>
<section class="card block futures-entry-block"><div class="block-header"><h2>Wagers by Team</h2></div><div class="futures-handle-chart"><?php foreach ($teamTotals as $team => $total): $teamOdd = $teamOdds[$team] ?? null; ?><div class="futures-handle-row"><div class="futures-handle-label"><?= esc($team) ?> <span><?= esc($teamOdd !== null ? ($teamOdd > 0 ? '+' : '') . $teamOdd : '') ?></span></div><div class="futures-handle-track"><div class="futures-handle-bar" style="width: <?= esc(($total / $maxTeamTotal) * 100) ?>%"></div></div><div class="futures-handle-value"><?= esc(number_format($total)) ?></div></div><?php endforeach; ?><?php if (!$teamTotals): ?><p class="small">No teams available yet.</p><?php endif; ?></div></section>
<section class="card block futures-entry-block"><div class="block-header"><h2>Submitted Wagers (Private)</h2></div><div class="table-wrap"><table><thead><tr><th>Owner</th><th>Pick</th><th>Stake</th><th>Locked Odds</th><th></th></tr></thead><tbody><?php foreach ($runtime['wagers'] as $wager): foreach (($wager['picks'] ?? []) as $pick): ?><tr><td><?= esc($wager['owner']) ?></td><td><?= esc($pick['team']) ?></td><td><?= esc($pick['stake']) ?> credits</td><td>+<?= esc($pick['americanOdds']) ?></td><td><form method="post" onsubmit="return confirm('Remove this pick?');"><input type="hidden" name="remove_pick_owner" value="<?= esc($wager['owner']) ?>" /><input type="hidden" name="remove_pick_team" value="<?= esc($pick['team']) ?>" /><button class="admin-remove" type="submit">Remove</button></form></td></tr><?php endforeach; endforeach; ?><?php if (!$runtime['wagers']): ?><tr><td colspan="5" class="small">No futures submitted yet.</td></tr><?php endif; ?></tbody></table></div><p class="small">Odds live in <code>data/futures.json</code>. Live wagers and market settings are stored separately and are preserved during future deployments.</p></section>
<?php endif; ?></main></body></html>

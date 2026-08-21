<?php
session_start();
$passwordHash = '$2y$10$8pRuUWq2EWe9Ijeq3OAPqunlqkN4k0Hm27SpIwUGDhdeQ86yWNaYq';
$configFile = __DIR__ . '/data/futures.json';
$runtimeFile = __DIR__ . '/data/futures-runtime.json';
function read_admin_json($file, $fallback) { if (!file_exists($file)) return $fallback; $data = json_decode(file_get_contents($file), true); return is_array($data) ? array_merge($fallback, $data) : $fallback; }
function esc($value) { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); }
$config = read_admin_json($configFile, ['marketStatus' => 'open', 'publicWagersVisible' => false, 'odds' => []]);
$runtime = read_admin_json($runtimeFile, ['marketStatus' => $config['marketStatus'], 'publicWagersVisible' => $config['publicWagersVisible'], 'wagers' => []]);
$error = '';
if (isset($_GET['logout'])) { unset($_SESSION['futures_admin']); header('Location: futures-admin.php'); exit; }
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) { if (password_verify((string) $_POST['password'], $passwordHash)) { $_SESSION['futures_admin'] = true; header('Location: futures-admin.php'); exit; } $error = 'Incorrect password.'; }
if (!empty($_SESSION['futures_admin']) && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['market_status'])) {
  $runtime['marketStatus'] = $_POST['market_status'] === 'locked' ? 'locked' : 'open';
  $runtime['publicWagersVisible'] = isset($_POST['public_wagers_visible']);
  file_put_contents($runtimeFile, json_encode($runtime, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
  header('Location: futures-admin.php'); exit;
}
$loggedIn = !empty($_SESSION['futures_admin']);
?>
<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Futures Admin | The League</title><link rel="stylesheet" href="./styles.css?v=20260821a" /></head><body><div class="bg-noise" aria-hidden="true"></div><header class="hero"><div class="hero-inner"><img class="hero-belt" src="./images/the-league-belt.png" alt="The League Championship Belt" /><div><div class="hero-topline">Shockafella Fantasy Football</div><h1>Futures Admin</h1></div></div></header><main>
<?php if (!$loggedIn): ?>
<section class="card block"><div class="block-header"><h2>Admin Login</h2></div><?php if ($error): ?><p class="small poll-message"><?= esc($error) ?></p><?php endif; ?><form method="post" class="poll-form poll-admin-login"><label class="poll-field"><span>Password</span><input type="password" name="password" autocomplete="current-password" required /></label><button type="submit" class="poll-submit">Enter</button></form></section>
<?php else: ?>
<section class="card block"><div class="block-header"><h2>Market Controls</h2><a class="admin-link" href="?logout=1">Logout</a></div><form method="post" class="poll-form"><label class="poll-field"><span>Market Status</span><select name="market_status"><option value="open" <?= $runtime['marketStatus'] === 'open' ? 'selected' : '' ?>>Open — accepts submissions</option><option value="locked" <?= $runtime['marketStatus'] === 'locked' ? 'selected' : '' ?>>Locked — no changes</option></select></label><label class="inline-choice"><input type="checkbox" name="public_wagers_visible" <?= $runtime['publicWagersVisible'] ? 'checked' : '' ?> /> Publicly display wagers on the Futures tab</label><button class="poll-submit" type="submit">Save Market Settings</button></form><p class="small">Keep wagers hidden while the market is open. Once locked, check the display option to reveal the ledger.</p></section>
<section class="card block futures-entry-block"><div class="block-header"><h2>Submitted Wagers (Private)</h2></div><div class="table-wrap"><table><thead><tr><th>Owner</th><th>Pick</th><th>Stake</th><th>Locked Odds</th></tr></thead><tbody><?php foreach ($runtime['wagers'] as $wager): foreach (($wager['picks'] ?? []) as $pick): ?><tr><td><?= esc($wager['owner']) ?></td><td><?= esc($pick['team']) ?></td><td><?= esc($pick['stake']) ?> credits</td><td>+<?= esc($pick['americanOdds']) ?></td></tr><?php endforeach; endforeach; ?><?php if (!$runtime['wagers']): ?><tr><td colspan="4" class="small">No futures submitted yet.</td></tr><?php endif; ?></tbody></table></div><p class="small">Odds live in <code>data/futures.json</code>. Live wagers and market settings are stored separately and are preserved during future deployments.</p></section>
<?php endif; ?></main></body></html>

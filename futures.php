<?php
header('Content-Type: application/json; charset=utf-8');

$configFile = __DIR__ . '/data/futures.json';
$runtimeFile = __DIR__ . '/data/futures-runtime.json';

function read_json_file($file, $fallback) {
  if (!file_exists($file)) return $fallback;
  $data = json_decode(file_get_contents($file), true);
  return is_array($data) ? array_merge($fallback, $data) : $fallback;
}
function write_json_file($file, $data) {
  file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

$config = read_json_file($configFile, ['marketStatus' => 'open', 'publicWagersVisible' => false, 'owners' => [], 'odds' => []]);
$runtimeDefaults = ['marketStatus' => $config['marketStatus'], 'publicWagersVisible' => $config['publicWagersVisible'], 'wagers' => []];
$runtime = read_json_file($runtimeFile, $runtimeDefaults);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $response = ['comingSoon' => (bool) ($config['comingSoon'] ?? false), 'marketStatus' => $runtime['marketStatus'], 'publicWagersVisible' => (bool) $runtime['publicWagersVisible'], 'owners' => $config['owners'], 'odds' => $config['odds']];
  if ($runtime['publicWagersVisible']) $response['wagers'] = $runtime['wagers'];
  echo json_encode($response, JSON_UNESCAPED_SLASHES);
  exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit;
}
if ($runtime['marketStatus'] !== 'open' || count($config['odds']) === 0) {
  http_response_code(403); echo json_encode(['error' => 'The futures market is not currently open.']); exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$owner = trim($input['owner'] ?? '');
$picks = $input['picks'] ?? [];
if (!in_array($owner, $config['owners'], true) || !is_array($picks) || count($picks) !== 2) {
  http_response_code(400); echo json_encode(['error' => 'Please select an owner and exactly two valid picks.']); exit;
}
$oddsByTeam = [];
foreach ($config['odds'] as $row) $oddsByTeam[$row['team'] ?? ''] = $row;
$cleanPicks = []; $teams = []; $totalStake = 0;
foreach ($picks as $pick) {
  $team = trim($pick['team'] ?? ''); $stake = $pick['stake'] ?? null;
  if (!isset($oddsByTeam[$team]) || !is_numeric($stake) || (int) $stake < 50 || (int) $stake > 1000 || ((int) $stake % 50 !== 0) || in_array($team, $teams, true)) {
    http_response_code(400); echo json_encode(['error' => 'Picks must be different listed teams with stakes in 50-credit increments.']); exit;
  }
  $stake = (int) $stake; $teams[] = $team; $totalStake += $stake;
  // Store the odds at submission time so future board changes never alter this wager.
  $cleanPicks[] = ['team' => $team, 'stake' => $stake, 'americanOdds' => $oddsByTeam[$team]['americanOdds']];
}
if ($totalStake !== 1000) { http_response_code(400); echo json_encode(['error' => 'Total stakes must equal exactly 1,000 credits.']); exit; }
$runtime['wagers'] = array_values(array_filter($runtime['wagers'], fn($entry) => ($entry['owner'] ?? '') !== $owner));
$runtime['wagers'][] = ['owner' => $owner, 'picks' => $cleanPicks];
write_json_file($runtimeFile, $runtime);
echo json_encode(['ok' => true]);

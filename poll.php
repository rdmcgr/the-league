<?php
header('Content-Type: application/json; charset=utf-8');

$storeDir = __DIR__ . '/data';
$storeFile = $storeDir . '/poll-votes.json';

if (!file_exists($storeDir)) {
  mkdir($storeDir, 0775, true);
}

if (!file_exists($storeFile)) {
  file_put_contents($storeFile, json_encode(['votes' => [], 'totals' => ['band' => [], 'availability' => []]], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

$bandChoices = ['Yes', 'No'];
$availabilityChoices = [
  'Wed, 8/26 @ 6pm',
  'Thurs, 8/27 @ 6pm',
  'Thurs, 9/3 @ 6pm',
  'Mon, 9/7 @ 6pm (Labor Day)',
  'Tues, 9/8 @ 6pm',
];

function read_store($storeFile) {
  $raw = file_get_contents($storeFile);
  $data = json_decode($raw, true);
  if (!is_array($data)) {
    $data = ['votes' => [], 'totals' => ['band' => [], 'availability' => []]];
  }
  if (!isset($data['votes']) || !is_array($data['votes'])) $data['votes'] = [];
  if (!isset($data['totals']) || !is_array($data['totals'])) $data['totals'] = [];
  if (!isset($data['totals']['band']) || !is_array($data['totals']['band'])) $data['totals']['band'] = [];
  if (!isset($data['totals']['availability']) || !is_array($data['totals']['availability'])) $data['totals']['availability'] = [];
  return $data;
}

function write_store($storeFile, $data) {
  file_put_contents($storeFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function norm_name($name) {
  return strtolower(trim($name));
}

function normalize_choices($choices) {
  if (!is_array($choices)) return [];
  return array_values(array_unique(array_filter(array_map('trim', $choices), fn($v) => $v !== '')));
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $data = read_store($storeFile);
  echo json_encode(['totals' => $data['totals']], JSON_UNESCAPED_SLASHES);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
  exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$name = trim($input['name'] ?? '');
$bandAnswer = trim($input['bandAnswer'] ?? '');
$availability = normalize_choices($input['availability'] ?? []);

if ($name === '' || !in_array($bandAnswer, $bandChoices, true) || count($availability) === 0) {
  http_response_code(400);
  echo json_encode(['error' => 'Please provide a name, answer the band question, and select at least one draft time.']);
  exit;
}

foreach ($availability as $choice) {
  if (!in_array($choice, $availabilityChoices, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Please select valid draft time options.']);
    exit;
  }
}

$data = read_store($storeFile);
$key = norm_name($name);

if (isset($data['votes'][$key])) {
  $previous = $data['votes'][$key];
  if (isset($previous['band']) && isset($data['totals']['band'][$previous['band']])) {
    $data['totals']['band'][$previous['band']] -= 1;
    if ($data['totals']['band'][$previous['band']] <= 0) unset($data['totals']['band'][$previous['band']]);
  }
  if (isset($previous['availability']) && is_array($previous['availability'])) {
    foreach ($previous['availability'] as $choice) {
      if (isset($data['totals']['availability'][$choice])) {
        $data['totals']['availability'][$choice] -= 1;
        if ($data['totals']['availability'][$choice] <= 0) unset($data['totals']['availability'][$choice]);
      }
    }
  }
}

$data['votes'][$key] = [
  'name' => $name,
  'band' => $bandAnswer,
  'availability' => $availability,
];

if (!isset($data['totals']['band'][$bandAnswer])) {
  $data['totals']['band'][$bandAnswer] = 0;
}
$data['totals']['band'][$bandAnswer] += 1;

foreach ($availability as $choice) {
  if (!isset($data['totals']['availability'][$choice])) {
    $data['totals']['availability'][$choice] = 0;
  }
  $data['totals']['availability'][$choice] += 1;
}

write_store($storeFile, $data);

echo json_encode(['totals' => $data['totals']], JSON_UNESCAPED_SLASHES);

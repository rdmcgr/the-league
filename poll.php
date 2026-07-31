<?php
header('Content-Type: application/json; charset=utf-8');

$storeDir = __DIR__ . '/data';
$storeFile = $storeDir . '/poll-votes.json';

if (!file_exists($storeDir)) {
  mkdir($storeDir, 0775, true);
}

if (!file_exists($storeFile)) {
  file_put_contents($storeFile, json_encode(['votes' => [], 'totals' => new stdClass()], JSON_PRETTY_PRINT));
}

$stats = null;

function read_store($storeFile) {
  $raw = file_get_contents($storeFile);
  $data = json_decode($raw, true);
  if (!is_array($data)) {
    $data = ['votes' => [], 'totals' => []];
  }
  if (!isset($data['votes']) || !is_array($data['votes'])) $data['votes'] = [];
  if (!isset($data['totals']) || !is_array($data['totals'])) $data['totals'] = [];
  return $data;
}

function write_store($storeFile, $data) {
  file_put_contents($storeFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
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
$vote = trim($input['vote'] ?? '');
$allowed = ['Yes', 'No'];

if ($name === '' || $vote === '' || !in_array($vote, $allowed, true)) {
  http_response_code(400);
  echo json_encode(['error' => 'Please provide a name and a valid vote.']);
  exit;
}

$data = read_store($storeFile);
$key = strtolower($name);

if (isset($data['votes'][$key])) {
  $previous = $data['votes'][$key];
  if (isset($data['totals'][$previous])) {
    $data['totals'][$previous] -= 1;
    if ($data['totals'][$previous] <= 0) unset($data['totals'][$previous]);
  }
}

$data['votes'][$key] = $vote;
if (!isset($data['totals'][$vote])) {
  $data['totals'][$vote] = 0;
}
$data['totals'][$vote] += 1;

write_store($storeFile, $data);

echo json_encode(['totals' => $data['totals']], JSON_UNESCAPED_SLASHES);

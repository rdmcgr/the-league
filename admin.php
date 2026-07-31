<?php
session_start();

$password = 'moore';
$storeFile = __DIR__ . '/data/poll-votes.json';
$data = ['votes' => [], 'totals' => ['band' => [], 'availability' => []]];

if (file_exists($storeFile)) {
  $raw = file_get_contents($storeFile);
  $decoded = json_decode($raw, true);
  if (is_array($decoded)) {
    if (isset($decoded['votes']) && is_array($decoded['votes'])) $data['votes'] = $decoded['votes'];
    if (isset($decoded['totals']) && is_array($decoded['totals'])) {
      if (isset($decoded['totals']['band']) && is_array($decoded['totals']['band'])) $data['totals']['band'] = $decoded['totals']['band'];
      if (isset($decoded['totals']['availability']) && is_array($decoded['totals']['availability'])) $data['totals']['availability'] = $decoded['totals']['availability'];
    }
  }
}

$loggedIn = !empty($_SESSION['poll_admin']);
$error = '';

if (isset($_GET['logout'])) {
  unset($_SESSION['poll_admin']);
  header('Location: admin.php');
  exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
  if (hash_equals($password, (string) $_POST['password'])) {
    $_SESSION['poll_admin'] = true;
    header('Location: admin.php');
    exit;
  }
  $error = 'Incorrect password.';
}

$loggedIn = !empty($_SESSION['poll_admin']);

if ($loggedIn && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['remove_name'])) {
  $removeName = strtolower(trim((string) $_POST['remove_name']));
  if ($removeName !== '' && isset($data['votes'][$removeName])) {
    $previous = $data['votes'][$removeName];
    unset($data['votes'][$removeName]);

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

    file_put_contents($storeFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
  }
  header('Location: admin.php');
  exit;
}

if ($loggedIn && isset($_GET['export']) && $_GET['export'] === 'csv') {
  $filename = 'poll-results-' . date('Y-m-d') . '.csv';
  header('Content-Type: text/csv; charset=utf-8');
  header('Content-Disposition: attachment; filename="' . $filename . '"');
  $out = fopen('php://output', 'w');
  fputcsv($out, ['Name', 'Band Answer', 'Availability']);
  ksort($data['votes']);
  foreach ($data['votes'] as $entry) {
    fputcsv($out, [
      $entry['name'] ?? '',
      $entry['band'] ?? '',
      isset($entry['availability']) && is_array($entry['availability']) ? implode('; ', $entry['availability']) : '',
    ]);
  }
  fclose($out);
  exit;
}

if ($loggedIn) {
  arsort($data['totals']['availability']);
  arsort($data['totals']['band']);
  ksort($data['votes']);
}

function esc($value) {
  return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function max_count($values) {
  $nums = array_values($values);
  return max(1, ...($nums ?: [1]));
}
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Poll Admin | The League</title>
    <link rel="stylesheet" href="./styles.css?v=20260228h" />
  </head>
  <body>
    <div class="bg-noise" aria-hidden="true"></div>
    <header class="hero">
      <div class="hero-inner">
        <img class="hero-belt" src="./images/the-league-belt.png" alt="The League Championship Belt" />
        <div>
          <div class="hero-topline">Shockafella Fantasy Football</div>
          <h1>Poll Admin</h1>
        </div>
      </div>
    </header>

    <main>
      <?php if (!$loggedIn): ?>
        <section class="card block">
          <div class="block-header">
            <h2>Admin Login</h2>
          </div>
          <?php if ($error): ?>
            <p class="small poll-message"><?= esc($error) ?></p>
          <?php endif; ?>
          <form method="post" class="poll-form poll-admin-login">
            <label class="poll-field">
              <span>Password</span>
              <input type="password" name="password" autocomplete="current-password" required />
            </label>
            <button type="submit" class="poll-submit">Enter</button>
          </form>
        </section>
      <?php else: ?>
        <section class="card block">
          <div class="block-header">
            <h2>Draft Time Availability</h2>
            <div class="admin-actions">
              <a class="admin-link" href="?export=csv">Export CSV</a>
              <a class="admin-link" href="?logout=1">Logout</a>
            </div>
          </div>
          <?php $availabilityMax = max_count($data['totals']['availability']); ?>
          <div class="admin-chart">
            <?php foreach ($data['totals']['availability'] as $choice => $count): ?>
              <?php $pct = round(($count / $availabilityMax) * 100); ?>
              <div class="admin-bar-row">
                <div class="admin-bar-label"><?= esc($choice) ?></div>
                <div class="admin-bar-track">
                  <div class="admin-bar-fill" style="width: <?= esc($pct) ?>%;"></div>
                </div>
                <div class="admin-bar-count"><?= esc($count) ?></div>
              </div>
            <?php endforeach; ?>
            <?php if (!$data['totals']['availability']): ?>
              <p class="small">No availability votes yet.</p>
            <?php endif; ?>
          </div>
        </section>

        <section class="card block" style="margin-top: 0.8rem;">
          <div class="block-header">
            <h2>Band Question</h2>
          </div>
          <?php $bandMax = max_count($data['totals']['band']); ?>
          <div class="admin-chart">
            <?php foreach ($data['totals']['band'] as $choice => $count): ?>
              <?php $pct = round(($count / $bandMax) * 100); ?>
              <div class="admin-bar-row">
                <div class="admin-bar-label"><?= esc($choice) ?></div>
                <div class="admin-bar-track">
                  <div class="admin-bar-fill" style="width: <?= esc($pct) ?>%;"></div>
                </div>
                <div class="admin-bar-count"><?= esc($count) ?></div>
              </div>
            <?php endforeach; ?>
            <?php if (!$data['totals']['band']): ?>
              <p class="small">No band answers yet.</p>
            <?php endif; ?>
          </div>
        </section>

        <section class="card block" style="margin-top: 0.8rem;">
          <div class="block-header">
            <h2>Votes By Name</h2>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Band Answer</th>
                  <th>Availability</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <?php foreach ($data['votes'] as $key => $entry): ?>
                  <tr>
                    <td><?= esc($entry['name'] ?? $key) ?></td>
                    <td><?= esc($entry['band'] ?? '') ?></td>
                    <td><?= esc(implode(', ', $entry['availability'] ?? [])) ?></td>
                    <td>
                      <form method="post" onsubmit="return confirm('Remove <?= esc($entry['name'] ?? $key) ?>\\'s vote?');">
                        <input type="hidden" name="remove_name" value="<?= esc($entry['name'] ?? $key) ?>" />
                        <button type="submit" class="poll-submit" style="padding: 0.45rem 0.7rem; font-size: 0.82rem;">Remove</button>
                      </form>
                    </td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
          </div>
        </section>
      <?php endif; ?>
    </main>
  </body>
</html>

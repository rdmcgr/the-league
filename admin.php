<?php
session_start();

$password = 'moore';
$storeFile = __DIR__ . '/data/poll-votes.json';
$data = ['votes' => [], 'totals' => []];

if (file_exists($storeFile)) {
  $raw = file_get_contents($storeFile);
  $decoded = json_decode($raw, true);
  if (is_array($decoded)) {
    if (isset($decoded['votes']) && is_array($decoded['votes'])) {
      $data['votes'] = $decoded['votes'];
    }
    if (isset($decoded['totals']) && is_array($decoded['totals'])) {
      $data['totals'] = $decoded['totals'];
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
  $removeName = trim((string) $_POST['remove_name']);
  if ($removeName !== '' && isset($data['votes'][$removeName])) {
    $previous = $data['votes'][$removeName];
    unset($data['votes'][$removeName]);
    if (isset($data['totals'][$previous])) {
      $data['totals'][$previous] -= 1;
      if ($data['totals'][$previous] <= 0) {
        unset($data['totals'][$previous]);
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
  fputcsv($out, ['Name', 'Vote']);
  ksort($data['votes']);
  foreach ($data['votes'] as $name => $vote) {
    fputcsv($out, [$name, $vote]);
  }
  fclose($out);
  exit;
}

if ($loggedIn) {
  arsort($data['totals']);
  ksort($data['votes']);
}

function esc($value) {
  return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Poll Admin | The League</title>
    <link rel="stylesheet" href="./styles.css?v=20260228g" />
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
            <h2>Totals</h2>
            <div class="admin-actions">
              <a class="admin-link" href="?export=csv">Export CSV</a>
              <a class="admin-link" href="?logout=1">Logout</a>
            </div>
          </div>
          <?php
            $max = max(1, ...array_values($data['totals'] ?: ['No votes yet' => 1]));
          ?>
          <div class="admin-chart">
            <?php foreach ($data['totals'] as $choice => $count): ?>
              <?php $pct = round(($count / $max) * 100); ?>
              <div class="admin-bar-row">
                <div class="admin-bar-label"><?= esc($choice) ?></div>
                <div class="admin-bar-track">
                  <div class="admin-bar-fill" style="width: <?= esc($pct) ?>%;"></div>
                </div>
                <div class="admin-bar-count"><?= esc($count) ?></div>
              </div>
            <?php endforeach; ?>
            <?php if (!$data['totals']): ?>
              <p class="small">No votes yet.</p>
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
                  <th>Vote</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <?php foreach ($data['votes'] as $name => $vote): ?>
                  <tr>
                    <td><?= esc($name) ?></td>
                    <td><?= esc($vote) ?></td>
                    <td>
                      <form method="post" onsubmit="return confirm('Remove <?= esc($name) ?>\\'s vote?');">
                        <input type="hidden" name="remove_name" value="<?= esc($name) ?>" />
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

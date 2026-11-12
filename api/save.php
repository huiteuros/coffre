<?php
// Sauvegarde du joueur connecté (jeton requis)
//   GET api/save.php          → { state, savedAt } (state = null si aucune sauvegarde)
//   PUT api/save.php { state } → { savedAt }
//       409 { error, state, savedAt } si le serveur a déjà une sauvegarde plus récente
require __DIR__ . '/lib.php';
$method = require_method('GET', 'PUT');
$player = current_player();

if ($method === 'GET') {
    $st = db()->prepare('SELECT state, saved_at FROM saves WHERE player_id = ?');
    $st->execute([$player['id']]);
    $row = $st->fetch();
    respond(200, $row
        ? ['state' => json_decode($row['state'], true), 'savedAt' => (int) $row['saved_at']]
        : ['state' => null, 'savedAt' => 0]);
}

$state = input()['state'] ?? null;
if (!is_array($state) || !isset($state['saved'], $state['vault'], $state['owned']) || !is_numeric($state['saved'])) {
    fail(422, 'Sauvegarde invalide.');
}
$savedAt = (int) $state['saved'];
$num = fn(string $k) => isset($state[$k]) && is_numeric($state[$k]) ? (float) $state[$k] : 0.0;
$bestVault = (int) max($num('best'), $num('bestEver'), 1);

$pdo = db();
$pdo->beginTransaction();
// Verrou sur la ligne : deux onglets qui sauvegardent en même temps passent l'un après l'autre
$st = $pdo->prepare('SELECT state, saved_at FROM saves WHERE player_id = ? FOR UPDATE');
$st->execute([$player['id']]);
$current = $st->fetch();

if ($current && (int) $current['saved_at'] > $savedAt) {
    $pdo->rollBack();
    respond(409, [
        'error'   => 'Une sauvegarde plus récente existe sur le serveur.',
        'state'   => json_decode($current['state'], true),
        'savedAt' => (int) $current['saved_at'],
    ]);
}

$values = [
    json_encode($state, JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION),
    $savedAt, $bestVault, (int) $num('lingotsEarned'), $num('totalGold'), (int) $num('runs'),
];
if ($current) {
    $pdo->prepare('UPDATE saves SET state = ?, saved_at = ?, best_vault = ?, lingots_earned = ?, total_gold = ?, runs = ?
                   WHERE player_id = ?')->execute([...$values, $player['id']]);
} else {
    $pdo->prepare('INSERT INTO saves (state, saved_at, best_vault, lingots_earned, total_gold, runs, player_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?)')->execute([...$values, $player['id']]);
}
$pdo->commit();

respond(200, ['savedAt' => $savedAt]);

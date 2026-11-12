<?php
// GET api/leaderboard.php → { players: [{ pseudo, bestVault, lingotsEarned, runs }] } (20 meilleurs, public)
require __DIR__ . '/lib.php';
require_method('GET');

// Record = dernier coffre atteint ; le jeu affiche « coffre ouvert » = record − 1
$rows = db()->query('SELECT p.pseudo, s.best_vault, s.lingots_earned, s.runs
                     FROM saves s JOIN players p ON p.id = s.player_id
                     ORDER BY s.best_vault DESC, s.lingots_earned DESC, s.updated_at ASC
                     LIMIT 20')->fetchAll();

respond(200, ['players' => array_map(fn($r) => [
    'pseudo'        => $r['pseudo'],
    'bestVault'     => (int) $r['best_vault'],
    'lingotsEarned' => (int) $r['lingots_earned'],
    'runs'          => (int) $r['runs'],
], $rows)]);

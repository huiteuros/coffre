<?php
// POST api/login.php { pseudo, password } → { token, pseudo }
require __DIR__ . '/lib.php';
require_method('POST');

$in = input();
$pseudo = is_string($in['pseudo'] ?? null) ? trim($in['pseudo']) : '';
$password = is_string($in['password'] ?? null) ? $in['password'] : '';

$st = db()->prepare('SELECT id, pseudo, password_hash FROM players WHERE pseudo = ?');
$st->execute([$pseudo]);
$player = $st->fetch();

// Même message que le pseudo existe ou non, pour ne pas révéler les comptes
if (!$player || !password_verify($password, $player['password_hash'])) {
    fail(401, 'Pseudo ou mot de passe incorrect.');
}

if (password_needs_rehash($player['password_hash'], PASSWORD_DEFAULT)) {
    db()->prepare('UPDATE players SET password_hash = ? WHERE id = ?')
        ->execute([password_hash($password, PASSWORD_DEFAULT), $player['id']]);
}

respond(200, ['token' => new_session((int) $player['id']), 'pseudo' => $player['pseudo']]);

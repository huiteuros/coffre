<?php
// POST api/register.php { pseudo, password } → 201 { token, pseudo }
require __DIR__ . '/lib.php';
require_method('POST');

$in = input();
$pseudo = valid_pseudo($in['pseudo'] ?? null);
$password = valid_password($in['password'] ?? null);

try {
    db()->prepare('INSERT INTO players (pseudo, password_hash) VALUES (?, ?)')
        ->execute([$pseudo, password_hash($password, PASSWORD_DEFAULT)]);
} catch (PDOException $e) {
    if (($e->errorInfo[1] ?? 0) === 1062) fail(409, 'Ce pseudo est déjà pris.');
    throw $e;
}

$id = (int) db()->lastInsertId();
respond(201, ['token' => new_session($id), 'pseudo' => $pseudo]);

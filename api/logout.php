<?php
// POST api/logout.php (jeton requis) → { ok: true }
require __DIR__ . '/lib.php';
require_method('POST');

current_player();
db()->prepare('DELETE FROM sessions WHERE token_hash = ?')->execute([hash('sha256', bearer_token())]);
respond(200, ['ok' => true]);

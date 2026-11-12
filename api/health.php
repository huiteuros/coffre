<?php
// GET api/health.php → { ok: true } si l'API et la base répondent
require __DIR__ . '/lib.php';
require_method('GET');

db()->query('SELECT 1');
respond(200, ['ok' => true]);

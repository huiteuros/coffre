<?php
// Réglages par défaut (WAMP : MySQL sur 3306, root sans mot de passe).
// Pour les changer, copier config.local.example.php en config.local.php.
$defaults = [
    'dsn'          => 'mysql:host=127.0.0.1;port=3306;dbname=chambre_forte;charset=utf8mb4',
    'user'         => 'root',
    'password'     => '',
    'session_days' => 30,
    'max_state_bytes' => 100000,
];

$local = __DIR__ . '/config.local.php';
return file_exists($local) ? array_merge($defaults, require $local) : $defaults;

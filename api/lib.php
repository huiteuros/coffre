<?php
// Outils communs à tous les points d'entrée de l'API : réponses JSON, base, authentification.
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$CONFIG = require __DIR__ . '/config.php';

set_exception_handler(function (Throwable $e) {
    error_log('[chambre-forte] ' . $e);
    if ($e instanceof PDOException && str_starts_with((string) $e->getCode(), '08') || $e instanceof DbUnavailable) {
        fail(503, 'Base de données injoignable.');
    }
    fail(500, 'Erreur serveur.');
});

final class DbUnavailable extends RuntimeException {}

function db(): PDO
{
    static $pdo = null;
    global $CONFIG;
    if ($pdo === null) {
        try {
            $pdo = new PDO($CONFIG['dsn'], $CONFIG['user'], $CONFIG['password'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            throw new DbUnavailable($e->getMessage(), 0, $e);
        }
    }
    return $pdo;
}

function respond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
    exit;
}

function fail(int $status, string $message): never
{
    respond($status, ['error' => $message]);
}

function require_method(string ...$methods): string
{
    $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($m, $methods, true)) {
        header('Allow: ' . implode(', ', $methods));
        fail(405, 'Méthode non autorisée.');
    }
    return $m;
}

function input(): array
{
    global $CONFIG;
    $raw = file_get_contents('php://input', false, null, 0, $CONFIG['max_state_bytes'] + 1000);
    if ($raw === false || $raw === '') fail(400, 'Corps de requête vide.');
    if (strlen($raw) > $CONFIG['max_state_bytes']) fail(413, 'Données trop volumineuses.');
    $data = json_decode($raw, true);
    if (!is_array($data)) fail(400, 'JSON invalide.');
    return $data;
}

// ---------- Authentification par jeton ----------

function bearer_token(): ?string
{
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) if (strcasecmp($k, 'Authorization') === 0) $h = $v;
    }
    return preg_match('/^Bearer\s+([a-f0-9]{64})$/i', $h, $m) ? strtolower($m[1]) : null;
}

function new_session(int $playerId): string
{
    global $CONFIG;
    $token = bin2hex(random_bytes(32));
    db()->prepare('INSERT INTO sessions (token_hash, player_id, expires_at) VALUES (?, ?, NOW() + INTERVAL ? DAY)')
        ->execute([hash('sha256', $token), $playerId, $CONFIG['session_days']]);
    // Ménage opportuniste des sessions expirées
    db()->exec('DELETE FROM sessions WHERE expires_at < NOW()');
    return $token;
}

/** Joueur connecté, ou réponse 401. La session est prolongée à chaque usage. */
function current_player(): array
{
    global $CONFIG;
    $token = bearer_token();
    if ($token === null) fail(401, 'Connexion requise.');
    $hash = hash('sha256', $token);
    $st = db()->prepare('SELECT p.id, p.pseudo FROM sessions s JOIN players p ON p.id = s.player_id
                         WHERE s.token_hash = ? AND s.expires_at > NOW()');
    $st->execute([$hash]);
    $player = $st->fetch();
    if (!$player) fail(401, 'Session expirée, reconnecte-toi.');
    db()->prepare('UPDATE sessions SET expires_at = NOW() + INTERVAL ? DAY WHERE token_hash = ?')
        ->execute([$CONFIG['session_days'], $hash]);
    $player['id'] = (int) $player['id'];
    return $player;
}

// ---------- Validation ----------

function valid_pseudo(mixed $p): string
{
    $p = is_string($p) ? trim($p) : '';
    if (!preg_match('/^[\p{L}\p{N}_.\- ]{3,24}$/u', $p)) {
        fail(422, 'Le pseudo doit faire de 3 à 24 caractères : lettres, chiffres, espace, point, tiret ou soulignement.');
    }
    return $p;
}

function valid_password(mixed $p): string
{
    if (!is_string($p) || mb_strlen($p) < 8 || strlen($p) > 200) {
        fail(422, 'Le mot de passe doit faire au moins 8 caractères.');
    }
    return $p;
}

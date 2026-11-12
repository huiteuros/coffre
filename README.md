# Chambre Forte

Jeu incrémental de casse de coffres, en HTML/CSS/JS (modules ES) avec une API PHP + MySQL pour sauvegarder les parties.

## Structure

```
index.html        la page
css/style.css     le style
js/               le jeu (main.js = point d'entrée, formulas.js = équilibrage, data.js = catalogue, défis…)
api/              l'API PHP (JSON)
db/schema.sql     le schéma de la base
tools/            outils de développement (simulation d'équilibrage)
```

## Équilibrage

`tools/simulate.mjs` fait jouer un joueur type avec les vraies formules du jeu (`js/formulas.js`, `js/data.js`) et affiche quand il atteint chaque étape : coffres, contacts, défis, coffre légendaire.

```bash
node tools/simulate.mjs --quiet
```

Options : `--cps=1` (clics par seconde), `--stuck=20` (minutes sans record avant la cavale), `--hours=150` (durée maximale).

## Lancer en local

1. Démarrer WAMP (au minimum le service MySQL).
2. Créer la base, une seule fois :

   ```bash
   C:/wamp64/bin/mysql/mysql8.3.0/bin/mysql.exe -u root < db/schema.sql
   ```

3. Lancer le serveur PHP depuis ce dossier puis ouvrir http://localhost:8123 (ou un autre port) :

   ```bash
   C:/wamp64/bin/php/php8.3.6/php.exe -S localhost:8123
   ```

Autre possibilité : copier le dossier dans `C:\wamp64\www\` et passer par Apache.

Pour une autre base (MariaDB de WAMP sur le port 3307, mot de passe…), copier `api/config.local.example.php` en `api/config.local.php` et l'adapter.

Sans serveur ou sans base, le jeu fonctionne quand même : la partie reste dans le navigateur (`localStorage`).

## API

Toutes les réponses sont en JSON. Les routes marquées 🔒 demandent l'en-tête `Authorization: Bearer <jeton>`.

| Route | Méthode | Corps | Réponse |
|---|---|---|---|
| `api/health.php` | GET | | `{ ok }` ou 503 si la base est injoignable |
| `api/register.php` | POST | `{ pseudo, password }` | 201 `{ token, pseudo }`, 409 si le pseudo est pris |
| `api/login.php` | POST | `{ pseudo, password }` | `{ token, pseudo }`, 401 si identifiants faux |
| `api/logout.php` 🔒 | POST | | `{ ok }` |
| `api/save.php` 🔒 | GET | | `{ state, savedAt }` (`state` vaut `null` sans sauvegarde) |
| `api/save.php` 🔒 | PUT | `{ state }` | `{ savedAt }`, 409 `{ state, savedAt }` si le serveur a plus récent |
| `api/leaderboard.php` | GET | | `{ players: [{ pseudo, bestVault, lingotsEarned, runs }] }` |

Synchronisation : la sauvegarde dont le champ `saved` (horodatage) est le plus récent l'emporte. À la connexion, la partie du compte remplace celle du navigateur ; à la création de compte, c'est l'inverse.

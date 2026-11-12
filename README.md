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
2. Créer la base et ses tables, une seule fois :

   ```bash
   C:/wamp64/bin/mysql/mysql8.3.0/bin/mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS chambre_forte CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
   C:/wamp64/bin/mysql/mysql8.3.0/bin/mysql.exe -u root chambre_forte < db/schema.sql
   ```

3. Lancer le serveur PHP depuis ce dossier puis ouvrir http://localhost:8123 (ou un autre port) :

   ```bash
   C:/wamp64/bin/php/php8.3.6/php.exe -S localhost:8123
   ```

Autre possibilité : copier le dossier dans `C:\wamp64\www\` et passer par Apache.

Pour une autre base (MariaDB de WAMP sur le port 3307, mot de passe…), copier `api/config.local.example.php` en `api/config.local.php` et l'adapter.

Sans serveur ou sans base, le jeu fonctionne quand même : la partie reste dans le navigateur (`localStorage`).

## Mise en ligne (OVH Web Cloud, en multisite)

Prérequis : PHP 8.1 ou plus, une base MySQL libre dans l'offre, HTTPS actif.

1. **Version PHP** : elle est commune à tout l'hébergement (fichier `.ovhconfig` à la racine FTP). Vérifier dans l'espace client qu'elle est en 8.1 ou plus ; ne pas ajouter de `.ovhconfig` dans ce projet, il entrerait en conflit avec les autres sites.
2. **Base de données** : Hébergements > Bases de données > Créer une base (MySQL 8). Noter le serveur (`xxxxx.mysql.db`), le nom, l'utilisateur et le mot de passe. Ouvrir phpMyAdmin et importer `db/schema.sql`.
3. **Domaine** : Hébergements > Multisite > Ajouter un domaine (par ex. `coffre.mondomaine.fr`), dossier racine dédié et **vide** (par ex. `coffre`), cocher SSL. Si le domaine est chez OVH, l'enregistrement DNS est créé automatiquement.
4. **Fichiers** : soit via Git (Mes sites > ⁝ > Lier Git, dépôt `huiteuros/coffre`, branche `main`, puis Déployer), soit par FTP en envoyant tout le dossier dans `coffre/`.
5. **Réglages de la base** : créer par FTP le fichier `coffre/api/config.local.php` (jamais commité) :

   ```php
   <?php
   return [
       'dsn'      => 'mysql:host=xxxxx.mysql.db;port=3306;dbname=NOM_DE_LA_BASE;charset=utf8mb4',
       'user'     => 'NOM_UTILISATEUR',
       'password' => 'MOT_DE_PASSE',
   ];
   ```

6. **Vérifications** : `https://coffre.mondomaine.fr/api/health.php` doit répondre `{"ok":true}` ; `…/db/schema.sql` et `…/api/config.php` doivent répondre 403 ; dans le jeu, onglet Carnet, créer un compte puis le retrouver depuis un autre navigateur.

Les fichiers `.htaccess` forcent le HTTPS, bloquent l'accès aux fichiers du dépôt (schéma, outils, réglages) et transmettent l'en-tête `Authorization` à PHP, souvent retiré sur les hébergements mutualisés.

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

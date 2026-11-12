-- Chambre Forte : schéma MySQL 8 / MariaDB 10.5+
-- Installation : mysql -u root -p < db/schema.sql

CREATE DATABASE IF NOT EXISTS chambre_forte
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE chambre_forte;

-- Joueurs. La collation _ci rend le pseudo unique sans tenir compte de la casse.
CREATE TABLE IF NOT EXISTS players (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pseudo        VARCHAR(24)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_players_pseudo (pseudo)
) ENGINE=InnoDB;

-- Sessions : on ne stocke que l'empreinte SHA-256 du jeton envoyé au navigateur.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64)     NOT NULL,
  player_id  INT UNSIGNED NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME     NOT NULL,
  PRIMARY KEY (token_hash),
  KEY idx_sessions_player (player_id),
  CONSTRAINT fk_sessions_player FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Une sauvegarde par joueur : l'état complet en JSON,
-- plus quelques colonnes recopiées pour le classement.
CREATE TABLE IF NOT EXISTS saves (
  player_id      INT UNSIGNED    NOT NULL,
  state          JSON            NOT NULL,
  saved_at       BIGINT UNSIGNED NOT NULL COMMENT 'horodatage client (ms) de la sauvegarde',
  best_vault     INT UNSIGNED    NOT NULL DEFAULT 1,
  lingots_earned BIGINT UNSIGNED NOT NULL DEFAULT 0,
  total_gold     DOUBLE          NOT NULL DEFAULT 0,
  runs           INT UNSIGNED    NOT NULL DEFAULT 0,
  updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id),
  KEY idx_saves_rank (best_vault, lingots_earned),
  CONSTRAINT fk_saves_player FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
) ENGINE=InnoDB;

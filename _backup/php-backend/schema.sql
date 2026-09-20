-- KwizBox MySQL Schema for InfinityFree
-- Run this once to set up all tables

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─────────────── USERS ───────────────
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(40) NOT NULL,
    full_name VARCHAR(80) DEFAULT NULL,
    email VARCHAR(120) DEFAULT NULL,
    phone VARCHAR(30) DEFAULT NULL,
    class_level VARCHAR(4) DEFAULT NULL,
    school_code VARCHAR(20) DEFAULT NULL,
    is_guest TINYINT(1) NOT NULL DEFAULT 0,
    password_hash VARCHAR(200) DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lifetime_score INT NOT NULL DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 0,
    total_correct INT NOT NULL DEFAULT 0,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_played DATETIME DEFAULT NULL,
    last_ip VARCHAR(45) DEFAULT NULL,
    last_login DATETIME DEFAULT NULL,
    avatar_skin VARCHAR(20) NOT NULL DEFAULT 'warm',
    avatar_hat VARCHAR(20) NOT NULL DEFAULT 'none',
    avatar_accessory VARCHAR(20) NOT NULL DEFAULT 'none',
    avatar_gender VARCHAR(20) NOT NULL DEFAULT 'male',
    security_question VARCHAR(160) DEFAULT NULL,
    security_answer_hash VARCHAR(200) DEFAULT NULL,
    UNIQUE KEY uq_nickname (nickname),
    INDEX idx_class_level (class_level),
    INDEX idx_school_code (school_code),
    INDEX idx_last_played (last_played)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────── QUESTIONS ───────────────
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_level VARCHAR(4) NOT NULL,
    subject VARCHAR(20) NOT NULL,
    topic VARCHAR(60) NOT NULL,
    sub_topic VARCHAR(60) DEFAULT NULL,
    strand VARCHAR(60) NOT NULL,
    difficulty VARCHAR(10) NOT NULL,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    answer_index INT NOT NULL,
    explanation TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL DEFAULT 'mcq',
    image_url VARCHAR(500) DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    times_answered INT NOT NULL DEFAULT 0,
    times_correct INT NOT NULL DEFAULT 0,
    INDEX idx_class_subject_diff (class_level, subject, difficulty),
    INDEX idx_question_type (question_type),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────── QUIZ SESSIONS ───────────────
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    class_level VARCHAR(4) NOT NULL,
    subject VARCHAR(20) NOT NULL,
    difficulty VARCHAR(10) DEFAULT NULL,
    topic VARCHAR(60) DEFAULT NULL,
    total INT NOT NULL DEFAULT 0,
    correct INT NOT NULL DEFAULT 0,
    score INT NOT NULL DEFAULT 0,
    accuracy FLOAT NOT NULL DEFAULT 0.0,
    duration_seconds INT DEFAULT NULL,
    max_streak INT NOT NULL DEFAULT 0,
    status VARCHAR(12) NOT NULL DEFAULT 'completed',
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME DEFAULT NULL,
    school_code VARCHAR(20) DEFAULT NULL,
    is_daily TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_started_at (started_at),
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────── SUBJECT PROGRESS ───────────────
CREATE TABLE IF NOT EXISTS subject_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    class_level VARCHAR(4) NOT NULL,
    subject VARCHAR(20) NOT NULL,
    questions_answered INT NOT NULL DEFAULT 0,
    correct INT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_subject_progress (user_id, class_level, subject),
    CONSTRAINT fk_sp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────── TOPIC PROGRESS ───────────────
CREATE TABLE IF NOT EXISTS topic_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    class_level VARCHAR(4) NOT NULL,
    subject VARCHAR(20) NOT NULL,
    topic VARCHAR(60) NOT NULL,
    questions_answered INT NOT NULL DEFAULT 0,
    correct INT NOT NULL DEFAULT 0,
    mastery_score FLOAT NOT NULL DEFAULT 0.0,
    mastered TINYINT(1) NOT NULL DEFAULT 0,
    UNIQUE KEY uq_topic_progress (user_id, class_level, subject, topic),
    CONSTRAINT fk_tp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────── LEADERBOARD PERIODS ───────────────
CREATE TABLE IF NOT EXISTS leaderboard_periods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    kind VARCHAR(8) NOT NULL,
    period VARCHAR(12) NOT NULL,
    points INT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_leaderboard_period (user_id, kind, period),
    CONSTRAINT fk_lp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────── SCHOOL CODES ───────────────
CREATE TABLE IF NOT EXISTS school_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    school VARCHAR(80) DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    max_uses INT DEFAULT NULL,
    used_count INT NOT NULL DEFAULT 0,
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────── USER QUESTION SEEN ───────────────
CREATE TABLE IF NOT EXISTS user_question_seen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    question_id INT NOT NULL,
    seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_question_seen (user_id, question_id),
    CONSTRAINT fk_uqs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_uqs_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────── ADMIN USERS ───────────────
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(40) NOT NULL UNIQUE,
    full_name VARCHAR(80) DEFAULT NULL,
    password_hash VARCHAR(200) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'moderator',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_login DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT DEFAULT NULL,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────── AUDIT LOG ───────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT DEFAULT NULL,
    admin_username VARCHAR(40) DEFAULT NULL,
    action VARCHAR(60) NOT NULL,
    target VARCHAR(120) DEFAULT NULL,
    detail TEXT DEFAULT NULL,
    ip VARCHAR(45) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_id (admin_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────── SYSTEM SETTINGS ───────────────
CREATE TABLE IF NOT EXISTS system_settings (
    key_name VARCHAR(40) NOT NULL PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────── CHALLENGES ───────────────
CREATE TABLE IF NOT EXISTS challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(6) NOT NULL UNIQUE,
    creator_id INT NOT NULL,
    class_level VARCHAR(4) NOT NULL,
    subject VARCHAR(20) NOT NULL,
    question_ids TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME DEFAULT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'open',
    INDEX idx_code (code),
    CONSTRAINT fk_challenge_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────── CHALLENGE SESSIONS ───────────────
CREATE TABLE IF NOT EXISTS challenge_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    challenge_code VARCHAR(6) NOT NULL,
    player_id INT NOT NULL,
    score INT NOT NULL DEFAULT 0,
    correct INT NOT NULL DEFAULT 0,
    wrong INT NOT NULL DEFAULT 0,
    total INT NOT NULL DEFAULT 0,
    accuracy FLOAT NOT NULL DEFAULT 0.0,
    status VARCHAR(12) NOT NULL DEFAULT 'pending',
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL,
    INDEX idx_challenge_code (challenge_code),
    INDEX idx_player_id (player_id),
    CONSTRAINT fk_cs_player FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ─────────────── DEFAULT SETTINGS ───────────────
INSERT INTO system_settings (key_name, value) VALUES
    ('game_duration_seconds', '600'),
    ('questions_per_game', '12'),
    ('scoring_base_easy', '5'),
    ('scoring_base_medium', '10'),
    ('scoring_base_hard', '15'),
    ('maintenance_mode', 'false'),
    ('registration_open', 'true'),
    ('max_class_level', 'B9')
ON DUPLICATE KEY UPDATE value = VALUES(value);

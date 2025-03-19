CREATE DATABASE IF NOT EXISTS sustainable_consumption;
USE sustainable_consumption;
SET GLOBAL event_scheduler = ON;

CREATE TABLE IF NOT EXISTS consumption (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    electricity DECIMAL(10, 2),
    water DECIMAL(10, 2),
    waste DECIMAL(10, 2),
    UNIQUE (timestamp)
);

-- User table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Token blacklist table
CREATE TABLE IF NOT EXISTS token_blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jti VARCHAR(255) NOT NULL,
    token TEXT,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry TIMESTAMP NOT NULL,
    reason VARCHAR(100) DEFAULT 'logout',
    
    -- Indexes for performance
    INDEX idx_jti (jti),
    INDEX idx_user_id (user_id),
    INDEX idx_expiry (expiry),

    -- Foreign key to users table
    CONSTRAINT fk_blacklist_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token TEXT NOT NULL,
    jti VARCHAR(255) NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    device_info VARCHAR(255),
    is_revoked BOOLEAN DEFAULT FALSE,
    
    -- Indexes for performance
    INDEX idx_token (token(191)),
    INDEX idx_user_expires (user_id, expires_at),
    INDEX idx_jti (jti),
    
    -- Foreign key to users table
    CONSTRAINT fk_refresh_token_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

-- Cleanup procedure for expired blacklisted tokens (runs daily)
DELIMITER //
CREATE EVENT IF NOT EXISTS cleanup_blacklisted_tokens
ON SCHEDULE EVERY 1 DAY
DO
BEGIN
    DELETE FROM token_blacklist WHERE expiry < NOW();
END //
DELIMITER ;

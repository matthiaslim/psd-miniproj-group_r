CREATE DATABASE IF NOT EXISTS sensor_data;
USE sensor_data;

CREATE TABLE IF NOT EXISTS consumption (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    electricity DECIMAL(10, 2),
    water DECIMAL(10, 2),
    UNIQUE (timestamp)
);

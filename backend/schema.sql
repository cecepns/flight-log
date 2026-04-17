CREATE DATABASE IF NOT EXISTS flight_log_app;
USE flight_log_app;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flights (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  flight_number VARCHAR(50) NOT NULL,
  aircraft_type VARCHAR(50) DEFAULT '',
  destination VARCHAR(120) DEFAULT '',
  departure_date DATE NOT NULL,
  arrival_date DATE NULL,
  status ENUM('Upcoming', 'Completed') DEFAULT 'Upcoming',
  est_departure_time TIME NULL,
  est_arrival_time TIME NULL,
  actual_departure_time TIME NULL,
  actual_arrival_time TIME NULL,
  flying_hours DECIMAL(6,2) DEFAULT 0.00,
  rest_hours DECIMAL(6,2) DEFAULT 0.00,
  booked_fc INT DEFAULT 0,
  booked_jc INT DEFAULT 0,
  booked_pey INT DEFAULT 0,
  booked_ey INT DEFAULT 0,
  checked_fc INT DEFAULT 0,
  checked_jc INT DEFAULT 0,
  checked_pey INT DEFAULT 0,
  checked_ey INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_flights_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crew_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flight_id INT NOT NULL,
  position VARCHAR(10) NOT NULL,
  crew_name VARCHAR(120) NOT NULL,
  nationality VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_crew_flight FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS flight_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flight_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_photos_flight FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE
);

CREATE INDEX idx_flights_user_date ON flights(user_id, departure_date);
CREATE INDEX idx_flights_search ON flights(flight_number, aircraft_type, destination);
CREATE INDEX idx_crew_search ON crew_members(crew_name);

INSERT INTO users (full_name, email, password_hash)
VALUES (
  'Demo User',
  'demo@flightlog.com',
  '$2b$10$jsP93z1MndCiIMTs0dIXYewFOQiqCU3Cqs5iS8d.d5RxABa/cD1Ry'
)
ON DUPLICATE KEY UPDATE email = VALUES(email);

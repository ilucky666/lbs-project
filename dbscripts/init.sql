-- Create extension for spatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create enum for scenic spot levels
CREATE TYPE scenic_level AS ENUM ('1A', '2A', '3A', '4A', '5A');

-- Create roles table
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- Create users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    api_key VARCHAR(64) UNIQUE,
    role_id BIGINT REFERENCES roles(id)
);

-- Create POI table
CREATE TABLE pois (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    province VARCHAR(50) NOT NULL,
    level scenic_level NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    description TEXT,
    website_url VARCHAR(255),
    image_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT REFERENCES users(id),
    updated_by BIGINT REFERENCES users(id)
);

-- Create API request logs table
CREATE TABLE api_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    status_code INTEGER
);

-- Insert default roles
INSERT INTO roles (name) VALUES 
    ('ROLE_ADMIN'),
    ('ROLE_INTERNAL'),
    ('ROLE_PUBLIC');

-- Create index for spatial queries
CREATE INDEX pois_location_idx ON pois USING GIST (location);

-- Create indexes for common queries
CREATE INDEX pois_province_idx ON pois(province);
CREATE INDEX pois_level_idx ON pois(level);
CREATE INDEX pois_name_idx ON pois(name);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
CREATE TRIGGER update_pois_modtime
    BEFORE UPDATE ON pois
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 
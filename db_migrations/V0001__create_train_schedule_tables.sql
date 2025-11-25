-- Таблица линий для метро
CREATE TABLE IF NOT EXISTS lines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#0EA5E9',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица станций
CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    position INTEGER NOT NULL,
    line_id INTEGER REFERENCES lines(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица графиков
CREATE TABLE IF NOT EXISTS schedules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    is_metro_mode BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица поездов/составов
CREATE TABLE IF NOT EXISTS trains (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES schedules(id),
    number VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('freight', 'passenger', 'service')),
    departure_station_id INTEGER REFERENCES stations(id),
    arrival_station_id INTEGER REFERENCES stations(id),
    departure_time INTEGER NOT NULL CHECK (departure_time >= 0 AND departure_time <= 23),
    arrival_time INTEGER NOT NULL CHECK (arrival_time >= 0 AND arrival_time <= 23),
    color VARCHAR(7) NOT NULL DEFAULT '#0EA5E9',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица легенды
CREATE TABLE IF NOT EXISTS legend_items (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES schedules(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('freight', 'passenger', 'service')),
    label VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL,
    dashed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_trains_schedule ON trains(schedule_id);
CREATE INDEX IF NOT EXISTS idx_stations_line ON stations(line_id);
CREATE INDEX IF NOT EXISTS idx_legend_schedule ON legend_items(schedule_id);

-- Вставка данных по умолчанию
INSERT INTO lines (name, color) VALUES 
    ('Красная', '#F97316'),
    ('Синяя', '#0EA5E9'),
    ('Зелёная', '#10B981');

INSERT INTO stations (name, position, line_id) VALUES 
    ('Ст. Первомайская', 0, 1),
    ('Раз. Никольское', 1, 1),
    ('Раз. Филимоновский', 2, 2),
    ('Обменный разъезд', 3, 2);

INSERT INTO schedules (name, is_metro_mode) VALUES ('График по умолчанию', false);

INSERT INTO legend_items (schedule_id, type, label, color, dashed) VALUES 
    (1, 'freight', 'Торговозные поезда', '#0EA5E9', false),
    (1, 'passenger', 'Пассажирские поезда', '#8B5CF6', false),
    (1, 'service', 'Хозяйственные поезда', '#10B981', true);

INSERT INTO trains (schedule_id, number, type, departure_station_id, arrival_station_id, departure_time, arrival_time, color) VALUES 
    (1, '№1', 'freight', 1, 3, 0, 8, '#0EA5E9'),
    (1, '№2', 'freight', 3, 1, 2, 10, '#F97316'),
    (1, '№3', 'passenger', 1, 4, 4, 14, '#8B5CF6'),
    (1, '№4', 'service', 2, 4, 6, 12, '#10B981');

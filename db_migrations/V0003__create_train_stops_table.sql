CREATE TABLE IF NOT EXISTS train_stops (
    id SERIAL PRIMARY KEY,
    train_id INTEGER NOT NULL REFERENCES trains(id),
    station_id INTEGER NOT NULL REFERENCES stations(id),
    arrival_time INTEGER NOT NULL,
    departure_time INTEGER NOT NULL,
    stop_duration INTEGER GENERATED ALWAYS AS (departure_time - arrival_time) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(train_id, station_id)
);

CREATE INDEX IF NOT EXISTS idx_train_stops_train_id ON train_stops(train_id);
CREATE INDEX IF NOT EXISTS idx_train_stops_station_id ON train_stops(station_id);

COMMENT ON TABLE train_stops IS 'Остановочные пункты поездов с временем стоянки';
COMMENT ON COLUMN train_stops.arrival_time IS 'Время прибытия в минутах от 00:00';
COMMENT ON COLUMN train_stops.departure_time IS 'Время отправления в минутах от 00:00';
COMMENT ON COLUMN train_stops.stop_duration IS 'Длительность стоянки в минутах (автоматически вычисляется)';
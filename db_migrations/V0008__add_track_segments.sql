-- Создание таблицы для перегонов между станциями
CREATE TABLE IF NOT EXISTS track_segments (
    id SERIAL PRIMARY KEY,
    station_from_id INTEGER NOT NULL REFERENCES stations(id),
    station_to_id INTEGER NOT NULL REFERENCES stations(id),
    is_single_track BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(station_from_id, station_to_id)
);

-- Создать индексы для быстрого поиска
CREATE INDEX idx_track_segments_stations ON track_segments(station_from_id, station_to_id);

COMMENT ON TABLE track_segments IS 'Перегоны между станциями';
COMMENT ON COLUMN track_segments.is_single_track IS 'Является ли перегон однопутным';

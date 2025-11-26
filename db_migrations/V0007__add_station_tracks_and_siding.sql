-- Добавляем поля для количества путей и наличия разъезда
ALTER TABLE stations
ADD COLUMN IF NOT EXISTS tracks_count INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS has_siding BOOLEAN DEFAULT false;

-- Комментарии для полей
COMMENT ON COLUMN stations.tracks_count IS 'Количество путей на станции (1 - однопутная, 2+ - многопутная)';
COMMENT ON COLUMN stations.has_siding IS 'Наличие разъезда для встречных поездов на однопутной станции';
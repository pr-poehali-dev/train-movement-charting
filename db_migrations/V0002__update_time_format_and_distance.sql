-- Изменение типа времени с часов (0-23) на минуты с начала суток (0-1439)
ALTER TABLE trains DROP CONSTRAINT IF EXISTS trains_departure_time_check;
ALTER TABLE trains DROP CONSTRAINT IF EXISTS trains_arrival_time_check;

ALTER TABLE trains 
  ADD CONSTRAINT trains_departure_time_check CHECK (departure_time >= 0 AND departure_time <= 1439),
  ADD CONSTRAINT trains_arrival_time_check CHECK (arrival_time >= 0 AND arrival_time <= 1439);

-- Добавление колонки distance_km для станций (расстояние в км от начала пути)
ALTER TABLE stations ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10, 2) DEFAULT 0;

-- Обновление существующих данных: конвертация часов в минуты
UPDATE trains SET 
  departure_time = departure_time * 60,
  arrival_time = arrival_time * 60
WHERE departure_time < 24 AND arrival_time < 24;

-- Обновление расстояний станций (позиция * 10 км для примера)
UPDATE stations SET distance_km = position * 10.0;

-- Комментарии для полей
COMMENT ON COLUMN trains.departure_time IS 'Время отправления в минутах с начала суток (0-1439)';
COMMENT ON COLUMN trains.arrival_time IS 'Время прибытия в минутах с начала суток (0-1439)';
COMMENT ON COLUMN stations.distance_km IS 'Расстояние станции от начала пути в километрах';

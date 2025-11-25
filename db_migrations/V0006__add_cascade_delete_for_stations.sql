-- Удаляем старые ограничения внешних ключей
ALTER TABLE trains DROP CONSTRAINT IF EXISTS trains_departure_station_id_fkey;
ALTER TABLE trains DROP CONSTRAINT IF EXISTS trains_arrival_station_id_fkey;
ALTER TABLE train_stops DROP CONSTRAINT IF EXISTS train_stops_station_id_fkey;

-- Создаём новые ограничения с каскадным удалением
ALTER TABLE trains 
  ADD CONSTRAINT trains_departure_station_id_fkey 
  FOREIGN KEY (departure_station_id) 
  REFERENCES stations(id) 
  ON DELETE CASCADE;

ALTER TABLE trains 
  ADD CONSTRAINT trains_arrival_station_id_fkey 
  FOREIGN KEY (arrival_station_id) 
  REFERENCES stations(id) 
  ON DELETE CASCADE;

ALTER TABLE train_stops 
  ADD CONSTRAINT train_stops_station_id_fkey 
  FOREIGN KEY (station_id) 
  REFERENCES stations(id) 
  ON DELETE CASCADE;

COMMENT ON CONSTRAINT trains_departure_station_id_fkey ON trains IS 'При удалении станции удаляются все поезда с этой станцией отправления';
COMMENT ON CONSTRAINT trains_arrival_station_id_fkey ON trains IS 'При удалении станции удаляются все поезда с этой станцией прибытия';
COMMENT ON CONSTRAINT train_stops_station_id_fkey ON train_stops IS 'При удалении станции удаляются все остановки на этой станции';

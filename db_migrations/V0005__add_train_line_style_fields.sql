ALTER TABLE trains ADD COLUMN IF NOT EXISTS line_style VARCHAR(20) DEFAULT 'solid';
ALTER TABLE trains ADD COLUMN IF NOT EXISTS line_width DECIMAL(3,1) DEFAULT 2.5;

COMMENT ON COLUMN trains.line_style IS 'Стиль линии: solid, dashed, dotted, dash-dot, double';
COMMENT ON COLUMN trains.line_width IS 'Толщина линии в пикселях';
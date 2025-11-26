const API_URL = 'https://functions.poehali.dev/fb659624-46e6-4cfa-9bd9-1fd4780b2399';

export interface Line {
  id: number;
  name: string;
  color: string;
  created_at?: string;
}

export interface Station {
  id: number;
  name: string;
  position: number;
  distance_km: number;
  line_id?: number;
  line_name?: string;
  line_color?: string;
  tracks_count?: number;
  has_siding?: boolean;
  created_at?: string;
}

export interface Train {
  id: number;
  schedule_id: number;
  number: string;
  type: 'freight' | 'passenger' | 'service';
  departure_station_id: number;
  arrival_station_id: number;
  departure_time: number;
  arrival_time: number;
  color: string;
  line_style?: 'solid' | 'dashed' | 'dotted' | 'dash-dot' | 'double';
  line_width?: number;
  created_at?: string;
}

export interface LegendItem {
  id: number;
  schedule_id: number;
  type: 'freight' | 'passenger' | 'service';
  label: string;
  color: string;
  dashed: boolean;
  created_at?: string;
}

export interface TrainStop {
  id: number;
  train_id: number;
  station_id: number;
  arrival_time: number;
  departure_time: number;
  stop_duration: number;
  station_name?: string;
  distance_km?: number;
  position?: number;
  created_at?: string;
}

export interface TrackSegment {
  id: number;
  station_from_id: number;
  station_to_id: number;
  is_single_track: boolean;
  created_at?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}?path=${path}`, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function createCRUD<T extends { id: number }>(path: string) {
  return {
    getAll: (params?: Record<string, string | number>): Promise<T[]> => {
      const queryParams = params ? '&' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString() : '';
      return request<T[]>(`${path}${queryParams}`);
    },
    create: (data: Omit<T, 'id' | 'created_at'>): Promise<T> =>
      request<T>(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    update: (data: T): Promise<T> =>
      request<T>(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    delete: (id: number): Promise<void> =>
      fetch(`${API_URL}?path=${path}&id=${id}`, { method: 'DELETE' }).then(() => {}),
  };
}

export const api = {
  lines: createCRUD<Line>('lines'),
  stations: createCRUD<Station>('stations'),
  trains: {
    ...createCRUD<Train>('trains'),
    getAll: (scheduleId: number = 1): Promise<Train[]> => request<Train[]>(`trains&schedule_id=${scheduleId}`),
  },
  legend: {
    getAll: (scheduleId: number = 1): Promise<LegendItem[]> => request<LegendItem[]>(`legend&schedule_id=${scheduleId}`),
    update: (data: LegendItem): Promise<LegendItem> =>
      request<LegendItem>('legend', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  },
  trainStops: {
    ...createCRUD<TrainStop>('train_stops'),
    getAll: async (trainId?: number): Promise<TrainStop[]> => {
      try {
        const params = trainId ? `&train_id=${trainId}` : '';
        return await request<TrainStop[]>(`train_stops${params}`);
      } catch {
        return [];
      }
    },
  },
  trackSegments: createCRUD<TrackSegment>('track_segments'),
};
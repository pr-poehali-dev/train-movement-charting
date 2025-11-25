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

export const api = {
  lines: {
    getAll: async (): Promise<Line[]> => {
      const res = await fetch(`${API_URL}?path=lines`);
      return res.json();
    },
    create: async (data: Omit<Line, 'id'>): Promise<Line> => {
      const res = await fetch(`${API_URL}?path=lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (data: Line): Promise<Line> => {
      const res = await fetch(`${API_URL}?path=lines`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: number): Promise<void> => {
      await fetch(`${API_URL}?path=lines&id=${id}`, { method: 'DELETE' });
    },
  },
  
  stations: {
    getAll: async (): Promise<Station[]> => {
      const res = await fetch(`${API_URL}?path=stations`);
      return res.json();
    },
    create: async (data: Omit<Station, 'id'>): Promise<Station> => {
      const res = await fetch(`${API_URL}?path=stations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (data: Station): Promise<Station> => {
      const res = await fetch(`${API_URL}?path=stations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: number): Promise<void> => {
      await fetch(`${API_URL}?path=stations&id=${id}`, { method: 'DELETE' });
    },
  },
  
  trains: {
    getAll: async (scheduleId: number = 1): Promise<Train[]> => {
      const res = await fetch(`${API_URL}?path=trains&schedule_id=${scheduleId}`);
      return res.json();
    },
    create: async (data: Omit<Train, 'id' | 'created_at'>): Promise<Train> => {
      const res = await fetch(`${API_URL}?path=trains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (data: Train): Promise<Train> => {
      const res = await fetch(`${API_URL}?path=trains`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: number): Promise<void> => {
      await fetch(`${API_URL}?path=trains&id=${id}`, { method: 'DELETE' });
    },
  },
  
  legend: {
    getAll: async (scheduleId: number = 1): Promise<LegendItem[]> => {
      const res = await fetch(`${API_URL}?path=legend&schedule_id=${scheduleId}`);
      return res.json();
    },
    update: async (data: LegendItem): Promise<LegendItem> => {
      const res = await fetch(`${API_URL}?path=legend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },
  
  trainStops: {
    getAll: async (trainId?: number): Promise<TrainStop[]> => {
      const url = trainId 
        ? `${API_URL}?path=train_stops&train_id=${trainId}`
        : `${API_URL}?path=train_stops`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error('HTTP', res.status, ':', url);
        return [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    create: async (data: Omit<TrainStop, 'id' | 'stop_duration' | 'created_at'>): Promise<TrainStop> => {
      const res = await fetch(`${API_URL}?path=train_stops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (data: TrainStop): Promise<TrainStop> => {
      const res = await fetch(`${API_URL}?path=train_stops`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: number): Promise<void> => {
      await fetch(`${API_URL}?path=train_stops&id=${id}`, { method: 'DELETE' });
    },
  },
};
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
};

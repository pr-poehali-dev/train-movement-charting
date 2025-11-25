import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';

interface Train {
  id: string;
  number: string;
  type: 'freight' | 'passenger' | 'service';
  departureStation: string;
  arrivalStation: string;
  departureTime: number;
  arrivalTime: number;
  color: string;
}

interface Station {
  id: string;
  name: string;
  position: number;
}

const Index = () => {
  const [stations] = useState<Station[]>([
    { id: '1', name: 'Ст. Первомайская', position: 0 },
    { id: '2', name: 'Раз. Никольское', position: 1 },
    { id: '3', name: 'Раз. Филимоновский', position: 2 },
    { id: '4', name: 'Обменный разъезд', position: 3 },
  ]);

  const [trains, setTrains] = useState<Train[]>([
    { id: '1', number: '№1', type: 'freight', departureStation: '1', arrivalStation: '3', departureTime: 0, arrivalTime: 8, color: '#0EA5E9' },
    { id: '2', number: '№2', type: 'freight', departureStation: '3', arrivalStation: '1', departureTime: 2, arrivalTime: 10, color: '#F97316' },
    { id: '3', number: '№3', type: 'passenger', departureStation: '1', arrivalStation: '4', departureTime: 4, arrivalTime: 14, color: '#8B5CF6' },
    { id: '4', number: '№4', type: 'service', departureStation: '2', arrivalStation: '4', departureTime: 6, arrivalTime: 12, color: '#10B981' },
  ]);

  const [newTrain, setNewTrain] = useState({
    number: '',
    type: 'freight' as Train['type'],
    departureStation: '',
    arrivalStation: '',
    departureTime: 0,
    arrivalTime: 8,
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const addTrain = () => {
    const train: Train = {
      id: Date.now().toString(),
      ...newTrain,
      color: newTrain.type === 'freight' ? '#0EA5E9' : newTrain.type === 'passenger' ? '#8B5CF6' : '#10B981',
    };
    setTrains([...trains, train]);
    setNewTrain({
      number: '',
      type: 'freight',
      departureStation: '',
      arrivalStation: '',
      departureTime: 0,
      arrivalTime: 8,
    });
  };

  const getStationPosition = (stationId: string) => {
    return stations.find(s => s.id === stationId)?.position || 0;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon name="Train" size={32} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">График движения поездов</h1>
              <p className="text-muted-foreground">Диспетчерская система управления</p>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Icon name="Plus" size={20} />
                Добавить поезд
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новый поезд</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Номер поезда</Label>
                  <Input
                    placeholder="№1"
                    value={newTrain.number}
                    onChange={(e) => setNewTrain({ ...newTrain, number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Тип поезда</Label>
                  <Select value={newTrain.type} onValueChange={(value: Train['type']) => setNewTrain({ ...newTrain, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="freight">Торговозный</SelectItem>
                      <SelectItem value="passenger">Пассажирский</SelectItem>
                      <SelectItem value="service">Хозяйственный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Станция отправления</Label>
                  <Select value={newTrain.departureStation} onValueChange={(value) => setNewTrain({ ...newTrain, departureStation: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Станция прибытия</Label>
                  <Select value={newTrain.arrivalStation} onValueChange={(value) => setNewTrain({ ...newTrain, arrivalStation: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Время отправления (ч)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={newTrain.departureTime}
                      onChange={(e) => setNewTrain({ ...newTrain, departureTime: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Время прибытия (ч)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={newTrain.arrivalTime}
                      onChange={(e) => setNewTrain({ ...newTrain, arrivalTime: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <Button onClick={addTrain} className="w-full">Добавить</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="graph" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="graph" className="gap-2">
              <Icon name="LineChart" size={16} />
              График
            </TabsTrigger>
            <TabsTrigger value="trains" className="gap-2">
              <Icon name="Train" size={16} />
              Поезда ({trains.length})
            </TabsTrigger>
            <TabsTrigger value="stations" className="gap-2">
              <Icon name="MapPin" size={16} />
              Станции ({stations.length})
            </TabsTrigger>
            <TabsTrigger value="legend" className="gap-2">
              <Icon name="Info" size={16} />
              Легенда
            </TabsTrigger>
          </TabsList>

          <TabsContent value="graph" className="mt-6">
            <Card className="p-6">
              <div className="relative" style={{ height: '600px' }}>
                <svg width="100%" height="100%" className="border border-border rounded-lg bg-card">
                  <defs>
                    <pattern id="grid" width="60" height="150" patternUnits="userSpaceOnUse">
                      <path d="M 60 0 L 0 0 0 150" fill="none" stroke="hsl(var(--muted))" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  {hours.map((hour, i) => (
                    <g key={hour}>
                      <line
                        x1={60 + i * 60}
                        y1="0"
                        x2={60 + i * 60}
                        y2="600"
                        stroke="hsl(var(--border))"
                        strokeWidth="1"
                      />
                      <text
                        x={60 + i * 60}
                        y="20"
                        textAnchor="middle"
                        fill="hsl(var(--foreground))"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        {hour}
                      </text>
                    </g>
                  ))}

                  {stations.map((station, i) => (
                    <g key={station.id}>
                      <line
                        x1="0"
                        y1={100 + i * 150}
                        x2="100%"
                        y2={100 + i * 150}
                        stroke="hsl(var(--border))"
                        strokeWidth="2"
                      />
                      <text
                        x="10"
                        y={95 + i * 150}
                        fill="hsl(var(--foreground))"
                        fontSize="14"
                        fontWeight="600"
                      >
                        {station.name}
                      </text>
                    </g>
                  ))}

                  {trains.map(train => {
                    const depPos = getStationPosition(train.departureStation);
                    const arrPos = getStationPosition(train.arrivalStation);
                    const x1 = 60 + train.departureTime * 60;
                    const y1 = 100 + depPos * 150;
                    const x2 = 60 + train.arrivalTime * 60;
                    const y2 = 100 + arrPos * 150;

                    return (
                      <g key={train.id}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={train.color}
                          strokeWidth="2"
                          strokeDasharray={train.type === 'service' ? '5,5' : '0'}
                          className="transition-all duration-300 hover:stroke-width-4"
                        />
                        <circle cx={x1} cy={y1} r="4" fill={train.color} />
                        <circle cx={x2} cy={y2} r="4" fill={train.color} />
                        <text
                          x={(x1 + x2) / 2}
                          y={(y1 + y2) / 2 - 10}
                          fill={train.color}
                          fontSize="12"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {train.number}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="trains" className="mt-6">
            <div className="grid gap-4">
              {trains.map(train => (
                <Card key={train.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: train.color + '20' }}>
                        <Icon name="Train" size={24} style={{ color: train.color }} />
                      </div>
                      <div>
                        <div className="font-bold text-lg">{train.number}</div>
                        <div className="text-sm text-muted-foreground">
                          {train.type === 'freight' ? 'Торговозный' : train.type === 'passenger' ? 'Пассажирский' : 'Хозяйственный'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {stations.find(s => s.id === train.departureStation)?.name} → {stations.find(s => s.id === train.arrivalStation)?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {train.departureTime}:00 - {train.arrivalTime}:00
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="stations" className="mt-6">
            <div className="grid gap-4">
              {stations.map(station => (
                <Card key={station.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Icon name="MapPin" size={24} className="text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-lg">{station.name}</div>
                      <div className="text-sm text-muted-foreground">Позиция: {station.position + 1}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="legend" className="mt-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">Условные обозначения</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <svg width="80" height="2">
                    <line x1="0" y1="1" x2="80" y2="1" stroke="#0EA5E9" strokeWidth="3" />
                  </svg>
                  <span>Торговозные поезда (сплошная линия)</span>
                </div>
                <div className="flex items-center gap-4">
                  <svg width="80" height="2">
                    <line x1="0" y1="1" x2="80" y2="1" stroke="#8B5CF6" strokeWidth="3" />
                  </svg>
                  <span>Пассажирские поезда (сплошная линия)</span>
                </div>
                <div className="flex items-center gap-4">
                  <svg width="80" height="2">
                    <line x1="0" y1="1" x2="80" y2="1" stroke="#10B981" strokeWidth="3" strokeDasharray="5,5" />
                  </svg>
                  <span>Хозяйственные поезда (пунктирная линия)</span>
                </div>
                <div className="flex items-center gap-4">
                  <svg width="20" height="20">
                    <circle cx="10" cy="10" r="4" fill="#0EA5E9" />
                  </svg>
                  <span>Точка отправления/прибытия</span>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;

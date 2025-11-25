import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import Icon from '@/components/ui/icon';
import { api, Line, Station, Train, LegendItem } from '@/lib/api';

const Index = () => {
  const [isMetroMode, setIsMetroMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  const [lines, setLines] = useState<Line[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [trains, setTrains] = useState<Train[]>([]);
  const [legendItems, setLegendItems] = useState<LegendItem[]>([]);

  const [trainDialogOpen, setTrainDialogOpen] = useState(false);
  const [stationDialogOpen, setStationDialogOpen] = useState(false);
  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [legendDialogOpen, setLegendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [editingTrain, setEditingTrain] = useState<Train | null>(null);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [editingLine, setEditingLine] = useState<Line | null>(null);
  const [editingLegend, setEditingLegend] = useState<LegendItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'train' | 'station' | 'line', id: number } | null>(null);

  const [trainForm, setTrainForm] = useState({
    number: '',
    type: 'freight' as Train['type'],
    departure_station_id: 0,
    arrival_station_id: 0,
    departure_time: 0,
    arrival_time: 8,
  });

  const [stationForm, setStationForm] = useState({
    name: '',
    position: 0,
    line_id: undefined as number | undefined,
  });

  const [lineForm, setLineForm] = useState({
    name: '',
    color: '#0EA5E9',
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [linesData, stationsData, trainsData, legendData] = await Promise.all([
        api.lines.getAll(),
        api.stations.getAll(),
        api.trains.getAll(1),
        api.legend.getAll(1),
      ]);
      setLines(linesData);
      setStations(stationsData);
      setTrains(trainsData);
      setLegendItems(legendData);
    } catch (error) {
      toast({ title: 'Ошибка загрузки', description: String(error), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const saveTrain = async () => {
    try {
      const legendItem = legendItems.find(l => l.type === trainForm.type);
      const color = legendItem?.color || '#0EA5E9';

      const trainData = {
        ...trainForm,
        schedule_id: 1,
        color,
      };

      if (editingTrain) {
        await api.trains.update({ ...trainData, id: editingTrain.id });
        toast({ title: 'Поезд обновлён' });
      } else {
        await api.trains.create(trainData);
        toast({ title: 'Поезд добавлен' });
      }

      await loadData();
      setTrainForm({
        number: '',
        type: 'freight',
        departure_station_id: 0,
        arrival_station_id: 0,
        departure_time: 0,
        arrival_time: 8,
      });
      setEditingTrain(null);
      setTrainDialogOpen(false);
    } catch (error) {
      toast({ title: 'Ошибка', description: String(error), variant: 'destructive' });
    }
  };

  const saveStation = async () => {
    try {
      if (editingStation) {
        await api.stations.update({ ...stationForm, id: editingStation.id });
        toast({ title: 'Станция обновлена' });
      } else {
        await api.stations.create(stationForm);
        toast({ title: 'Станция добавлена' });
      }

      await loadData();
      setStationForm({ name: '', position: 0, line_id: undefined });
      setEditingStation(null);
      setStationDialogOpen(false);
    } catch (error) {
      toast({ title: 'Ошибка', description: String(error), variant: 'destructive' });
    }
  };

  const saveLine = async () => {
    try {
      if (editingLine) {
        await api.lines.update({ ...lineForm, id: editingLine.id });
        toast({ title: 'Линия обновлена' });
      } else {
        await api.lines.create(lineForm);
        toast({ title: 'Линия добавлена' });
      }

      await loadData();
      setLineForm({ name: '', color: '#0EA5E9' });
      setEditingLine(null);
      setLineDialogOpen(false);
    } catch (error) {
      toast({ title: 'Ошибка', description: String(error), variant: 'destructive' });
    }
  };

  const saveLegendItem = async () => {
    if (!editingLegend) return;
    try {
      await api.legend.update(editingLegend);
      toast({ title: 'Легенда обновлена' });
      await loadData();
      setEditingLegend(null);
      setLegendDialogOpen(false);
    } catch (error) {
      toast({ title: 'Ошибка', description: String(error), variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'train') {
        await api.trains.delete(deleteTarget.id);
        toast({ title: 'Поезд удалён' });
      } else if (deleteTarget.type === 'station') {
        await api.stations.delete(deleteTarget.id);
        toast({ title: 'Станция удалена' });
      } else if (deleteTarget.type === 'line') {
        await api.lines.delete(deleteTarget.id);
        toast({ title: 'Линия удалена' });
      }
      await loadData();
      setDeleteTarget(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      toast({ title: 'Ошибка удаления', description: String(error), variant: 'destructive' });
    }
  };

  const openEditTrain = (train: Train) => {
    setEditingTrain(train);
    setTrainForm({
      number: train.number,
      type: train.type,
      departure_station_id: train.departure_station_id,
      arrival_station_id: train.arrival_station_id,
      departure_time: train.departure_time,
      arrival_time: train.arrival_time,
    });
    setTrainDialogOpen(true);
  };

  const openEditStation = (station: Station) => {
    setEditingStation(station);
    setStationForm({
      name: station.name,
      position: station.position,
      line_id: station.line_id,
    });
    setStationDialogOpen(true);
  };

  const openEditLine = (line: Line) => {
    setEditingLine(line);
    setLineForm({
      name: line.name,
      color: line.color,
    });
    setLineDialogOpen(true);
  };

  const exportToPDF = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = 1920;
    canvas.height = 1080;
    
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const pdfData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `график-движения-${new Date().toISOString().split('T')[0]}.png`;
      link.href = pdfData;
      link.click();
      toast({ title: 'График экспортирован' });
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const getLegendItemByType = (type: Train['type']) => {
    return legendItems.find(l => l.type === type);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" size={48} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon name={isMetroMode ? "TramFront" : "Train"} size={32} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {isMetroMode ? 'График движения метрополитена' : 'График движения поездов'}
              </h1>
              <p className="text-muted-foreground">Диспетчерская система управления</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Icon name="Train" size={18} />
              <Switch checked={isMetroMode} onCheckedChange={setIsMetroMode} />
              <Icon name="TramFront" size={18} />
            </div>
            
            <Button variant="outline" onClick={exportToPDF} className="gap-2">
              <Icon name="Download" size={20} />
              Экспорт
            </Button>
            
            <Dialog open={trainDialogOpen} onOpenChange={setTrainDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => setEditingTrain(null)}>
                  <Icon name="Plus" size={20} />
                  Добавить
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTrain ? 'Редактировать' : 'Новый'} {isMetroMode ? 'состав' : 'поезд'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Номер</Label>
                    <Input
                      placeholder="№1"
                      value={trainForm.number}
                      onChange={(e) => setTrainForm({ ...trainForm, number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Тип</Label>
                    <Select value={trainForm.type} onValueChange={(value: Train['type']) => setTrainForm({ ...trainForm, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {legendItems.map(l => (
                          <SelectItem key={l.type} value={l.type}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Станция отправления</Label>
                    <Select value={String(trainForm.departure_station_id)} onValueChange={(value) => setTrainForm({ ...trainForm, departure_station_id: parseInt(value) })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stations.map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name} {isMetroMode && s.line_name && `(${s.line_name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Станция прибытия</Label>
                    <Select value={String(trainForm.arrival_station_id)} onValueChange={(value) => setTrainForm({ ...trainForm, arrival_station_id: parseInt(value) })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stations.map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name} {isMetroMode && s.line_name && `(${s.line_name})`}
                          </SelectItem>
                        ))}
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
                        value={trainForm.departure_time}
                        onChange={(e) => setTrainForm({ ...trainForm, departure_time: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Время прибытия (ч)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        value={trainForm.arrival_time}
                        onChange={(e) => setTrainForm({ ...trainForm, arrival_time: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <Button onClick={saveTrain} className="w-full">
                    {editingTrain ? 'Сохранить' : 'Добавить'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="graph" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="graph" className="gap-2">
              <Icon name="LineChart" size={16} />
              График
            </TabsTrigger>
            <TabsTrigger value="trains" className="gap-2">
              <Icon name={isMetroMode ? "TramFront" : "Train"} size={16} />
              {isMetroMode ? 'Составы' : 'Поезда'} ({trains.length})
            </TabsTrigger>
            <TabsTrigger value="stations" className="gap-2">
              <Icon name="MapPin" size={16} />
              Станции ({stations.length})
            </TabsTrigger>
            <TabsTrigger value="lines" className="gap-2">
              <Icon name="Route" size={16} />
              Линии ({lines.length})
            </TabsTrigger>
            <TabsTrigger value="legend" className="gap-2">
              <Icon name="Info" size={16} />
              Легенда
            </TabsTrigger>
          </TabsList>

          <TabsContent value="graph" className="mt-6">
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>
                  <Icon name="ZoomOut" size={16} />
                </Button>
                <span className="text-sm font-medium">{Math.round(zoom * 100)}%</span>
                <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>
                  <Icon name="ZoomIn" size={16} />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setZoom(1)}>
                  <Icon name="Minimize2" size={16} />
                </Button>
              </div>
              
              <div className="relative overflow-auto" style={{ height: '600px' }}>
                <svg 
                  ref={svgRef}
                  width={`${100 * zoom}%`} 
                  height="600" 
                  className="border border-border rounded-lg bg-card"
                >
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
                        stroke={station.line_color || 'hsl(var(--border))'}
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
                        {isMetroMode && station.line_name && (
                          <tspan fill={station.line_color} fontSize="12"> ({station.line_name})</tspan>
                        )}
                      </text>
                    </g>
                  ))}

                  {trains.map(train => {
                    const depStation = stations.find(s => s.id === train.departure_station_id);
                    const arrStation = stations.find(s => s.id === train.arrival_station_id);
                    if (!depStation || !arrStation) return null;

                    const x1 = 60 + train.departure_time * 60;
                    const y1 = 100 + depStation.position * 150;
                    const x2 = 60 + train.arrival_time * 60;
                    const y2 = 100 + arrStation.position * 150;
                    const legendItem = getLegendItemByType(train.type);

                    return (
                      <g key={train.id}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={train.color}
                          strokeWidth="3"
                          strokeDasharray={legendItem?.dashed ? '5,5' : '0'}
                          className="transition-all duration-300 hover:stroke-width-5 cursor-pointer"
                        />
                        <circle cx={x1} cy={y1} r="5" fill={train.color} />
                        <circle cx={x2} cy={y2} r="5" fill={train.color} />
                        <text
                          x={(x1 + x2) / 2}
                          y={(y1 + y2) / 2 - 10}
                          fill={train.color}
                          fontSize="13"
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
              {trains.map(train => {
                const legendItem = getLegendItemByType(train.type);
                const depStation = stations.find(s => s.id === train.departure_station_id);
                const arrStation = stations.find(s => s.id === train.arrival_station_id);
                
                return (
                  <Card key={train.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: train.color + '20' }}>
                          <Icon name={isMetroMode ? "TramFront" : "Train"} size={24} style={{ color: train.color }} />
                        </div>
                        <div>
                          <div className="font-bold text-lg">{train.number}</div>
                          <div className="text-sm text-muted-foreground">
                            {legendItem?.label}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {depStation?.name} → {arrStation?.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {train.departure_time}:00 - {train.arrival_time}:00
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditTrain(train)}>
                            <Icon name="Pencil" size={16} />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => { setDeleteTarget({ type: 'train', id: train.id }); setDeleteDialogOpen(true); }}>
                            <Icon name="Trash2" size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="stations" className="mt-6">
            <div className="mb-4">
              <Dialog open={stationDialogOpen} onOpenChange={setStationDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingStation(null)} className="gap-2">
                    <Icon name="Plus" size={20} />
                    Добавить станцию
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingStation ? 'Редактировать' : 'Новая'} станция</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Название</Label>
                      <Input
                        value={stationForm.name}
                        onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Позиция</Label>
                      <Input
                        type="number"
                        min="0"
                        value={stationForm.position}
                        onChange={(e) => setStationForm({ ...stationForm, position: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Линия (опционально)</Label>
                      <Select value={String(stationForm.line_id || '')} onValueChange={(value) => setStationForm({ ...stationForm, line_id: value ? parseInt(value) : undefined })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Без линии" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Без линии</SelectItem>
                          {lines.map(l => (
                            <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={saveStation} className="w-full">
                      {editingStation ? 'Сохранить' : 'Добавить'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid gap-4">
              {stations.map(station => (
                <Card key={station.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: station.line_color ? station.line_color + '20' : 'hsl(var(--primary) / 0.1)' }}>
                        <Icon name="MapPin" size={24} style={{ color: station.line_color || 'hsl(var(--primary))' }} />
                      </div>
                      <div>
                        <div className="font-bold text-lg">{station.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Позиция: {station.position + 1}
                          {isMetroMode && station.line_name && ` • Линия: ${station.line_name}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditStation(station)}>
                        <Icon name="Pencil" size={16} />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => { setDeleteTarget({ type: 'station', id: station.id }); setDeleteDialogOpen(true); }}>
                        <Icon name="Trash2" size={16} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="lines" className="mt-6">
            <div className="mb-4">
              <Dialog open={lineDialogOpen} onOpenChange={setLineDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingLine(null)} className="gap-2">
                    <Icon name="Plus" size={20} />
                    Добавить линию
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingLine ? 'Редактировать' : 'Новая'} линия</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Название</Label>
                      <Input
                        value={lineForm.name}
                        onChange={(e) => setLineForm({ ...lineForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Цвет</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={lineForm.color}
                          onChange={(e) => setLineForm({ ...lineForm, color: e.target.value })}
                          className="w-20 h-10"
                        />
                        <Input
                          value={lineForm.color}
                          onChange={(e) => setLineForm({ ...lineForm, color: e.target.value })}
                          placeholder="#0EA5E9"
                        />
                      </div>
                    </div>
                    <Button onClick={saveLine} className="w-full">
                      {editingLine ? 'Сохранить' : 'Добавить'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid gap-4">
              {lines.map(line => (
                <Card key={line.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: line.color + '20' }}>
                        <Icon name="Route" size={24} style={{ color: line.color }} />
                      </div>
                      <div>
                        <div className="font-bold text-lg">{line.name}</div>
                        <div className="text-sm" style={{ color: line.color }}>{line.color}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditLine(line)}>
                        <Icon name="Pencil" size={16} />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => { setDeleteTarget({ type: 'line', id: line.id }); setDeleteDialogOpen(true); }}>
                        <Icon name="Trash2" size={16} />
                      </Button>
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
                {legendItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <svg width="80" height="2">
                        <line 
                          x1="0" 
                          y1="1" 
                          x2="80" 
                          y2="1" 
                          stroke={item.color} 
                          strokeWidth="3"
                          strokeDasharray={item.dashed ? '5,5' : '0'}
                        />
                      </svg>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { setEditingLegend(item); setLegendDialogOpen(true); }}
                    >
                      <Icon name="Pencil" size={16} />
                    </Button>
                  </div>
                ))}
                
                <div className="flex items-center gap-4 mt-6 pt-4 border-t">
                  <svg width="20" height="20">
                    <circle cx="10" cy="10" r="5" fill="#0EA5E9" />
                  </svg>
                  <span>Точка отправления/прибытия</span>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить {deleteTarget?.type === 'train' ? (isMetroMode ? 'состав' : 'поезд') : deleteTarget?.type === 'station' ? 'станцию' : 'линию'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={legendDialogOpen} onOpenChange={setLegendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать легенду</DialogTitle>
          </DialogHeader>
          {editingLegend && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  value={editingLegend.label}
                  onChange={(e) => setEditingLegend({ ...editingLegend, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Цвет</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={editingLegend.color}
                    onChange={(e) => setEditingLegend({ ...editingLegend, color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={editingLegend.color}
                    onChange={(e) => setEditingLegend({ ...editingLegend, color: e.target.value })}
                    placeholder="#0EA5E9"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingLegend.dashed}
                  onCheckedChange={(checked) => setEditingLegend({ ...editingLegend, dashed: checked })}
                />
                <Label>Пунктирная линия</Label>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">Предпросмотр:</div>
                <svg width="100%" height="30">
                  <line
                    x1="0"
                    y1="15"
                    x2="100%"
                    y2="15"
                    stroke={editingLegend.color}
                    strokeWidth="3"
                    strokeDasharray={editingLegend.dashed ? '5,5' : '0'}
                  />
                </svg>
              </div>
              <Button onClick={saveLegendItem} className="w-full">Сохранить</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;

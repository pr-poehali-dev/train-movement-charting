import { useState, useRef } from 'react';
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
  line?: string;
}

interface LegendItem {
  id: string;
  type: Train['type'];
  label: string;
  color: string;
  dashed: boolean;
}

const Index = () => {
  const [isMetroMode, setIsMetroMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const [stations, setStations] = useState<Station[]>([
    { id: '1', name: 'Ст. Первомайская', position: 0, line: 'Красная' },
    { id: '2', name: 'Раз. Никольское', position: 1, line: 'Красная' },
    { id: '3', name: 'Раз. Филимоновский', position: 2, line: 'Синяя' },
    { id: '4', name: 'Обменный разъезд', position: 3, line: 'Синяя' },
  ]);

  const [trains, setTrains] = useState<Train[]>([
    { id: '1', number: '№1', type: 'freight', departureStation: '1', arrivalStation: '3', departureTime: 0, arrivalTime: 8, color: '#0EA5E9' },
    { id: '2', number: '№2', type: 'freight', departureStation: '3', arrivalStation: '1', departureTime: 2, arrivalTime: 10, color: '#F97316' },
    { id: '3', number: '№3', type: 'passenger', departureStation: '1', arrivalStation: '4', departureTime: 4, arrivalTime: 14, color: '#8B5CF6' },
    { id: '4', number: '№4', type: 'service', departureStation: '2', arrivalStation: '4', departureTime: 6, arrivalTime: 12, color: '#10B981' },
  ]);

  const [legendItems, setLegendItems] = useState<LegendItem[]>([
    { id: '1', type: 'freight', label: 'Торговозные поезда', color: '#0EA5E9', dashed: false },
    { id: '2', type: 'passenger', label: 'Пассажирские поезда', color: '#8B5CF6', dashed: false },
    { id: '3', type: 'service', label: 'Хозяйственные поезда', color: '#10B981', dashed: true },
  ]);

  const [trainDialogOpen, setTrainDialogOpen] = useState(false);
  const [editingTrain, setEditingTrain] = useState<Train | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [trainToDelete, setTrainToDelete] = useState<string | null>(null);
  const [legendDialogOpen, setLegendDialogOpen] = useState(false);
  const [editingLegend, setEditingLegend] = useState<LegendItem | null>(null);

  const [trainForm, setTrainForm] = useState({
    number: '',
    type: 'freight' as Train['type'],
    departureStation: '',
    arrivalStation: '',
    departureTime: 0,
    arrivalTime: 8,
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const saveTrain = () => {
    const legendItem = legendItems.find(l => l.type === trainForm.type);
    const color = legendItem?.color || '#0EA5E9';

    if (editingTrain) {
      setTrains(trains.map(t => t.id === editingTrain.id ? { ...t, ...trainForm, color } : t));
      toast({ title: 'Поезд обновлён' });
    } else {
      const train: Train = {
        id: Date.now().toString(),
        ...trainForm,
        color,
      };
      setTrains([...trains, train]);
      toast({ title: 'Поезд добавлен' });
    }

    setTrainForm({
      number: '',
      type: 'freight',
      departureStation: '',
      arrivalStation: '',
      departureTime: 0,
      arrivalTime: 8,
    });
    setEditingTrain(null);
    setTrainDialogOpen(false);
  };

  const openEditTrain = (train: Train) => {
    setEditingTrain(train);
    setTrainForm({
      number: train.number,
      type: train.type,
      departureStation: train.departureStation,
      arrivalStation: train.arrivalStation,
      departureTime: train.departureTime,
      arrivalTime: train.arrivalTime,
    });
    setTrainDialogOpen(true);
  };

  const deleteTrain = () => {
    if (trainToDelete) {
      setTrains(trains.filter(t => t.id !== trainToDelete));
      toast({ title: 'Поезд удалён', variant: 'destructive' });
      setTrainToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const saveLegendItem = () => {
    if (editingLegend) {
      setLegendItems(legendItems.map(l => l.id === editingLegend.id ? editingLegend : l));
      setTrains(trains.map(t => t.type === editingLegend.type ? { ...t, color: editingLegend.color } : t));
      toast({ title: 'Легенда обновлена' });
      setEditingLegend(null);
      setLegendDialogOpen(false);
    }
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

  const getStationPosition = (stationId: string) => {
    return stations.find(s => s.id === stationId)?.position || 0;
  };

  const getLegendItemByType = (type: Train['type']) => {
    return legendItems.find(l => l.type === type);
  };

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
                    <Label>Номер {isMetroMode ? 'состава' : 'поезда'}</Label>
                    <Input
                      placeholder="№1"
                      value={trainForm.number}
                      onChange={(e) => setTrainForm({ ...trainForm, number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Тип {isMetroMode ? 'состава' : 'поезда'}</Label>
                    <Select value={trainForm.type} onValueChange={(value: Train['type']) => setTrainForm({ ...trainForm, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freight">{legendItems.find(l => l.type === 'freight')?.label}</SelectItem>
                        <SelectItem value="passenger">{legendItems.find(l => l.type === 'passenger')?.label}</SelectItem>
                        <SelectItem value="service">{legendItems.find(l => l.type === 'service')?.label}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Станция отправления</Label>
                    <Select value={trainForm.departureStation} onValueChange={(value) => setTrainForm({ ...trainForm, departureStation: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stations.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} {isMetroMode && s.line && `(${s.line})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Станция прибытия</Label>
                    <Select value={trainForm.arrivalStation} onValueChange={(value) => setTrainForm({ ...trainForm, arrivalStation: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stations.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} {isMetroMode && s.line && `(${s.line})`}
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
                        value={trainForm.departureTime}
                        onChange={(e) => setTrainForm({ ...trainForm, departureTime: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Время прибытия (ч)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        value={trainForm.arrivalTime}
                        onChange={(e) => setTrainForm({ ...trainForm, arrivalTime: parseInt(e.target.value) || 0 })}
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
          <TabsList className="grid w-full grid-cols-4">
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
                <Button variant="outline" size="sm" onClick={() => { setZoom(1); setPanX(0); }}>
                  <Icon name="Minimize2" size={16} />
                </Button>
              </div>
              
              <div className="relative overflow-auto" style={{ height: '600px' }}>
                <svg 
                  ref={svgRef}
                  width={`${100 * zoom}%`} 
                  height="600" 
                  className="border border-border rounded-lg bg-card"
                  style={{ transform: `translateX(${panX}px)` }}
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
                        {isMetroMode && station.line && (
                          <tspan fill="hsl(var(--muted-foreground))" fontSize="12"> ({station.line})</tspan>
                        )}
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
                            {stations.find(s => s.id === train.departureStation)?.name} → {stations.find(s => s.id === train.arrivalStation)?.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {train.departureTime}:00 - {train.arrivalTime}:00
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditTrain(train)}>
                            <Icon name="Pencil" size={16} />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => { setTrainToDelete(train.id); setDeleteDialogOpen(true); }}>
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
            <div className="grid gap-4">
              {stations.map(station => (
                <Card key={station.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Icon name="MapPin" size={24} className="text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-lg">{station.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Позиция: {station.position + 1}
                        {isMetroMode && station.line && ` • Линия: ${station.line}`}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="legend" className="mt-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Условные обозначения</h3>
              </div>
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
            <AlertDialogTitle>Удалить {isMetroMode ? 'состав' : 'поезд'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. {isMetroMode ? 'Состав' : 'Поезд'} будет удалён из графика.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTrain}>Удалить</AlertDialogAction>
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

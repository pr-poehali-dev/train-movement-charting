import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
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
  const [conflicts, setConflicts] = useState<Array<{train1: Train, train2: Train}>>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    arrival_time: 480,
  });

  const [stationForm, setStationForm] = useState({
    name: '',
    position: 0,
    distance_km: 0,
    line_id: undefined as number | undefined,
  });

  const [lineForm, setLineForm] = useState({
    name: '',
    color: '#0EA5E9',
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    loadData().then(() => {
      if (trains.length > 0) detectConflicts();
    });
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
      detectConflicts();
      setTrainForm({
        number: '',
        type: 'freight',
        departure_station_id: 0,
        arrival_station_id: 0,
        departure_time: 0,
        arrival_time: 480,
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
      setStationForm({ name: '', position: 0, distance_km: 0, line_id: undefined });
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
      distance_km: station.distance_km || 0,
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
    
    const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
    const rects = svgClone.querySelectorAll('rect[fill="hsl(var(--card))"]');
    rects.forEach(rect => rect.setAttribute('fill', '#FFFFFF'));
    
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    const pxPerMm = 3.7795275591;
    const svgWidth = parseFloat(svgClone.getAttribute('width') || '5670');
    const svgHeight = parseFloat(svgClone.getAttribute('height') || '700');
    
    canvas.width = svgWidth;
    canvas.height = svgHeight;
    
    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
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

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const calculateSpeed = (train: Train) => {
    const depStation = stations.find(s => s.id === train.departure_station_id);
    const arrStation = stations.find(s => s.id === train.arrival_station_id);
    if (!depStation || !arrStation) return 0;
    
    const distance = Math.abs(arrStation.distance_km - depStation.distance_km);
    const timeMinutes = Math.abs(train.arrival_time - train.departure_time);
    const timeHours = timeMinutes / 60;
    
    return timeHours > 0 ? distance / timeHours : 0;
  };

  const checkIntersection = (t1: Train, t2: Train) => {
    const d1 = stations.find(s => s.id === t1.departure_station_id);
    const a1 = stations.find(s => s.id === t1.arrival_station_id);
    const d2 = stations.find(s => s.id === t2.departure_station_id);
    const a2 = stations.find(s => s.id === t2.arrival_station_id);
    
    if (!d1 || !a1 || !d2 || !a2) return false;
    
    const x1 = t1.departure_time;
    const x2 = t1.arrival_time;
    const y1 = d1.distance_km;
    const y2 = a1.distance_km;
    
    const x3 = t2.departure_time;
    const x4 = t2.arrival_time;
    const y3 = d2.distance_km;
    const y4 = a2.distance_km;
    
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.001) return false;
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    return t > 0 && t < 1 && u > 0 && u < 1;
  };

  const detectConflicts = () => {
    const foundConflicts: Array<{train1: Train, train2: Train}> = [];
    
    for (let i = 0; i < trains.length; i++) {
      for (let j = i + 1; j < trains.length; j++) {
        if (checkIntersection(trains[i], trains[j])) {
          foundConflicts.push({ train1: trains[i], train2: trains[j] });
        }
      }
    }
    
    setConflicts(foundConflicts);
    
    if (foundConflicts.length > 0) {
      toast({ 
        title: `Обнаружено конфликтов: ${foundConflicts.length}`,
        description: 'Проверьте вкладку "График" для деталей',
        variant: 'destructive'
      });
    } else {
      toast({ title: 'Конфликтов не обнаружено', description: 'Все маршруты безопасны' });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let importedCount = 0;

      for (const row of jsonData as any[]) {
        if (!row['Номер'] || !row['Отправление'] || !row['Прибытие']) continue;

        const depStationName = String(row['Станция отправления'] || '').trim();
        const arrStationName = String(row['Станция прибытия'] || '').trim();

        const depStation = stations.find(s => s.name === depStationName);
        const arrStation = stations.find(s => s.name === arrStationName);

        if (!depStation || !arrStation) continue;

        const parseTime = (timeStr: string): number => {
          const parts = String(timeStr).split(':');
          const hours = parseInt(parts[0]) || 0;
          const minutes = parseInt(parts[1]) || 0;
          return hours * 60 + minutes;
        };

        const trainData = {
          schedule_id: 1,
          number: String(row['Номер']),
          type: (row['Тип'] === 'Пассажирский' ? 'passenger' : row['Тип'] === 'Служебный' ? 'service' : 'freight') as Train['type'],
          departure_station_id: depStation.id,
          arrival_station_id: arrStation.id,
          departure_time: parseTime(row['Отправление']),
          arrival_time: parseTime(row['Прибытие']),
          color: row['Цвет'] || '#0EA5E9',
        };

        await api.trains.create(trainData);
        importedCount++;
      }

      if (importedCount > 0) {
        toast({ title: `Импортировано поездов: ${importedCount}` });
        await loadData();
        detectConflicts();
        setImportDialogOpen(false);
      } else {
        toast({ title: 'Не удалось импортировать данные', description: 'Проверьте формат файла', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка импорта', description: String(error), variant: 'destructive' });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportTemplate = () => {
    const template = [
      {
        'Номер': '101',
        'Тип': 'Пассажирский',
        'Станция отправления': stations[0]?.name || 'Станция А',
        'Станция прибытия': stations[1]?.name || 'Станция Б',
        'Отправление': '08:00',
        'Прибытие': '10:30',
        'Цвет': '#0EA5E9'
      },
      {
        'Номер': '202',
        'Тип': 'Грузовой',
        'Станция отправления': stations[0]?.name || 'Станция А',
        'Станция прибытия': stations[2]?.name || 'Станция В',
        'Отправление': '14:00',
        'Прибытие': '18:00',
        'Цвет': '#F97316'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Поезда');
    XLSX.writeFile(wb, 'template_trains.xlsx');
    toast({ title: 'Шаблон скачан', description: 'Заполните файл и импортируйте обратно' });
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
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2 md:gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon name={isMetroMode ? "TramFront" : "Train"} size={24} className="text-primary md:w-8 md:h-8" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-bold">
                {isMetroMode ? 'График движения метрополитена' : 'График движения поездов'}
              </h1>
              <p className="text-muted-foreground text-xs md:text-base hidden sm:block">Диспетчерская система управления</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center gap-1 md:gap-2">
              <Icon name="Train" size={16} className="md:w-[18px] md:h-[18px]" />
              <Switch checked={isMetroMode} onCheckedChange={setIsMetroMode} />
              <Icon name="TramFront" size={16} className="md:w-[18px] md:h-[18px]" />
            </div>
            
            <Button variant="outline" onClick={exportToPDF} className="gap-1 md:gap-2 h-8 md:h-10 px-2 md:px-4">
              <Icon name="Download" size={16} className="md:w-5 md:h-5" />
              <span className="hidden sm:inline">Экспорт PNG</span>
            </Button>
            
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-1 md:gap-2 h-8 md:h-10 px-2 md:px-4">
                  <Icon name="Upload" size={16} className="md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Импорт</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Импорт расписания</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Загрузите Excel (.xlsx) или CSV файл с расписанием поездов.
                  </p>
                  <div className="space-y-2">
                    <Label>Формат файла:</Label>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>• Номер - номер поезда</div>
                      <div>• Тип - Пассажирский/Грузовой/Служебный</div>
                      <div>• Станция отправления - название станции</div>
                      <div>• Станция прибытия - название станции</div>
                      <div>• Отправление - время в формате ЧЧ:ММ</div>
                      <div>• Прибытие - время в формате ЧЧ:ММ</div>
                      <div>• Цвет (опционально) - HEX цвет</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={exportTemplate} variant="outline" className="flex-1 gap-2">
                      <Icon name="FileDown" size={16} />
                      Скачать шаблон
                    </Button>
                    <Button onClick={() => fileInputRef.current?.click()} className="flex-1 gap-2">
                      <Icon name="Upload" size={16} />
                      Выбрать файл
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={trainDialogOpen} onOpenChange={setTrainDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1 md:gap-2 h-8 md:h-10 px-2 md:px-4" onClick={() => setEditingTrain(null)}>
                  <Icon name="Plus" size={16} className="md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Добавить</span>
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
                      <Label>Время отправления (ч:мм)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          placeholder="ЧЧ"
                          value={Math.floor(trainForm.departure_time / 60)}
                          onChange={(e) => {
                            const hours = parseInt(e.target.value) || 0;
                            const minutes = trainForm.departure_time % 60;
                            setTrainForm({ ...trainForm, departure_time: hours * 60 + minutes });
                          }}
                        />
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          placeholder="ММ"
                          value={trainForm.departure_time % 60}
                          onChange={(e) => {
                            const hours = Math.floor(trainForm.departure_time / 60);
                            const minutes = parseInt(e.target.value) || 0;
                            setTrainForm({ ...trainForm, departure_time: hours * 60 + minutes });
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Время прибытия (ч:мм)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          placeholder="ЧЧ"
                          value={Math.floor(trainForm.arrival_time / 60)}
                          onChange={(e) => {
                            const hours = parseInt(e.target.value) || 0;
                            const minutes = trainForm.arrival_time % 60;
                            setTrainForm({ ...trainForm, arrival_time: hours * 60 + minutes });
                          }}
                        />
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          placeholder="ММ"
                          value={trainForm.arrival_time % 60}
                          onChange={(e) => {
                            const hours = Math.floor(trainForm.arrival_time / 60);
                            const minutes = parseInt(e.target.value) || 0;
                            setTrainForm({ ...trainForm, arrival_time: hours * 60 + minutes });
                          }}
                        />
                      </div>
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
          <TabsList className="grid w-full grid-cols-6 h-auto">
            <TabsTrigger value="graph" className="gap-1 md:gap-2 text-xs md:text-sm py-2">
              <Icon name="LineChart" size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">График</span>
            </TabsTrigger>
            <TabsTrigger value="trains" className="gap-1 md:gap-2 text-xs md:text-sm py-2">
              <Icon name={isMetroMode ? "TramFront" : "Train"} size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">{isMetroMode ? 'Составы' : 'Поезда'}</span>
              <span className="sm:hidden">({trains.length})</span>
            </TabsTrigger>
            <TabsTrigger value="stations" className="gap-1 md:gap-2 text-xs md:text-sm py-2">
              <Icon name="MapPin" size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">Станции</span>
              <span className="sm:hidden">({stations.length})</span>
            </TabsTrigger>
            <TabsTrigger value="lines" className="gap-1 md:gap-2 text-xs md:text-sm py-2">
              <Icon name="Route" size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">Линии</span>
              <span className="sm:hidden">({lines.length})</span>
            </TabsTrigger>
            <TabsTrigger value="legend" className="gap-1 md:gap-2 text-xs md:text-sm py-2">
              <Icon name="Info" size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">Легенда</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1 md:gap-2 text-xs md:text-sm py-2">
              <Icon name="BarChart3" size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">Аналитика</span>
              {conflicts.length > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {conflicts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="graph" className="mt-4 md:mt-6">
            <Card className="p-3 md:p-6">
              <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-4 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.2))}>
                  <Icon name="ZoomOut" size={14} className="md:w-4 md:h-4" />
                </Button>
                <span className="text-xs md:text-sm font-medium min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(3, zoom + 0.2))}>
                  <Icon name="ZoomIn" size={14} className="md:w-4 md:h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setZoom(1)}>
                  <Icon name="Minimize2" size={14} className="md:w-4 md:h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={detectConflicts} className="gap-2">
                  <Icon name="AlertTriangle" size={14} className="md:w-4 md:h-4" />
                  <span className="hidden md:inline">Проверить конфликты</span>
                </Button>
                {conflicts.length > 0 && (
                  <span className="text-xs text-destructive font-medium">
                    ⚠️ {conflicts.length} конфликт(-ов)
                  </span>
                )}
              </div>
              
              <div 
                ref={containerRef}
                className="relative overflow-auto" 
                style={{ height: '500px', width: '100%' }}
              >
                <div style={{ 
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  width: '5670px',
                  height: '700px'
                }}>
                  <svg 
                    ref={svgRef}
                    width="5670"
                    height="700"
                    className="border border-border rounded-lg bg-card"
                  >
                  <rect width="100%" height="100%" fill="hsl(var(--card))" />
                  
                  {/* Сетка времени (10мм = 10 минут, 1мм ≈ 3.78px, 10мм ≈ 37.8px) */}
                  {Array.from({ length: 145 }, (_, i) => {
                    const x = 150 + i * 37.8;
                    const hour = Math.floor(i / 6);
                    const minute = (i % 6) * 10;
                    const isHourMark = minute === 0;
                    const isHalfHourMark = minute === 30;
                    
                    return (
                      <g key={`time-${i}`}>
                        <line
                          x1={x}
                          y1="50"
                          x2={x}
                          y2="680"
                          stroke="#000000"
                          strokeWidth={isHourMark ? '2' : '1'}
                          strokeDasharray={isHalfHourMark ? '5,5' : '0'}
                        />
                        {isHourMark && (
                          <text
                            x={x}
                            y="35"
                            textAnchor="middle"
                            fill="#000000"
                            fontSize="14"
                            fontWeight="600"
                          >
                            {hour}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  
                  {/* Горизонтальные линии станций (10мм = 1км, 10мм ≈ 37.8px) */}
                  {stations
                    .sort((a, b) => b.position - a.position)
                    .map((station, i) => {
                      const y = 80 + station.position * 37.8;
                      
                      return (
                        <g key={station.id}>
                          <rect
                            x="0"
                            y={y - 15}
                            width="145"
                            height="30"
                            fill="#FFFFFF"
                            stroke="#000000"
                            strokeWidth="1.5"
                          />
                          <line
                            x1="145"
                            y1={y}
                            x2="5670"
                            y2={y}
                            stroke="#000000"
                            strokeWidth="2"
                          />
                          <text
                            x="5"
                            y={y + 5}
                            textAnchor="start"
                            fill="#000000"
                            fontSize="11"
                            fontWeight="600"
                          >
                            {station.name.length > 18 ? station.name.substring(0, 18) + '...' : station.name}
                          </text>
                        </g>
                      );
                    })}
                  
                  {/* Конфликты (подсветка) */}
                  {conflicts.map((conflict, idx) => {
                    const t1 = conflict.train1;
                    const t2 = conflict.train2;
                    
                    const d1 = stations.find(s => s.id === t1.departure_station_id);
                    const a1 = stations.find(s => s.id === t1.arrival_station_id);
                    const d2 = stations.find(s => s.id === t2.departure_station_id);
                    const a2 = stations.find(s => s.id === t2.arrival_station_id);
                    
                    if (!d1 || !a1 || !d2 || !a2) return null;
                    
                    const x1 = 150 + (t1.departure_time * 60) * (37.8 / 10);
                    const x2 = 150 + (t1.arrival_time * 60) * (37.8 / 10);
                    const y1 = 80 + d1.position * 37.8;
                    const y2 = 80 + a1.position * 37.8;
                    
                    const x3 = 150 + (t2.departure_time * 60) * (37.8 / 10);
                    const x4 = 150 + (t2.arrival_time * 60) * (37.8 / 10);
                    const y3 = 80 + d2.position * 37.8;
                    const y4 = 80 + a2.position * 37.8;
                    
                    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
                    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
                    
                    const intersectX = x1 + t * (x2 - x1);
                    const intersectY = y1 + t * (y2 - y1);
                    
                    return (
                      <g key={`conflict-${idx}`}>
                        <circle 
                          cx={intersectX} 
                          cy={intersectY} 
                          r="12" 
                          fill="red" 
                          opacity="0.3"
                          className="animate-pulse"
                        />
                        <circle 
                          cx={intersectX} 
                          cy={intersectY} 
                          r="8" 
                          fill="none" 
                          stroke="red" 
                          strokeWidth="2"
                        />
                        <text
                          x={intersectX}
                          y={intersectY + 25}
                          textAnchor="middle"
                          fill="red"
                          fontSize="11"
                          fontWeight="bold"
                        >
                          ⚠️ Конфликт
                        </text>
                      </g>
                    );
                  })}
                  
                  {/* Линии движения поездов */}
                  {trains.map(train => {
                    const depStation = stations.find(s => s.id === train.departure_station_id);
                    const arrStation = stations.find(s => s.id === train.arrival_station_id);
                    if (!depStation || !arrStation) return null;
                    
                    // Координаты времени (37.8px = 10 минут)
                    const x1 = 150 + (train.departure_time * 60) * (37.8 / 10);
                    const x2 = 150 + (train.arrival_time * 60) * (37.8 / 10);
                    
                    // Координаты расстояния (37.8px = 1км)
                    const y1 = 80 + depStation.position * 37.8;
                    const y2 = 80 + arrStation.position * 37.8;
                    
                    const legendItem = getLegendItemByType(train.type);
                    const lineStyle = legendItem?.line_style || 'solid';
                    const strokeDasharray = lineStyle === 'dashed' ? '6,4' : lineStyle === 'dotted' ? '2,3' : '0';
                    
                    // Направление: нечетные (freight) - сверху вниз, четные (passenger/service) - снизу вверх
                    const isOdd = train.type === 'freight';
                    
                    return (
                      <g key={train.id}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={train.color}
                          strokeWidth="2.5"
                          strokeDasharray={strokeDasharray}
                          className="transition-all duration-300 cursor-pointer"
                        />
                        
                        {/* Метки времени на точках отправления и прибытия */}
                        <circle cx={x1} cy={y1} r="4" fill={train.color} />
                        <text
                          x={x1}
                          y={y1 - 8}
                          textAnchor="middle"
                          fill="hsl(var(--foreground))"
                          fontSize="11"
                          fontWeight="bold"
                        >
                          {formatTime(train.departure_time)}
                        </text>
                        
                        <circle cx={x2} cy={y2} r="4" fill={train.color} />
                        <text
                          x={x2}
                          y={y2 - 8}
                          textAnchor="middle"
                          fill="hsl(var(--foreground))"
                          fontSize="11"
                          fontWeight="bold"
                        >
                          {formatTime(train.arrival_time)}
                        </text>
                        
                        {/* Номер поезда */}
                        <text
                          x={(x1 + x2) / 2}
                          y={(y1 + y2) / 2 - 10}
                          textAnchor="middle"
                          fill={train.color}
                          fontSize="14"
                          fontWeight="bold"
                          stroke="hsl(var(--card))"
                          strokeWidth="3"
                          paintOrder="stroke"
                        >
                          {train.number}
                        </text>
                      </g>
                    );
                  })}
                  
                  {/* Оси координат */}
                  <line x1="80" y1="40" x2="80" y2="660" stroke="hsl(var(--foreground))" strokeWidth="2" />
                  <line x1="80" y1="660" x2="2400" y2="660" stroke="hsl(var(--foreground))" strokeWidth="2" />
                  
                  {/* Подписи осей */}
                  <text x="1200" y="690" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14" fontWeight="600">
                    Время (часы:минуты)
                  </text>
                  <text x="40" y="350" textAnchor="middle" transform="rotate(-90 40 350)" fill="hsl(var(--foreground))" fontSize="14" fontWeight="600">
                    Расстояние (км)
                  </text>
                  </svg>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4 md:mt-6">
            <div className="grid gap-4">
              <Card className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg md:text-xl font-bold">Средняя скорость поездов</h3>
                  <Button onClick={detectConflicts} variant="outline" size="sm" className="gap-2">
                    <Icon name="RefreshCw" size={16} />
                    Обновить
                  </Button>
                </div>
                <div className="space-y-3">
                  {trains.map(train => {
                    const speed = calculateSpeed(train);
                    const depStation = stations.find(s => s.id === train.departure_station_id);
                    const arrStation = stations.find(s => s.id === train.arrival_station_id);
                    const distance = depStation && arrStation ? Math.abs(arrStation.distance_km - depStation.distance_km) : 0;
                    
                    return (
                      <div key={train.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: train.color }} />
                          <div>
                            <div className="font-medium">{train.number}</div>
                            <div className="text-xs text-muted-foreground">
                              {depStation?.name} → {arrStation?.name}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{speed.toFixed(1)} км/ч</div>
                          <div className="text-xs text-muted-foreground">{distance.toFixed(1)} км</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold mb-4">
                  Конфликты маршрутов
                  {conflicts.length > 0 && (
                    <span className="ml-2 text-destructive">({conflicts.length})</span>
                  )}
                </h3>
                {conflicts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon name="CheckCircle2" size={48} className="mx-auto mb-2 text-green-500" />
                    <p>Конфликтов не обнаружено</p>
                    <p className="text-sm">Все маршруты безопасны</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conflicts.map((conflict, idx) => (
                      <div key={idx} className="p-3 border border-destructive rounded-lg bg-destructive/5">
                        <div className="flex items-start gap-2">
                          <Icon name="AlertTriangle" size={20} className="text-destructive mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-destructive mb-1">
                              Конфликт #{idx + 1}
                            </div>
                            <div className="text-sm space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: conflict.train1.color }} />
                                <span>Поезд {conflict.train1.number}</span>
                                <span className="text-muted-foreground">↔</span>
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: conflict.train2.color }} />
                                <span>Поезд {conflict.train2.number}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Пересечение маршрутов в одно время
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trains" className="mt-4 md:mt-6">
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
                            {formatTime(train.departure_time)} - {formatTime(train.arrival_time)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ⚡ {calculateSpeed(train).toFixed(1)} км/ч
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
                      <Label>Расстояние (км)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={stationForm.distance_km}
                        onChange={(e) => setStationForm({ ...stationForm, distance_km: parseFloat(e.target.value) || 0 })}
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
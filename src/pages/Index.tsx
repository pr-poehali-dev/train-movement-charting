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
import { api, Line, Station, Train, LegendItem, TrainStop, TrackSegment } from '@/lib/api';

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
  const [trainStops, setTrainStops] = useState<TrainStop[]>([]);
  const [trackSegments, setTrackSegments] = useState<TrackSegment[]>([]);

  const [trainDialogOpen, setTrainDialogOpen] = useState(false);
  const [stationDialogOpen, setStationDialogOpen] = useState(false);
  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [legendDialogOpen, setLegendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stopsDialogOpen, setStopsDialogOpen] = useState(false);
  
  const [editingTrain, setEditingTrain] = useState<Train | null>(null);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [editingLine, setEditingLine] = useState<Line | null>(null);
  const [editingLegend, setEditingLegend] = useState<LegendItem | null>(null);
  const [selectedTrainForStops, setSelectedTrainForStops] = useState<Train | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'train' | 'station' | 'line' | 'stop', id: number } | null>(null);
  const [editingStop, setEditingStop] = useState<TrainStop | null>(null);
  const [stopForm, setStopForm] = useState({
    station_id: 0,
    arrival_hours: 0,
    arrival_minutes: 0,
    departure_hours: 0,
    departure_minutes: 0,
  });

  const [trainForm, setTrainForm] = useState({
    number: '',
    type: 'freight' as Train['type'],
    departure_station_id: 0,
    arrival_station_id: 0,
    departure_time: 0,
    arrival_time: 480,
    line_style: 'solid' as 'solid' | 'dashed' | 'dotted' | 'dash-dot' | 'double',
    line_width: 2.5,
    average_speed: 60,
    default_stop_duration: 2,
  });

  const [stationForm, setStationForm] = useState({
    name: '',
    position: 0,
    distance_km: 0,
    line_id: undefined as number | undefined,
    tracks_count: 2,
    has_siding: false,
  });

  const [lineForm, setLineForm] = useState({
    name: '',
    color: '#0EA5E9',
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (trains.length > 0) {
      detectConflicts();
    }
  }, [trains, stations]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [linesData, stationsData, trainsData, legendData, stopsData, segmentsData] = await Promise.all([
        api.lines.getAll(),
        api.stations.getAll(),
        api.trains.getAll(1),
        api.legend.getAll(1),
        api.trainStops.getAll(),
        api.trackSegments.getAll(),
      ]);
      setLines(linesData);
      setStations(stationsData);
      setTrains(trainsData);
      setLegendItems(legendData);
      setTrainStops(stopsData);
      setTrackSegments(segmentsData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({ title: 'Ошибка загрузки', description: errorMessage, variant: 'destructive' });
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

      let trainId: number;
      
      if (editingTrain) {
        await api.trains.update({ ...trainData, id: editingTrain.id });
        trainId = editingTrain.id;
        toast({ title: 'Поезд обновлён' });
      } else {
        const newTrain = await api.trains.create(trainData);
        trainId = newTrain.id;
        toast({ title: 'Поезд добавлен' });
      }

      if (!editingTrain) {
        const depStation = stations.find(s => s.id === trainForm.departure_station_id);
        const arrStation = stations.find(s => s.id === trainForm.arrival_station_id);
        
        if (depStation && arrStation) {
          const sortedStations = [...stations].sort((a, b) => 
            (a.distance_km || a.position) - (b.distance_km || b.position)
          );
          
          const depPos = depStation.distance_km || depStation.position;
          const arrPos = arrStation.distance_km || arrStation.position;
          const isReverse = depPos > arrPos;
          
          const intermediateStations = sortedStations.filter(s => {
            const pos = s.distance_km || s.position;
            return isReverse 
              ? pos < depPos && pos > arrPos && s.id !== trainForm.departure_station_id && s.id !== trainForm.arrival_station_id
              : pos > depPos && pos < arrPos && s.id !== trainForm.departure_station_id && s.id !== trainForm.arrival_station_id;
          });
          
          if (isReverse) intermediateStations.reverse();
          
          let currentTime = trainForm.departure_time;
          let lastPos = depPos;
          
          for (const station of intermediateStations) {
            const stationPos = station.distance_km || station.position;
            const distance = Math.abs(stationPos - lastPos);
            const travelTime = Math.round((distance / trainForm.average_speed) * 60);
            
            currentTime += travelTime;
            const arrivalTime = currentTime;
            const departureTime = currentTime + trainForm.default_stop_duration;
            
            await api.trainStops.create({
              train_id: trainId,
              station_id: station.id,
              arrival_time: arrivalTime,
              departure_time: departureTime,
            });
            
            currentTime = departureTime;
            lastPos = stationPos;
          }
          
          if (intermediateStations.length > 0) {
            toast({ 
              title: 'Остановки созданы', 
              description: `Автоматически добавлено ${intermediateStations.length} остановок` 
            });
          }
        }
      }

      setTrainForm({
        number: '',
        type: 'freight',
        departure_station_id: 0,
        arrival_station_id: 0,
        departure_time: 0,
        arrival_time: 480,
        line_style: 'solid',
        line_width: 2.5,
        average_speed: 60,
        default_stop_duration: 2,
      });
      setEditingTrain(null);
      setTrainDialogOpen(false);
      await loadData();
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

      setStationForm({ name: '', position: 0, distance_km: 0, line_id: undefined, tracks_count: 2, has_siding: false });
      setEditingStation(null);
      setStationDialogOpen(false);
      await loadData();
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

      setLineForm({ name: '', color: '#0EA5E9' });
      setEditingLine(null);
      setLineDialogOpen(false);
      await loadData();
    } catch (error) {
      toast({ title: 'Ошибка', description: String(error), variant: 'destructive' });
    }
  };

  const saveLegendItem = async () => {
    if (!editingLegend) return;
    try {
      await api.legend.update(editingLegend);
      toast({ title: 'Легенда обновлена' });
      setEditingLegend(null);
      setLegendDialogOpen(false);
      await loadData();
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
      } else if (deleteTarget.type === 'stop') {
        await api.trainStops.delete(deleteTarget.id);
        toast({ title: 'Остановка удалена' });
      }
      await loadData();
      setDeleteTarget(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      toast({ title: 'Ошибка удаления', description: String(error), variant: 'destructive' });
    }
  };

  const saveTrainStop = async () => {
    if (!selectedTrainForStops || stopForm.station_id === 0) return;
    
    try {
      const train = selectedTrainForStops;
      const station = stations.find(s => s.id === stopForm.station_id);
      if (!station) return;
      
      const depStation = stations.find(s => s.id === train.departure_station_id);
      const arrStation = stations.find(s => s.id === train.arrival_station_id);
      if (!depStation || !arrStation) return;
      
      const depPos = depStation.distance_km || depStation.position;
      const arrPos = arrStation.distance_km || arrStation.position;
      const stationPos = station.distance_km || station.position;
      
      const existingStops = trainStops
        .filter(s => s.train_id === train.id)
        .map(s => {
          const st = stations.find(station => station.id === s.station_id);
          return { ...s, position: st ? (st.distance_km || st.position) : 0 };
        })
        .sort((a, b) => depPos < arrPos ? a.position - b.position : b.position - a.position);
      
      let arrival_time: number;
      let departure_time: number;
      
      const totalDistance = Math.abs(arrPos - depPos);
      const totalTime = Math.abs(train.arrival_time - train.departure_time);
      const avgSpeed = train.average_speed || (totalDistance > 0 && totalTime > 0 ? (totalDistance / (totalTime / 60)) : 60);
      const defaultStopDuration = train.default_stop_duration || 2;
      
      if (existingStops.length === 0) {
        const distance = Math.abs(stationPos - depPos);
        const travelTime = Math.round((distance / avgSpeed) * 60);
        arrival_time = train.departure_time + travelTime;
        departure_time = arrival_time + defaultStopDuration;
      } else {
        let prevStop = existingStops[0];
        let prevTime = train.departure_time;
        let prevPos = depPos;
        
        for (const stop of existingStops) {
          const isForward = depPos < arrPos;
          const shouldInsertBefore = isForward 
            ? stationPos < stop.position
            : stationPos > stop.position;
          
          if (shouldInsertBefore) {
            const distance = Math.abs(stationPos - prevPos);
            const travelTime = Math.round((distance / avgSpeed) * 60);
            arrival_time = prevTime + travelTime;
            departure_time = arrival_time + defaultStopDuration;
            break;
          }
          
          prevStop = stop;
          prevTime = stop.departure_time;
          prevPos = stop.position;
        }
        
        if (arrival_time === undefined) {
          const distance = Math.abs(stationPos - prevPos);
          const travelTime = Math.round((distance / avgSpeed) * 60);
          arrival_time = prevTime + travelTime;
          departure_time = arrival_time + defaultStopDuration;
        }
      }
      
      await api.trainStops.create({
        train_id: train.id,
        station_id: stopForm.station_id,
        arrival_time,
        departure_time,
      });
      
      toast({ title: 'Остановка добавлена' });
      await loadData();
      setStopForm({
        station_id: 0,
        arrival_hours: 0,
        arrival_minutes: 0,
        departure_hours: 0,
        departure_minutes: 0,
      });
    } catch (error) {
      toast({ title: 'Ошибка', description: String(error), variant: 'destructive' });
    }
  };

  const openStopsDialog = (train: Train) => {
    setSelectedTrainForStops(train);
    setStopsDialogOpen(true);
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
      line_style: train.line_style || 'solid',
      line_width: train.line_width || 2.5,
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
      tracks_count: station.tracks_count || 2,
      has_siding: station.has_siding || false,
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
    const svgWidth = parseFloat(svgClone.getAttribute('width') || '2478');
    const svgHeight = parseFloat(svgClone.getAttribute('height') || '2478');
    
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
    const totalTimeMinutes = Math.abs(train.arrival_time - train.departure_time);
    
    // Вычитаем время всех остановок
    const stops = trainStops.filter(stop => stop.train_id === train.id);
    const totalStopTime = stops.reduce((sum, stop) => sum + stop.stop_duration, 0);
    
    // Время в движении = общее время - время остановок
    const movingTimeMinutes = totalTimeMinutes - totalStopTime;
    const movingTimeHours = movingTimeMinutes / 60;
    
    return movingTimeHours > 0 ? distance / movingTimeHours : 0;
  };

  const checkIntersection = (t1: Train, t2: Train) => {
    const d1 = stations.find(s => s.id === t1.departure_station_id);
    const a1 = stations.find(s => s.id === t1.arrival_station_id);
    const d2 = stations.find(s => s.id === t2.departure_station_id);
    const a2 = stations.find(s => s.id === t2.arrival_station_id);
    
    if (!d1 || !a1 || !d2 || !a2) return false;
    
    // Определяем направление движения (четные - север/восток, нечетные - юг/запад)
    const t1Number = parseInt(t1.number.replace(/\D/g, '')) || 0;
    const t2Number = parseInt(t2.number.replace(/\D/g, '')) || 0;
    const t1IsEven = t1Number % 2 === 0;
    const t2IsEven = t2Number % 2 === 0;
    const oppositeDirections = t1IsEven !== t2IsEven;
    
    const x1 = t1.departure_time;
    const x2 = t1.arrival_time;
    const y1 = d1.distance_km;
    const y2 = a1.distance_km;
    
    const x3 = t2.departure_time;
    const x4 = t2.arrival_time;
    const y3 = d2.distance_km;
    const y4 = a2.distance_km;
    
    // Получаем остановки для обоих поездов
    const stops1 = trainStops.filter(s => s.train_id === t1.id);
    const stops2 = trainStops.filter(s => s.train_id === t2.id);
    
    // Проверяем пересечение траекторий
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.001) return false;
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    const hasIntersection = t > 0 && t < 1 && u > 0 && u < 1;
    
    if (!hasIntersection) return false;
    
    // Если траектории пересекаются, проверяем станции на пути
    const allStations = [d1, a1, d2, a2, ...stops1.map(s => stations.find(st => st.id === s.station_id)), ...stops2.map(s => stations.find(st => st.id === s.station_id))].filter(Boolean) as Station[];
    const uniqueStations = Array.from(new Set(allStations.map(s => s.id))).map(id => allStations.find(s => s.id === id)!);
    
    // Проверяем каждую станцию на пути пересечения
    for (const station of uniqueStations) {
      const tracksCount = station.tracks_count || 2;
      const hasSiding = station.has_siding || false;
      
      // Проверяем, проходят ли оба поезда через эту станцию
      const train1PassesHere = [d1.id, a1.id, ...stops1.map(s => s.station_id)].includes(station.id);
      const train2PassesHere = [d2.id, a2.id, ...stops2.map(s => s.station_id)].includes(station.id);
      
      if (!train1PassesHere || !train2PassesHere) continue;
      
      // Находим время прохождения/стоянки на этой станции
      const stop1 = stops1.find(s => s.station_id === station.id);
      const stop2 = stops2.find(s => s.station_id === station.id);
      
      const t1AtStation = stop1 || (d1.id === station.id ? { arrival_time: x1, departure_time: x1 } : { arrival_time: x2, departure_time: x2 });
      const t2AtStation = stop2 || (d2.id === station.id ? { arrival_time: x3, departure_time: x3 } : { arrival_time: x4, departure_time: x4 });
      
      const t1Start = t1AtStation.arrival_time;
      const t1End = t1AtStation.departure_time;
      const t2Start = t2AtStation.arrival_time;
      const t2End = t2AtStation.departure_time;
      
      // Проверяем пересечение времени
      const timeOverlap = t1End >= t2Start && t2End >= t1Start;
      
      if (!timeOverlap) continue;
      
      if (tracksCount === 1) {
        // Однопутная станция
        if (hasSiding && oppositeDirections && stop1 && stop2) {
          // Есть разъезд и оба поезда останавливаются (встречные могут разъехаться)
          continue;
        }
        // В остальных случаях - конфликт
        return true;
      }
      // Многопутная станция - конфликта нет
    }
    
    // Проверяем однопутные перегоны между станциями
    const sortedStations = [...stations].sort((a, b) => (a.distance_km || a.position) - (b.distance_km || b.position));
    
    for (let i = 0; i < sortedStations.length - 1; i++) {
      const stationA = sortedStations[i];
      const stationB = sortedStations[i + 1];
      
      // Проверяем, есть ли однопутный перегон между этими станциями
      const segment = trackSegments.find(seg => 
        (seg.station_from_id === stationA.id && seg.station_to_id === stationB.id) ||
        (seg.station_from_id === stationB.id && seg.station_to_id === stationA.id)
      );
      
      if (!segment || !segment.is_single_track) continue;
      
      // Проверяем, проходят ли оба поезда через этот перегон
      const train1Path = [d1, ...stops1.map(s => stations.find(st => st.id === s.station_id)), a1].filter(Boolean) as Station[];
      const train2Path = [d2, ...stops2.map(s => stations.find(st => st.id === s.station_id)), a2].filter(Boolean) as Station[];
      
      const t1PassesSegment = train1Path.some(s => s.id === stationA.id) && train1Path.some(s => s.id === stationB.id);
      const t2PassesSegment = train2Path.some(s => s.id === stationA.id) && train2Path.some(s => s.id === stationB.id);
      
      if (!t1PassesSegment || !t2PassesSegment) continue;
      
      // Рассчитываем время прохождения перегона для каждого поезда
      const getSegmentTime = (train: Train, trainStops: typeof stops1, path: Station[]) => {
        const aIndex = path.findIndex(s => s.id === stationA.id);
        const bIndex = path.findIndex(s => s.id === stationB.id);
        
        if (aIndex === -1 || bIndex === -1) return null;
        
        const startStation = aIndex < bIndex ? stationA : stationB;
        const endStation = aIndex < bIndex ? stationB : stationA;
        
        const startStop = trainStops.find(s => s.station_id === startStation.id);
        const endStop = trainStops.find(s => s.station_id === endStation.id);
        
        const startTime = startStop ? startStop.departure_time : 
          (train.departure_station_id === startStation.id ? train.departure_time : train.arrival_time);
        const endTime = endStop ? endStop.arrival_time :
          (train.arrival_station_id === endStation.id ? train.arrival_time : train.departure_time);
        
        return { start: startTime, end: endTime };
      };
      
      const t1SegmentTime = getSegmentTime(t1, stops1, train1Path);
      const t2SegmentTime = getSegmentTime(t2, stops2, train2Path);
      
      if (!t1SegmentTime || !t2SegmentTime) continue;
      
      // Проверяем пересечение времени на перегоне
      const segmentTimeOverlap = t1SegmentTime.end >= t2SegmentTime.start && t2SegmentTime.end >= t1SegmentTime.start;
      
      if (segmentTimeOverlap) {
        // На однопутном перегоне конфликт есть всегда, даже для встречных поездов
        return true;
      }
    }
    
    // Если встречные поезда и у них разные направления, конфликта нет (идут по разным путям)
    if (oppositeDirections) {
      return false;
    }
    
    // Если направление одинаковое и траектории пересекаются - конфликт
    return hasIntersection;
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
                            const value = e.target.value;
                            if (value === '') {
                              const minutes = trainForm.departure_time % 60;
                              setTrainForm({ ...trainForm, departure_time: minutes });
                              return;
                            }
                            const hours = Math.max(0, Math.min(23, parseInt(value)));
                            const minutes = trainForm.departure_time % 60;
                            setTrainForm({ ...trainForm, departure_time: hours * 60 + minutes });
                          }}
                          onFocus={(e) => e.target.select()}
                        />
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          placeholder="ММ"
                          value={trainForm.departure_time % 60}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              const hours = Math.floor(trainForm.departure_time / 60);
                              setTrainForm({ ...trainForm, departure_time: hours * 60 });
                              return;
                            }
                            const hours = Math.floor(trainForm.departure_time / 60);
                            const minutes = Math.max(0, Math.min(59, parseInt(value)));
                            setTrainForm({ ...trainForm, departure_time: hours * 60 + minutes });
                          }}
                          onFocus={(e) => e.target.select()}
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
                            const value = e.target.value;
                            if (value === '') {
                              const minutes = trainForm.arrival_time % 60;
                              setTrainForm({ ...trainForm, arrival_time: minutes });
                              return;
                            }
                            const hours = Math.max(0, Math.min(23, parseInt(value)));
                            const minutes = trainForm.arrival_time % 60;
                            setTrainForm({ ...trainForm, arrival_time: hours * 60 + minutes });
                          }}
                          onFocus={(e) => e.target.select()}
                        />
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          placeholder="ММ"
                          value={trainForm.arrival_time % 60}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              const hours = Math.floor(trainForm.arrival_time / 60);
                              setTrainForm({ ...trainForm, arrival_time: hours * 60 });
                              return;
                            }
                            const hours = Math.floor(trainForm.arrival_time / 60);
                            const minutes = Math.max(0, Math.min(59, parseInt(value)));
                            setTrainForm({ ...trainForm, arrival_time: hours * 60 + minutes });
                          }}
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                    </div>
                  </div>
                  <Card className="p-4 space-y-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                    <div className="flex items-center gap-2">
                      <Icon name="Zap" size={18} className="text-blue-600 dark:text-blue-400" />
                      <Label className="text-blue-900 dark:text-blue-100">Автоматический расчёт маршрута</Label>
                    </div>
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      Время прибытия = время в пути + стоянки на всех промежуточных станциях<br/>
                      Если скорость не указана, она будет рассчитана автоматически из существующих данных
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Средняя скорость (км/ч)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="300"
                          value={trainForm.average_speed}
                          onChange={(e) => setTrainForm({ ...trainForm, average_speed: parseInt(e.target.value) || 60 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Стоянка по умолчанию (мин)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="60"
                          value={trainForm.default_stop_duration}
                          onChange={(e) => setTrainForm({ ...trainForm, default_stop_duration: parseInt(e.target.value) || 2 })}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const depStation = stations.find(s => s.id === trainForm.departure_station_id);
                        const arrStation = stations.find(s => s.id === trainForm.arrival_station_id);
                        
                        if (!depStation || !arrStation) {
                          toast({ title: "Выберите станции отправления и прибытия", variant: "destructive" });
                          return;
                        }
                        
                        const sortedStations = [...stations].sort((a, b) => 
                          (a.distance_km || a.position) - (b.distance_km || b.position)
                        );
                        
                        const depPos = depStation.distance_km || depStation.position;
                        const arrPos = arrStation.distance_km || arrStation.position;
                        const isReverse = depPos > arrPos;
                        
                        const intermediateStations = sortedStations.filter(s => {
                          const pos = s.distance_km || s.position;
                          return isReverse 
                            ? pos < depPos && pos > arrPos && s.id !== trainForm.departure_station_id && s.id !== trainForm.arrival_station_id
                            : pos > depPos && pos < arrPos && s.id !== trainForm.departure_station_id && s.id !== trainForm.arrival_station_id;
                        });
                        
                        const totalDistance = Math.abs(arrPos - depPos);
                        let speedToUse = trainForm.average_speed;
                        let speedMessage = '';
                        
                        if (!speedToUse || speedToUse <= 0) {
                          if (editingTrain) {
                            const existingStops = trainStops.filter(s => s.train_id === editingTrain.id);
                            const totalStopDuration = existingStops.reduce((sum, s) => sum + s.stop_duration, 0);
                            const totalTime = Math.abs(trainForm.arrival_time - trainForm.departure_time);
                            const movingTime = totalTime - totalStopDuration;
                            
                            if (movingTime > 0 && totalDistance > 0) {
                              speedToUse = Math.round((totalDistance / (movingTime / 60)) * 10) / 10;
                              speedMessage = ` (автоматически рассчитана: ${speedToUse} км/ч)`;
                              setTrainForm({ ...trainForm, average_speed: speedToUse });
                            } else {
                              speedToUse = 60;
                              speedMessage = ' (использована скорость по умолчанию: 60 км/ч)';
                            }
                          } else {
                            speedToUse = 60;
                            speedMessage = ' (использована скорость по умолчанию: 60 км/ч)';
                          }
                        }
                        
                        const totalTravelTime = Math.round((totalDistance / speedToUse) * 60);
                        const totalStopTime = intermediateStations.length * trainForm.default_stop_duration;
                        
                        const calculatedArrivalTime = trainForm.departure_time + totalTravelTime + totalStopTime;
                        
                        setTrainForm({ 
                          ...trainForm, 
                          arrival_time: calculatedArrivalTime >= 24 * 60 ? 23 * 60 + 59 : calculatedArrivalTime 
                        });
                        
                        toast({ 
                          title: "Расчёт выполнен", 
                          description: `Расстояние: ${totalDistance.toFixed(1)} км${speedMessage}, время в пути: ${Math.floor(totalTravelTime / 60)}ч ${totalTravelTime % 60}м, остановки: ${intermediateStations.length} × ${trainForm.default_stop_duration}м = ${totalStopTime}м` 
                        });
                      }}
                    >
                      <Icon name="Calculator" size={16} className="mr-2" />
                      Рассчитать время прибытия
                    </Button>
                  </Card>
                  <div className="space-y-2">
                    <Label>Стиль линии</Label>
                    <Select value={trainForm.line_style} onValueChange={(value: any) => setTrainForm({ ...trainForm, line_style: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">
                          <div className="flex items-center gap-2">
                            <svg width="40" height="2"><line x1="0" y1="1" x2="40" y2="1" stroke="currentColor" strokeWidth="2" /></svg>
                            <span>Сплошная</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="dashed">
                          <div className="flex items-center gap-2">
                            <svg width="40" height="2"><line x1="0" y1="1" x2="40" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="4,2" /></svg>
                            <span>Пунктирная</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="dotted">
                          <div className="flex items-center gap-2">
                            <svg width="40" height="2"><line x1="0" y1="1" x2="40" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="1,2" /></svg>
                            <span>Точечная</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="dash-dot">
                          <div className="flex items-center gap-2">
                            <svg width="40" height="2"><line x1="0" y1="1" x2="40" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="6,2,1,2" /></svg>
                            <span>Штрих-пунктир</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="double">
                          <div className="flex items-center gap-2">
                            <svg width="40" height="6">
                              <line x1="0" y1="1" x2="40" y2="1" stroke="currentColor" strokeWidth="1.5" />
                              <line x1="0" y1="5" x2="40" y2="5" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                            <span>Двойная</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Толщина линии</Label>
                    <Select value={String(trainForm.line_width)} onValueChange={(value) => setTrainForm({ ...trainForm, line_width: parseFloat(value) })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1.5">
                          <div className="flex items-center gap-2">
                            <svg width="40" height="2"><line x1="0" y1="1" x2="40" y2="1" stroke="currentColor" strokeWidth="1.5" /></svg>
                            <span>Тонкая (1.5px)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="2.5">
                          <div className="flex items-center gap-2">
                            <svg width="40" height="3"><line x1="0" y1="1.5" x2="40" y2="1.5" stroke="currentColor" strokeWidth="2.5" /></svg>
                            <span>Средняя (2.5px)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="3.5">
                          <div className="flex items-center gap-2">
                            <svg width="40" height="4"><line x1="0" y1="2" x2="40" y2="2" stroke="currentColor" strokeWidth="3.5" /></svg>
                            <span>Жирная (3.5px)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="5">
                          <div className="flex items-center gap-2">
                            <svg width="40" height="6"><line x1="0" y1="3" x2="40" y2="3" stroke="currentColor" strokeWidth="5" /></svg>
                            <span>Очень жирная (5px)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground mb-2">Предпросмотр:</div>
                    <svg width="100%" height="30">
                      {trainForm.line_style === 'double' ? (
                        <>
                          <line x1="0" y1="13" x2="100%" y2="13" stroke="currentColor" strokeWidth={trainForm.line_width * 0.6} />
                          <line x1="0" y1="17" x2="100%" y2="17" stroke="currentColor" strokeWidth={trainForm.line_width * 0.6} />
                        </>
                      ) : (
                        <line
                          x1="0"
                          y1="15"
                          x2="100%"
                          y2="15"
                          stroke="currentColor"
                          strokeWidth={trainForm.line_width}
                          strokeDasharray={
                            trainForm.line_style === 'dashed' ? '6,4' :
                            trainForm.line_style === 'dotted' ? '2,3' :
                            trainForm.line_style === 'dash-dot' ? '10,3,2,3' : '0'
                          }
                        />
                      )}
                    </svg>
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
                {(() => {
                  const maxDistance = stations.length > 0 ? Math.max(...stations.map(s => (s.distance_km || s.position))) : 50;
                  const svgHeight = Math.max(600, 80 + maxDistance * 7.56 + 100);
                  return (
                    <div style={{ 
                      transform: `scale(${zoom})`,
                      transformOrigin: 'top left',
                      width: '2478px',
                      height: `${svgHeight}px`
                    }}>
                      <svg 
                        ref={svgRef}
                        width="2478"
                        height={svgHeight}
                        className="border border-border rounded-lg bg-card"
                      >
                  <rect width="100%" height="100%" fill="hsl(var(--card))" />
                  
                  {/* Сетка времени (4мм = 10 минут, 4мм ≈ 15.12px, 24 часа = 144 интервала) */}
                  {Array.from({ length: 145 }, (_, i) => {
                    if (i > 144) return null;
                    const x = 150 + i * 15.12;
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
                          y2={(stations.length > 0 ? 80 + Math.max(...stations.map(s => (s.distance_km || s.position))) * 7.56 + 50 : 550)}
                          stroke="#000000"
                          strokeWidth={isHourMark ? '1.5' : '0.5'}
                          strokeDasharray={isHalfHourMark ? '5,5' : '0'}
                        />
                        {isHourMark && hour <= 24 && (
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
                  
                  {/* Заголовок "Расстояние (км)" */}
                  <rect
                    x="0"
                    y="50"
                    width="50"
                    height="30"
                    fill="#FFFFFF"
                    stroke="#000000"
                    strokeWidth="2"
                  />
                  <text
                    x="25"
                    y="65"
                    textAnchor="middle"
                    fill="#000000"
                    fontSize="9"
                    fontWeight="600"
                  >
                    Расст.
                  </text>
                  <text
                    x="25"
                    y="75"
                    textAnchor="middle"
                    fill="#000000"
                    fontSize="9"
                    fontWeight="600"
                  >
                    (км)
                  </text>
                  
                  {/* Горизонтальные линии станций (2мм = 1км, 2мм ≈ 7.56px) */}
                  {stations
                    .sort((a, b) => (b.distance_km || b.position) - (a.distance_km || a.position))
                    .map((station, i, arr) => {
                      const distance = station.distance_km || station.position;
                      const y = 80 + distance * 7.56;
                      
                      const prevStation = i > 0 ? arr[i - 1] : null;
                      const prevDistance = prevStation ? (prevStation.distance_km || prevStation.position) : 0;
                      const prevY = 80 + prevDistance * 7.56;
                      const distanceBetween = prevDistance - distance;
                      
                      return (
                        <g key={station.id}>
                          {/* Линия станции */}
                          <line
                            x1="150"
                            y1={y}
                            x2={150 + 144 * 15.12}
                            y2={y}
                            stroke="#000000"
                            strokeWidth="2"
                          />
                          
                          {/* Расстояние между станциями (слева от названия) */}
                          {i > 0 && (
                            <>
                              <text
                                x="25"
                                y={(y + prevY) / 2 + 4}
                                textAnchor="middle"
                                fill="#000000"
                                fontSize="10"
                                fontWeight="600"
                              >
                                {distanceBetween.toFixed(1)}
                              </text>
                            </>
                          )}
                          
                          {/* Поле для названия станции */}
                          <rect
                            x="50"
                            y={y - 15}
                            width="100"
                            height="30"
                            fill="#FFFFFF"
                            stroke="#000000"
                            strokeWidth="1.5"
                          />
                          <text
                            x="100"
                            y={y + 5}
                            textAnchor="middle"
                            fill="#000000"
                            fontSize="10"
                            fontWeight="600"
                          >
                            {station.name.length > 12 ? station.name.substring(0, 12) + '...' : station.name}
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
                    
                    const x1 = 150 + t1.departure_time * (15.12 / 10);
                    const x2 = 150 + t1.arrival_time * (15.12 / 10);
                    const y1 = 80 + (d1.distance_km || d1.position) * 7.56;
                    const y2 = 80 + (a1.distance_km || a1.position) * 7.56;
                    
                    const x3 = 150 + t2.departure_time * (15.12 / 10);
                    const x4 = 150 + t2.arrival_time * (15.12 / 10);
                    const y3 = 80 + (d2.distance_km || d2.position) * 7.56;
                    const y4 = 80 + (a2.distance_km || a2.position) * 7.56;
                    
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
                    
                    if (train.departure_time >= 24 * 60 || train.arrival_time >= 24 * 60) return null;
                    
                    const maxX = 150 + 144 * 15.12;
                    
                    const lineStyle = train.line_style || 'solid';
                    const lineWidth = train.line_width || 1.5;
                    const strokeDasharray = 
                      lineStyle === 'dashed' ? '6,4' : 
                      lineStyle === 'dotted' ? '2,3' : 
                      lineStyle === 'dash-dot' ? '10,3,2,3' : '0';
                    
                    // Собираем все точки маршрута с остановками
                    const stops = trainStops
                      .filter(stop => stop.train_id === train.id)
                      .sort((a, b) => a.arrival_time - b.arrival_time);
                    
                    // Строим массив точек: старт -> остановки -> финиш
                    const points: Array<{x: number, y: number, time: number, stationId: number, isStop?: boolean, stopDuration?: number}> = [];
                    
                    // Начальная точка
                    const startX = 150 + train.departure_time * (15.12 / 10);
                    const startY = 80 + (depStation.distance_km || depStation.position) * 7.56;
                    points.push({ x: startX, y: startY, time: train.departure_time, stationId: train.departure_station_id });
                    
                    // Добавляем остановки
                    stops.forEach(stop => {
                      const stopStation = stations.find(s => s.id === stop.station_id);
                      if (!stopStation) return;
                      
                      const stopY = 80 + (stopStation.distance_km || stopStation.position) * 7.56;
                      const stopX1 = 150 + stop.arrival_time * (15.12 / 10);
                      const stopX2 = 150 + stop.departure_time * (15.12 / 10);
                      
                      // Точка прибытия на остановку
                      points.push({ 
                        x: stopX1, 
                        y: stopY, 
                        time: stop.arrival_time, 
                        stationId: stop.station_id,
                        isStop: true 
                      });
                      
                      // Точка отправления с остановки (горизонтальная линия)
                      points.push({ 
                        x: stopX2, 
                        y: stopY, 
                        time: stop.departure_time, 
                        stationId: stop.station_id,
                        isStop: true,
                        stopDuration: stop.stop_duration
                      });
                    });
                    
                    // Конечная точка
                    const endX = 150 + train.arrival_time * (15.12 / 10);
                    const endY = 80 + (arrStation.distance_km || arrStation.position) * 7.56;
                    points.push({ x: endX, y: endY, time: train.arrival_time, stationId: train.arrival_station_id });
                    
                    if (points[0].x > maxX) return null;
                    
                    // Создаем path для polyline
                    const pathPoints = points.map(p => `${p.x},${p.y}`).join(' ');
                    
                    return (
                      <g key={train.id}>
                        {lineStyle === 'double' ? (
                          <>
                            <polyline
                              points={pathPoints}
                              fill="none"
                              stroke={train.color}
                              strokeWidth={lineWidth * 0.6}
                              strokeLinejoin="miter"
                              className="transition-all duration-300 cursor-pointer"
                            />
                            <polyline
                              points={points.map(p => `${p.x},${p.y + lineWidth * 0.8}`).join(' ')}
                              fill="none"
                              stroke={train.color}
                              strokeWidth={lineWidth * 0.6}
                              strokeLinejoin="miter"
                              className="transition-all duration-300 cursor-pointer"
                            />
                          </>
                        ) : (
                          <polyline
                            points={pathPoints}
                            fill="none"
                            stroke={train.color}
                            strokeWidth={lineWidth}
                            strokeDasharray={strokeDasharray}
                            strokeLinejoin="miter"
                            className="transition-all duration-300 cursor-pointer"
                          />
                        )}
                        
                        {/* Метки на всех точках */}
                        {points.map((point, idx) => {
                          const isFirst = idx === 0;
                          const isLast = idx === points.length - 1;
                          const isStopEnd = point.isStop && points[idx - 1]?.y === point.y;
                          
                          return (
                            <g key={`point-${idx}`}>
                              {/* Круги только на старте и финише */}
                              {(isFirst || isLast) && (
                                <circle cx={point.x} cy={point.y} r="4" fill={train.color} />
                              )}
                              
                              {/* Время на старте и финише */}
                              {(isFirst || isLast) && (
                                <text
                                  x={point.x}
                                  y={point.y - 8}
                                  textAnchor="middle"
                                  fill="hsl(var(--foreground))"
                                  fontSize="11"
                                  fontWeight="bold"
                                >
                                  {formatTime(point.time)}
                                </text>
                              )}
                              
                              {/* Длительность остановки */}
                              {isStopEnd && point.stopDuration && (
                                <text
                                  x={(points[idx - 1].x + point.x) / 2}
                                  y={point.y + 15}
                                  textAnchor="middle"
                                  fill={train.color}
                                  fontSize="9"
                                  fontWeight="bold"
                                >
                                  {point.stopDuration} мин
                                </text>
                              )}
                            </g>
                          );
                        })}
                        
                        {/* Номер поезда */}
                        <text
                          x={(startX + endX) / 2}
                          y={(startY + endY) / 2 - 10}
                          textAnchor="middle"
                          fill={train.color}
                          fontSize="11"
                          fontFamily="'Courier New', monospace"
                          fontWeight="600"
                          stroke="hsl(var(--card))"
                          strokeWidth="3"
                          paintOrder="stroke"
                          transform={`rotate(${Math.atan2(endY - startY, endX - startX) * (180 / Math.PI)}, ${(startX + endX) / 2}, ${(startY + endY) / 2 - 10})`}
                        >
                          {train.number}
                        </text>
                      </g>
                    );
                  })}
                  
                  {/* Подпись оси времени */}
                  <text x="1300" y="495" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14" fontWeight="600">
                    Время (часы:минуты)
                  </text>
                      </svg>
                    </div>
                  );
                })()}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4 md:mt-6">
            <div className="grid gap-4">
              <Card className="p-4 mb-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <div className="flex items-start gap-3">
                  <Icon name="Info" size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Как рассчитываются показатели</p>
                    <ul className="text-blue-800 dark:text-blue-200 space-y-1 text-xs">
                      <li>• <strong>Средняя скорость:</strong> Рассчитывается только по времени в движении (без учёта стоянок)</li>
                      <li>• <strong>Средняя стоянка:</strong> Сумма всех стоянок / количество остановок</li>
                      <li>• <strong>Время в движении:</strong> Общее время маршрута минус суммарное время стоянок</li>
                    </ul>
                  </div>
                </div>
              </Card>
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
                    
                    const stops = trainStops.filter(stop => stop.train_id === train.id);
                    const totalStopTime = stops.reduce((sum, stop) => sum + stop.stop_duration, 0);
                    const avgStopTime = stops.length > 0 ? (totalStopTime / stops.length).toFixed(1) : 0;
                    const totalTime = Math.abs(train.arrival_time - train.departure_time);
                    const movingTime = totalTime - totalStopTime;
                    
                    return (
                      <div key={train.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: train.color }} />
                          <div>
                            <div className="font-medium">{train.number}</div>
                            <div className="text-xs text-muted-foreground">
                              {depStation?.name} → {arrStation?.name}
                            </div>
                            {totalStopTime > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {stops.length} {stops.length === 1 ? 'остановка' : 'остановки'} • Средняя стоянка: {avgStopTime} мин
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{speed.toFixed(1)} км/ч</div>
                          <div className="text-xs text-muted-foreground">{distance.toFixed(1)} км</div>
                          <div className="text-xs text-muted-foreground">
                            {movingTime} мин в движении
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold mb-2">
                  Конфликты маршрутов
                  {conflicts.length > 0 && (
                    <span className="ml-2 text-destructive">({conflicts.length})</span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Учитывается количество путей станций. Встречные поезда (чётные/нечётные) на однопутных станциях с разъездом могут пересекаться во время стоянки.
                </p>
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
                                {(() => {
                                  const t1Number = parseInt(conflict.train1.number.replace(/\D/g, '')) || 0;
                                  const t2Number = parseInt(conflict.train2.number.replace(/\D/g, '')) || 0;
                                  const oppositeDirections = (t1Number % 2) !== (t2Number % 2);
                                  
                                  if (oppositeDirections) {
                                    return 'Встречные поезда на однопутном участке без разъезда';
                                  }
                                  return 'Пересечение маршрутов в одно время';
                                })()}
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
                          <div className="font-bold text-lg flex items-center gap-2">
                            {train.number}
                            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {parseInt(train.number.replace(/\D/g, '')) % 2 === 0 ? 'Чётный' : 'Нечётный'}
                            </span>
                          </div>
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
                          <Button variant="outline" size="sm" onClick={() => openStopsDialog(train)}>
                            <Icon name="MapPin" size={16} />
                          </Button>
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
            <Card className="p-4 mb-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <div className="flex items-start gap-3">
                <Icon name="Info" size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Настройка путей и разъездов</p>
                  <ul className="text-blue-800 dark:text-blue-200 space-y-1 text-xs">
                    <li>• <strong>Количество путей:</strong> Определяет, могут ли встречные поезда находиться на станции одновременно</li>
                    <li>• <strong>Разъезд:</strong> Для однопутных станций позволяет встречным поездам (чётные/нечётные) разъезжаться во время стоянки</li>
                    <li>• <strong>Направление:</strong> Чётные и нечётные номера поездов движутся по разным путям</li>
                  </ul>
                </div>
              </div>
            </Card>
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
                        onChange={(e) => {
                          const value = e.target.value;
                          setStationForm({ ...stationForm, position: value === '' ? 0 : Math.max(0, parseInt(value)) });
                        }}
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Расстояние (км)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={stationForm.distance_km}
                        onChange={(e) => {
                          const value = e.target.value;
                          setStationForm({ ...stationForm, distance_km: value === '' ? 0 : Math.max(0, parseFloat(value)) });
                        }}
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Линия (опционально)</Label>
                      <Select value={String(stationForm.line_id || '0')} onValueChange={(value) => setStationForm({ ...stationForm, line_id: value === '0' ? undefined : parseInt(value) })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Без линии" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Без линии</SelectItem>
                          {lines.map(l => (
                            <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Количество путей</Label>
                      <Select value={String(stationForm.tracks_count)} onValueChange={(value) => setStationForm({ ...stationForm, tracks_count: parseInt(value) })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 путь (однопутная)</SelectItem>
                          <SelectItem value="2">2 пути (двухпутная)</SelectItem>
                          <SelectItem value="3">3 пути</SelectItem>
                          <SelectItem value="4">4 пути</SelectItem>
                          <SelectItem value="5">5 путей</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {stationForm.tracks_count === 1 && (
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="siding" 
                          checked={stationForm.has_siding} 
                          onCheckedChange={(checked) => setStationForm({ ...stationForm, has_siding: checked })} 
                        />
                        <Label htmlFor="siding" className="cursor-pointer">
                          Есть разъезд (для встречных поездов)
                        </Label>
                      </div>
                    )}
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
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          <span>Путей: {station.tracks_count || 2}</span>
                          {station.tracks_count === 1 && station.has_siding && (
                            <span className="text-green-600 dark:text-green-400">• Есть разъезд</span>
                          )}
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
            
            <div className="mt-8 pt-8 border-t">
              <h3 className="text-lg font-bold mb-4">Перегоны между станциями</h3>
              <Card className="p-4 mb-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <div className="flex items-start gap-3">
                  <Icon name="Info" size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Однопутные перегоны</p>
                    <p className="text-blue-800 dark:text-blue-200 text-xs">
                      Отметьте перегон как однопутный, если между станциями только один путь. 
                      На таких перегонах конфликты возникают даже для встречных поездов.
                    </p>
                  </div>
                </div>
              </Card>
              
              <div className="grid gap-3">
                {stations.slice(0, -1).map((station, index) => {
                  const nextStation = stations[index + 1];
                  if (!nextStation) return null;
                  
                  const segment = trackSegments.find(seg => 
                    (seg.station_from_id === station.id && seg.station_to_id === nextStation.id) ||
                    (seg.station_from_id === nextStation.id && seg.station_to_id === station.id)
                  );
                  
                  const isSingleTrack = segment?.is_single_track || false;
                  
                  return (
                    <Card key={`${station.id}-${nextStation.id}`} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-12 rounded ${isSingleTrack ? 'bg-red-500' : 'bg-green-500'}`} />
                          <div>
                            <div className="font-medium text-sm">
                              {station.name} → {nextStation.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Расстояние: {Math.abs((nextStation.distance_km || nextStation.position) - (station.distance_km || station.position)).toFixed(1)} км
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm cursor-pointer" htmlFor={`segment-${station.id}-${nextStation.id}`}>
                              Однопутный
                            </Label>
                            <Switch
                              id={`segment-${station.id}-${nextStation.id}`}
                              checked={isSingleTrack}
                              onCheckedChange={async (checked) => {
                                try {
                                  if (segment) {
                                    await api.trackSegments.update({
                                      ...segment,
                                      is_single_track: checked,
                                    });
                                  } else {
                                    await api.trackSegments.create({
                                      station_from_id: station.id,
                                      station_to_id: nextStation.id,
                                      is_single_track: checked,
                                    });
                                  }
                                  await loadData();
                                  toast({ title: checked ? 'Перегон отмечен как однопутный' : 'Перегон отмечен как двухпутный' });
                                } catch (error) {
                                  toast({ title: 'Ошибка', description: String(error), variant: 'destructive' });
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
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

      <Dialog open={stopsDialogOpen} onOpenChange={setStopsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Остановочные пункты - Поезд {selectedTrainForStops?.number}</DialogTitle>
          </DialogHeader>
          {selectedTrainForStops && (
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <h4 className="font-medium">Добавить остановку</h4>
                <Card className="p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 mb-3">
                  <div className="flex items-start gap-2 text-xs text-blue-800 dark:text-blue-200">
                    <Icon name="Info" size={14} className="mt-0.5 flex-shrink-0" />
                    <p>Время прибытия и отправления рассчитывается автоматически на основе расстояния и средней скорости поезда</p>
                  </div>
                </Card>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Станция</Label>
                    <Select value={String(stopForm.station_id || '0')} onValueChange={(value) => setStopForm({ ...stopForm, station_id: parseInt(value) })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите станцию" />
                      </SelectTrigger>
                      <SelectContent>
                        {stations
                          .filter(s => s.id !== selectedTrainForStops.departure_station_id && s.id !== selectedTrainForStops.arrival_station_id)
                          .map(s => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={saveTrainStop} 
                    className="w-full"
                    disabled={stopForm.station_id === 0}
                  >
                    Добавить остановку
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Текущие остановки</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!selectedTrainForStops) return;
                      
                      const currentStops = trainStops.filter(s => s.train_id === selectedTrainForStops.id);
                      for (const stop of currentStops) {
                        await api.trainStops.delete(stop.id);
                      }
                      
                      const depStation = stations.find(s => s.id === selectedTrainForStops.departure_station_id);
                      const arrStation = stations.find(s => s.id === selectedTrainForStops.arrival_station_id);
                      
                      if (!depStation || !arrStation) {
                        toast({ title: "Ошибка", description: "Станции не найдены", variant: "destructive" });
                        return;
                      }
                      
                      const sortedStations = [...stations].sort((a, b) => 
                        (a.distance_km || a.position) - (b.distance_km || b.position)
                      );
                      
                      const depPos = depStation.distance_km || depStation.position;
                      const arrPos = arrStation.distance_km || arrStation.position;
                      const isReverse = depPos > arrPos;
                      
                      const intermediateStations = sortedStations.filter(s => {
                        const pos = s.distance_km || s.position;
                        return isReverse 
                          ? pos < depPos && pos > arrPos && s.id !== selectedTrainForStops.departure_station_id && s.id !== selectedTrainForStops.arrival_station_id
                          : pos > depPos && pos < arrPos && s.id !== selectedTrainForStops.departure_station_id && s.id !== selectedTrainForStops.arrival_station_id;
                      });
                      
                      if (isReverse) intermediateStations.reverse();
                      
                      let avgSpeed = 60;
                      let speedMessage = '';
                      
                      const existingStops = currentStops;
                      if (existingStops.length > 0) {
                        const totalStopDuration = existingStops.reduce((sum, s) => sum + s.stop_duration, 0);
                        const totalTime = Math.abs(selectedTrainForStops.arrival_time - selectedTrainForStops.departure_time);
                        const movingTime = totalTime - totalStopDuration;
                        const totalDistance = Math.abs(arrPos - depPos);
                        
                        if (movingTime > 0 && totalDistance > 0) {
                          avgSpeed = Math.round((totalDistance / (movingTime / 60)) * 10) / 10;
                          speedMessage = ` (автоматически рассчитана: ${avgSpeed} км/ч)`;
                        } else {
                          speedMessage = ' (по умолчанию: 60 км/ч)';
                        }
                      } else {
                        speedMessage = ' (по умолчанию: 60 км/ч)';
                      }
                      
                      const avgStopDuration = existingStops.length > 0 
                        ? Math.round(existingStops.reduce((sum, s) => sum + s.stop_duration, 0) / existingStops.length)
                        : 2;
                      
                      const stopDuration = avgStopDuration;
                      let currentTime = selectedTrainForStops.departure_time;
                      let lastPos = depPos;
                      
                      for (const station of intermediateStations) {
                        const stationPos = station.distance_km || station.position;
                        const distance = Math.abs(stationPos - lastPos);
                        const travelTime = Math.round((distance / avgSpeed) * 60);
                        
                        currentTime += travelTime;
                        const arrivalTime = currentTime;
                        const departureTime = currentTime + stopDuration;
                        
                        await api.trainStops.create({
                          train_id: selectedTrainForStops.id,
                          station_id: station.id,
                          arrival_time: arrivalTime,
                          departure_time: departureTime,
                        });
                        
                        currentTime = departureTime;
                        lastPos = stationPos;
                      }
                      
                      await loadData();
                      toast({ 
                        title: 'Остановки пересчитаны', 
                        description: `Создано ${intermediateStations.length} остановок${speedMessage}, стоянка: ${stopDuration} мин` 
                      });
                    }}
                  >
                    <Icon name="RefreshCw" size={14} className="mr-1" />
                    Пересчитать
                  </Button>
                </div>
                <div className="space-y-2">
                  {trainStops
                    .filter(stop => stop.train_id === selectedTrainForStops.id)
                    .sort((a, b) => a.arrival_time - b.arrival_time)
                    .map(stop => {
                      const station = stations.find(s => s.id === stop.station_id);
                      return (
                        <div key={stop.id} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{station?.name}</div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingStop(stop);
                                  setStopForm({
                                    station_id: stop.station_id,
                                    arrival_hours: Math.floor(stop.arrival_time / 60),
                                    arrival_minutes: stop.arrival_time % 60,
                                    departure_hours: Math.floor(stop.departure_time / 60),
                                    departure_minutes: stop.departure_time % 60,
                                  });
                                }}
                              >
                                <Icon name="Edit" size={16} />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setDeleteTarget({ type: 'stop', id: stop.id });
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Icon name="Trash2" size={16} />
                              </Button>
                            </div>
                          </div>
                          {editingStop?.id === stop.id ? (
                            <div className="space-y-2 pt-2 border-t">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Прибытие (ч:мм)</Label>
                                  <div className="flex gap-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="23"
                                      value={stopForm.arrival_hours}
                                      onChange={(e) => setStopForm({ ...stopForm, arrival_hours: parseInt(e.target.value) || 0 })}
                                      className="text-sm h-8"
                                    />
                                    <Input
                                      type="number"
                                      min="0"
                                      max="59"
                                      value={stopForm.arrival_minutes}
                                      onChange={(e) => setStopForm({ ...stopForm, arrival_minutes: parseInt(e.target.value) || 0 })}
                                      className="text-sm h-8"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs">Отправление (ч:мм)</Label>
                                  <div className="flex gap-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="23"
                                      value={stopForm.departure_hours}
                                      onChange={(e) => setStopForm({ ...stopForm, departure_hours: parseInt(e.target.value) || 0 })}
                                      className="text-sm h-8"
                                    />
                                    <Input
                                      type="number"
                                      min="0"
                                      max="59"
                                      value={stopForm.departure_minutes}
                                      onChange={(e) => setStopForm({ ...stopForm, departure_minutes: parseInt(e.target.value) || 0 })}
                                      className="text-sm h-8"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={async () => {
                                    const arrivalTime = stopForm.arrival_hours * 60 + stopForm.arrival_minutes;
                                    const departureTime = stopForm.departure_hours * 60 + stopForm.departure_minutes;
                                    
                                    await api.trainStops.update({
                                      ...stop,
                                      arrival_time: arrivalTime,
                                      departure_time: departureTime,
                                    });
                                    
                                    setEditingStop(null);
                                    await loadData();
                                    toast({ title: 'Остановка обновлена' });
                                  }}
                                >
                                  Сохранить
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingStop(null)}
                                >
                                  Отмена
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Прибытие: {formatTime(stop.arrival_time)} • Отправление: {formatTime(stop.departure_time)} • Стоянка: {stop.stop_duration} мин
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {trainStops.filter(stop => stop.train_id === selectedTrainForStops.id).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Icon name="MapPin" size={48} className="mx-auto mb-2 opacity-50" />
                      <p>Нет остановок</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
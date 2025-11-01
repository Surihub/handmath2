import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback } from 'react';

// Interfaces
interface Point {
  x: number;
  y: number;
}

interface Path {
  id: number;
  points: Point[];
  strokeWidth: number;
  color: string;
}

interface CanvasState {
    canUndo: boolean;
    canRedo: boolean;
    isEmpty: boolean;
}

export interface CanvasRef {
  clear: () => void;
  getImageData: () => string | null;
  undo: () => void;
  redo: () => void;
}

interface CanvasProps {
    onStateChange: (state: CanvasState) => void;
    theme: 'light' | 'dark';
    mode: 'pen' | 'eraser';
}

const PEN_WIDTH = 4;
const ERASER_WIDTH = 20;

const Canvas = forwardRef<CanvasRef, CanvasProps>(({ onStateChange, theme, mode }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  
  const [paths, setPaths] = useState<Path[]>([]);
  const [history, setHistory] = useState<Path[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Redraw canvas whenever paths change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    paths.forEach(path => {
        context.beginPath();
        context.strokeStyle = path.color;
        context.lineWidth = path.strokeWidth;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        
        if (path.points.length > 0) {
            context.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) {
                context.lineTo(path.points[i].x, path.points[i].y);
            }
        }
        context.stroke();
    });
  }, [paths]);

  // Handle canvas resizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            canvas.width = width;
            canvas.height = height;
            // Trigger redraw after resize
            setPaths(prev => [...prev]);
        }
    });
    
    resizeObserver.observe(parent);
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    
    return () => resizeObserver.unobserve(parent);
  }, []);
  
  const getCoords = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      
      if ('touches' in event && event.touches[0]) {
        return { x: event.touches[0].clientX - rect.left, y: event.touches[0].clientY - rect.top };
      }
      return { x: (event as React.MouseEvent).nativeEvent.offsetX, y: (event as React.MouseEvent).nativeEvent.offsetY };
  }
  
  const pushToHistory = (newPaths: Path[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newPaths);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  };
  
  // Update parent component with canvas state
  useEffect(() => {
      onStateChange({
          canUndo: historyIndex > 0,
          canRedo: historyIndex < history.length - 1,
          isEmpty: paths.length === 0,
      });
  }, [historyIndex, history, paths, onStateChange]);

  // --- Drawing and Erasing Logic ---

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const point = getCoords(event);
    if (!point) return;
    
    isDrawingRef.current = true;

    if (mode === 'pen') {
        const newPath: Path = {
            id: Date.now(),
            points: [point],
            color: theme === 'dark' ? 'white' : 'black',
            strokeWidth: PEN_WIDTH,
        };
        setPaths(prev => [...prev, newPath]);
    } else {
        erase(point);
    }
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!isDrawingRef.current) return;
    
    const point = getCoords(event);
    if (!point) return;
    
    if (mode === 'pen') {
        setPaths(prev => {
            const newPaths = [...prev];
            const lastPath = newPaths[newPaths.length - 1];
            if (lastPath) {
                lastPath.points.push(point);
            }
            return newPaths;
        });
    } else {
        erase(point);
    }
  };

  const finishDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (isDrawingRef.current) {
        pushToHistory(paths);
    }
    isDrawingRef.current = false;
  };

  const erase = (point: Point) => {
    let pathsWereErased = false;
    const remainingPaths = paths.filter(path => {
        for (let i = 0; i < path.points.length - 1; i++) {
            const p1 = path.points[i];
            const p2 = path.points[i+1];
            const dist = distToSegment(point, p1, p2);
            if (dist < ERASER_WIDTH / 2 + path.strokeWidth / 2) {
                pathsWereErased = true;
                return false; // Remove this path
            }
        }
        return true; // Keep this path
    });

    if (pathsWereErased) {
        setPaths(remainingPaths);
    }
  };

  // --- Imperative Handle ---
  useImperativeHandle(ref, () => ({
    clear() {
        setPaths([]);
        setHistory([[]]);
        setHistoryIndex(0);
    },
    undo() {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setPaths(history[newIndex]);
        }
    },
    redo() {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setPaths(history[newIndex]);
        }
    },
    getImageData() {
      if (paths.length === 0) return null;
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.toDataURL('image/png');
    }
  }));

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseUp={finishDrawing}
      onMouseMove={draw}
      onMouseLeave={finishDrawing}
      onTouchStart={startDrawing}
      onTouchEnd={finishDrawing}
      onTouchMove={draw}
      className={`w-full h-full bg-gray-50 dark:bg-gray-900 rounded-lg touch-none ${mode === 'pen' ? 'cursor-crosshair' : 'cursor-grab'}`}
    />
  );
});

// Helper for stroke erasing: Calculate distance from a point to a line segment
function distToSegment(p: Point, v: Point, w: Point) {
    const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
    if (l2 === 0) return Math.sqrt((p.x - v.x)**2 + (p.y - v.y)**2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return Math.sqrt((p.x - projection.x)**2 + (p.y - projection.y)**2);
}

export default Canvas;
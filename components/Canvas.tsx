
import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';

export interface CanvasRef {
  clear: () => void;
  getImageData: () => string | null;
}

interface CanvasProps {
    onDrawingChange: (isEmpty: boolean) => void;
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(({ onDrawingChange }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }
    
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const context = canvas.getContext('2d');
    if (context) {
      context.lineCap = 'round';
      context.strokeStyle = document.documentElement.classList.contains('dark') ? 'white' : 'black';
      context.lineWidth = 4;
      contextRef.current = context;
    }
    
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            const currentContent = context?.getImageData(0,0, canvas.width, canvas.height);
            canvas.width = width;
            canvas.height = height;
            if(currentContent) {
                context?.putImageData(currentContent, 0, 0);
            }
            if (context) {
                context.lineCap = 'round';
                context.strokeStyle = document.documentElement.classList.contains('dark') ? 'white' : 'black';
                context.lineWidth = 4;
            }
        }
    });

    if(parent) {
        resizeObserver.observe(parent);
    }
    
    return () => {
        if(parent) resizeObserver.unobserve(parent);
    }

  }, []);

   useEffect(() => {
    if (contextRef.current) {
        contextRef.current.strokeStyle = document.documentElement.classList.contains('dark') ? 'white' : 'black';
    }
  }, []); // Re-run when theme changes if theme was a prop

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = getCoords(event);
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(offsetX, offsetY);
    isDrawing.current = true;
  };

  const finishDrawing = () => {
    contextRef.current?.closePath();
    isDrawing.current = false;
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const { offsetX, offsetY } = getCoords(event);
    contextRef.current?.lineTo(offsetX, offsetY);
    contextRef.current?.stroke();
    if(isEmpty) {
        setIsEmpty(false);
        onDrawingChange(false);
    }
  };
  
  const getCoords = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if ('touches' in event) { // Touch event
        const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
        return {
            offsetX: event.touches[0].clientX - rect.left,
            offsetY: event.touches[0].clientY - rect.top,
        };
      }
      // Mouse event
      return { offsetX: event.nativeEvent.offsetX, offsetY: event.nativeEvent.offsetY };
  }

  useImperativeHandle(ref, () => ({
    clear() {
      const canvas = canvasRef.current;
      if (canvas && contextRef.current) {
        contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
        onDrawingChange(true);
      }
    },
    getImageData() {
      if(isEmpty) return null;
      return canvasRef.current?.toDataURL('image/png') || null;
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
      className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-crosshair"
    />
  );
});

export default Canvas;

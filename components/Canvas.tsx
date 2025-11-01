import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';

export interface CanvasRef {
  clear: () => void;
  getImageData: () => string | null;
}

interface CanvasProps {
    onDrawingChange: (isEmpty: boolean) => void;
    theme: 'light' | 'dark';
    mode: 'pen' | 'eraser';
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(({ onDrawingChange, theme, mode }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const setupContext = (context: CanvasRenderingContext2D) => {
      context.lineCap = 'round';
      context.lineJoin = 'round';
      
      if (mode === 'pen') {
        context.globalCompositeOperation = 'source-over';
        context.strokeStyle = theme === 'dark' ? 'white' : 'black';
        context.lineWidth = 4;
      } else { // eraser
        context.globalCompositeOperation = 'destination-out';
        context.lineWidth = 20;
      }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const context = canvas.getContext('2d');
    if (!context) return;
    
    contextRef.current = context;

    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            const currentContent = contextRef.current?.getImageData(0,0, canvas.width, canvas.height);
            canvas.width = width;
            canvas.height = height;
            if (contextRef.current) {
                setupContext(contextRef.current); // Re-apply styles
                if(currentContent) {
                    contextRef.current.putImageData(currentContent, 0, 0);
                }
            }
        }
    });
    
    resizeObserver.observe(parent);

    // Initial setup
    const initialWidth = parent.clientWidth;
    const initialHeight = parent.clientHeight;
    if (canvas.width !== initialWidth || canvas.height !== initialHeight) {
      canvas.width = initialWidth;
      canvas.height = initialHeight;
    }
    setupContext(context);
    
    return () => {
        resizeObserver.unobserve(parent);
    }
  }, []);

   useEffect(() => {
    if (contextRef.current) {
        setupContext(contextRef.current);
    }
  }, [theme, mode]);

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const { offsetX, offsetY } = getCoords(event);
    if (!contextRef.current) return;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    isDrawing.current = true;
  };

  const finishDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!contextRef.current) return;
    contextRef.current.closePath();
    isDrawing.current = false;
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!isDrawing.current || !contextRef.current) return;
    const { offsetX, offsetY } = getCoords(event);
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
    if(isEmpty && mode === 'pen') {
        setIsEmpty(false);
        onDrawingChange(false);
    }
  };
  
  const getCoords = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { offsetX: 0, offsetY: 0 };
      const rect = canvas.getBoundingClientRect();
      
      if ('touches' in event) { // Touch event
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
      const canvas = canvasRef.current;
      if(!canvas) return null;
      
      // Check if canvas is actually empty
      const context = canvas.getContext('2d');
      if (!context) return null;
      const pixelBuffer = new Uint32Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
      const isEmptyCanvas = !pixelBuffer.some(color => color !== 0);

      if (isEmptyCanvas) {
          if (!isEmpty) {
              setIsEmpty(true);
              onDrawingChange(true);
          }
          return null;
      }
      
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
      className="w-full h-full bg-gray-50 dark:bg-gray-900 rounded-lg cursor-crosshair touch-none"
    />
  );
});

export default Canvas;

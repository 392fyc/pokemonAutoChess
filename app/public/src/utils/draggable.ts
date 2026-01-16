import React, { useRef, useState, useEffect, useCallback } from 'react';

interface DraggableOptions {
  initialPosition?: { x: number; y: number };
  margin?: number;
}

export function useDraggable(options?: DraggableOptions) {
  const { initialPosition = { x: 0, y: 0 }, margin = 0 } = options || {};
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent, ignoreSelector?: string) => {
    if (ignoreSelector && (e.target as HTMLElement).closest(ignoreSelector)) {
      return;
    }
    setIsDragging(true);
    if (containerRef.current) {
      const bbox = containerRef.current.getBoundingClientRect();
      offset.current = {
        x: e.clientX - bbox.left,
        y: e.clientY - bbox.top,
      };
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return { position, isDragging, handleMouseDown, containerRef };
}

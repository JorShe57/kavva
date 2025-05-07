import { useEffect, useState, RefObject } from 'react';

interface Size {
  width: number;
  height: number;
}

export function useResizeObserver(ref: RefObject<HTMLElement>): Size | undefined {
  const [size, setSize] = useState<Size>();

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });

    observer.observe(ref.current);
    
    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return size;
}
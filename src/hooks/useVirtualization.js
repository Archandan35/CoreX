import { useState, useRef, useCallback, useMemo, useEffect } from 'react';

export function useVirtualization({ items = [], itemHeight = 48, overscan = 5, containerHeight = 400 }) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const totalHeight = items.length * itemHeight;

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);
    return { start, end };
  }, [scrollTop, items.length, itemHeight, overscan, containerHeight]);

  const visibleItems = useMemo(() =>
    items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      ...item,
      _index: visibleRange.start + index,
      _style: { position: 'absolute', top: (visibleRange.start + index) * itemHeight, left: 0, right: 0, height: itemHeight },
    })),
    [items, visibleRange, itemHeight]
  );

  const onScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const scrollToIndex = useCallback((index) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = index * itemHeight;
    }
  }, [itemHeight]);

  const getContainerProps = useCallback(() => ({
    ref: containerRef,
    onScroll,
    style: { overflowY: 'auto', height: containerHeight, position: 'relative' },
  }), [onScroll, containerHeight]);

  const getInnerContainerProps = useCallback(() => ({
    style: { height: totalHeight, position: 'relative' },
  }), [totalHeight]);

  return {
    visibleItems,
    totalHeight,
    containerRef,
    getContainerProps,
    getInnerContainerProps,
    scrollToIndex,
    onScroll,
  };
}

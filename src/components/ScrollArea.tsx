import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function ScrollArea({ children, className = "" }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const thumbHeightRef = useRef(0);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const computeThumb = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { scrollHeight, clientHeight, scrollTop } = el;
    if (scrollHeight <= clientHeight) {
      thumbHeightRef.current = 0;
      setThumbHeight(0);
      return;
    }
    const th = Math.max((clientHeight / scrollHeight) * clientHeight, 28);
    const maxThumbTop = clientHeight - th;
    const maxScrollTop = scrollHeight - clientHeight;
    thumbHeightRef.current = th;
    setThumbHeight(th);
    setThumbTop(maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxThumbTop : 0);
  }, []);

  const showBar = useCallback(() => {
    if (!thumbHeightRef.current) return;
    setVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setVisible(false), 1400);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(computeThumb);
    ro.observe(el);
    computeThumb();
    return () => ro.disconnect();
  }, [computeThumb]);

  const handleScroll = useCallback(() => {
    computeThumb();
    showBar();
  }, [computeThumb, showBar]);

  const handleThumbMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const el = viewportRef.current;
    if (!el) return;
    const startY = e.clientY;
    const startScrollTop = el.scrollTop;

    const onMove = (ev: MouseEvent) => {
      const { scrollHeight, clientHeight } = el;
      const maxScrollTop = scrollHeight - clientHeight;
      const maxThumbTop = clientHeight - thumbHeightRef.current;
      if (maxThumbTop <= 0) return;
      el.scrollTop = startScrollTop + ((ev.clientY - startY) / maxThumbTop) * maxScrollTop;
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  return (
    <div className={`scroll-area ${className}`} onMouseEnter={showBar}>
      <div ref={viewportRef} className="scroll-area__viewport" onScroll={handleScroll}>
        {children}
      </div>
      <div className={`scroll-area__track ${visible ? "is-visible" : ""}`}>
        <div
          className="scroll-area__thumb"
          style={{ height: thumbHeight, transform: `translateY(${thumbTop}px)` }}
          onMouseDown={handleThumbMouseDown}
        />
      </div>
    </div>
  );
}

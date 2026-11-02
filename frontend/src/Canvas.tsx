import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus, LocateFixed, Eraser, Navigation, Sparkles } from 'lucide-react';
import Oneko from 'react-cursor-cat';
import { ParrotApp } from '@/components/ParrotApp';

type View = { x: number; y: number; scale: number };
const initial: View = { x: 0, y: 0, scale: 1 };
const clamp = (n: number) => Math.max(.35, Math.min(2.5, n));

const EMOJIS = ['❤️', '⭐', '✨', '🔥', '🎉', '💡', '🌈', '🍕', '🚀', '🌺', '🍀', '🐾', '🦋'];
const TREASURE_EMOJIS = ['💎', '👑', '🎁', '🏆', '🔮', '💰', '🗝️'];

type Treasure = { id: string; x: number; y: number; emoji: string; discovered: boolean };

function generateTreasures(): Treasure[] {
  const treasures: Treasure[] = [];
  for (let i = 0; i < 50; i++) {
    // Generate random coordinates between radius 1000 and 8000
    const angle = Math.random() * 2 * Math.PI;
    const radius = 1000 + Math.random() * 7000;
    treasures.push({
      id: `treasure-${i}`,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      emoji: TREASURE_EMOJIS[Math.floor(Math.random() * TREASURE_EMOJIS.length)],
      discovered: false
    });
  }
  return treasures;
}

// Application features belong inside this workspace; the control shell is separate.
export function Canvas() {
  const [view, setView] = useState(initial);
  const [stamps, setStamps] = useState<{ id: string; x: number; y: number; emoji: string }[]>([]);
  const [treasures, setTreasures] = useState<Treasure[]>(generateTreasures);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; startX: number; startY: number; isDrag: boolean } | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  function zoom(factor: number, x: number, y: number) {
    setView(v => {
      const scale = clamp(v.scale * factor);
      return { x: x - (x - v.x) * scale / v.scale, y: y - (y - v.y) * scale / v.scale, scale };
    });
  }
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const wheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      if (event.ctrlKey || event.metaKey) {
        const x = event.clientX - rect.left, y = event.clientY - rect.top;
        setView(v => {
          const scale = clamp(v.scale * Math.exp(-event.deltaY * .01));
          return { x: x - (x - v.x) * scale / v.scale, y: y - (y - v.y) * scale / v.scale, scale };
        });
      } else setView(v => ({ ...v, x: v.x - event.deltaX, y: v.y - event.deltaY }));
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, []);
  function down(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
    setDragging(true);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const dx = event.clientX - drag.current.x, dy = event.clientY - drag.current.y;

    if (!drag.current.isDrag && (Math.abs(event.clientX - drag.current.startX) > 3 || Math.abs(event.clientY - drag.current.startY) > 3)) {
      drag.current.isDrag = true;
    }

    drag.current = { ...drag.current, x: event.clientX, y: event.clientY };
    setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
  }
  function end(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id === event.pointerId) {
      if (!drag.current.isDrag) {
        // Click action
        const worldX = (event.clientX - view.x) / view.scale;
        const worldY = (event.clientY - view.y) / view.scale;

        let foundIndex = -1;
        for (let i = 0; i < treasures.length; i++) {
          if (!treasures[i].discovered) {
            const dist = Math.hypot(treasures[i].x - worldX, treasures[i].y - worldY);
            if (dist < 150) {
              foundIndex = i;
              break;
            }
          }
        }

        if (foundIndex !== -1) {
          setTreasures(prev => {
            const next = [...prev];
            next[foundIndex] = { ...next[foundIndex], discovered: true };
            return next;
          });
        } else {
          // Place normal stamp
          const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
          setStamps(prev => {
            const next = [...prev, { id: Math.random().toString(36).slice(2), x: worldX, y: worldY, emoji }];
            if (next.length > 100) return next.slice(next.length - 100);
            return next;
          });
        }
      }
      drag.current = null;
      setDragging(false);
    }
  }

  // Workaround for CJS/ESM interop issue with react-cursor-cat in Vite
  const OnekoComponent = typeof Oneko === 'function' ? Oneko : (Oneko as any).default;

  // Calculate nearest undiscovered treasure
  const viewportCenterX = (innerWidth / 2 - view.x) / view.scale;
  const viewportCenterY = (innerHeight / 2 - view.y) / view.scale;

  let nearestDist = Infinity;
  let nearestAngle = 0;
  let undiscoveredCount = 0;

  for (const t of treasures) {
    if (!t.discovered) {
      undiscoveredCount++;
      const dist = Math.hypot(t.x - viewportCenterX, t.y - viewportCenterY);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestAngle = Math.atan2(t.y - viewportCenterY, t.x - viewportCenterX);
      }
    }
  }

  const isClose = nearestDist < 1500;
  const isVeryClose = nearestDist < 300;

  return <main className="canvas" aria-label="无限画板">
    <div ref={surface} className={`canvas-surface ${dragging ? 'is-dragging' : ''}`} onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} style={{ backgroundSize: `${24 * view.scale}px ${24 * view.scale}px`, backgroundPosition: `${view.x}px ${view.y}px` }}>
      <div className="canvas-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }} aria-hidden="true">
        {stamps.map(stamp => (
          <div key={stamp.id} className="stamp" style={{ left: stamp.x, top: stamp.y }}>
            <div className="stamp-inner">{stamp.emoji}</div>
          </div>
        ))}
        {treasures.map(t => t.discovered && (
          <div key={t.id} className="stamp treasure-stamp" style={{ left: t.x, top: t.y }}>
            <div className="stamp-inner">{t.emoji}</div>
            <div className="treasure-label">发现宝藏！</div>
          </div>
        ))}
      </div>
    </div>
    <div className="canvas-controls" aria-label="画板视图控制">
      {undiscoveredCount > 0 && (
        <div className={`treasure-compass ${isVeryClose ? 'very-close' : isClose ? 'close' : ''}`} title="宝藏探测器">
          {isVeryClose ? <Sparkles className="animate-pulse" /> : <Navigation style={{ transform: `rotate(${nearestAngle + Math.PI / 2}rad)` }} />}
        </div>
      )}
      {stamps.length > 0 && (
        <Button variant="ghost" size="icon-sm" aria-label="清除图章" onClick={() => setStamps([])}><Eraser /></Button>
      )}
      <Button variant="ghost" size="icon-sm" aria-label="缩小画板" onClick={() => zoom(1 / 1.2, innerWidth / 2, innerHeight / 2)}><Minus /></Button>
      <span className="canvas-scale" aria-live="polite">{Math.round(view.scale * 100)}%</span>
      <Button variant="ghost" size="icon-sm" aria-label="放大画板" onClick={() => zoom(1.2, innerWidth / 2, innerHeight / 2)}><Plus /></Button>
      <Button variant="ghost" size="icon-sm" aria-label="重置画板视图" onClick={() => setView(initial)}><LocateFixed /></Button>
    </div>
    <p className="canvas-hint">拖动画板移动 · Ctrl + 滚轮缩放</p>
    {OnekoComponent && <OnekoComponent />}
    <ParrotApp />

  </main>;
}

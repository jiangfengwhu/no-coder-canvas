import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus, LocateFixed, Eraser, Navigation, Sparkles, Pen, Hand, Wand2, Search, Smile, Flag, Music } from 'lucide-react';
import Oneko from 'react-cursor-cat';
import { ParrotApp } from '@/components/ParrotApp';
import { BouncyBall } from '@/components/BouncyBall';
import { MiniGolf } from '@/components/MiniGolf';
import { MusicBox } from '@/components/MusicBox';
import { playStampPlace, playStampPop, playTreasureFound, playMagicSparkle, playBounce } from '@/lib/sound';

type View = { x: number; y: number; scale: number };
const initial: View = { x: 0, y: 0, scale: 1 };
const clamp = (n: number) => Math.max(.35, Math.min(2.5, n));

const EMOJIS = ['❤️', '⭐', '✨', '🔥', '🎉', '💡', '🌈', '🍕', '🚀', '🌺', '🍀', '🐾', '🦋'];
const TREASURE_EMOJIS = ['💎', '👑', '🎁', '🏆', '🔮', '💰', '🗝️'];
const STROKE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'];

type Treasure = { id: string; x: number; y: number; emoji: string; discovered: boolean };
type Point = { x: number; y: number };
type Stroke = { id: string; points: Point[]; color: string };
type Particle = { id: string; x: number; y: number; color: string; tx: string; ty: string };
type MagicParticle = { id: string; x: number; y: number; color: string; size: number };

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
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [ripples, setRipples] = useState<{ id: string; x: number; y: number; color?: string }[]>([]);
  const [tool, setTool] = useState<'pan' | 'pen' | 'magic' | 'scan' | 'stamp-brush' | 'golf'>('pan');
  const [treasures, setTreasures] = useState<Treasure[]>(generateTreasures);
  const [magicParticles, setMagicParticles] = useState<MagicParticle[]>([]);
  const [dragging, setDragging] = useState(false);
  const [ballActive, setBallActive] = useState(false);
  const [musicBoxActive, setMusicBoxActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanPos, setScanPos] = useState({ x: 0, y: 0 });
  const [toast, setToast] = useState<{ id: string; message: string } | null>(null);

  const [shootSequence, setShootSequence] = useState(0);
  const [shootVector, setShootVector] = useState({ x: 0, y: 0 });

  const lastHoverPos = useRef<{ x: number; y: number } | null>(null);
  const lastStrumTime = useRef<Record<string, number>>({});

  function showToast(message: string) {
    const id = Math.random().toString(36).slice(2);
    setToast({ id, message });
    setTimeout(() => {
      setToast(current => current?.id === id ? null : current);
    }, 2500);
  }
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

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      const key = event.key.toLowerCase();

      // Tool switching
      if (key === 'v') { setTool('pan'); showToast('已切换至: 拖动'); }
      if (key === 'p' || key === 'b') { setTool('pen'); showToast('已切换至: 画笔'); }
      if (key === 'm') { setTool('magic'); showToast('已切换至: 魔法棒'); }
      if (key === 's') { setTool('scan'); showToast('已切换至: 扫描仪'); }
      if (key === 'e') { setTool('stamp-brush'); showToast('已切换至: 印章刷'); }
      if (key === 'g') { setTool('golf'); showToast('已切换至: 高尔夫'); }

      // Viewport Pan
      const panStep = 50;
      if (key === 'arrowup') setView(v => ({ ...v, y: v.y + panStep }));
      if (key === 'arrowdown') setView(v => ({ ...v, y: v.y - panStep }));
      if (key === 'arrowleft') setView(v => ({ ...v, x: v.x + panStep }));
      if (key === 'arrowright') setView(v => ({ ...v, x: v.x - panStep }));

      // Viewport Zoom & Reset
      if (key === '=' || key === '+') { zoom(1.2, innerWidth / 2, innerHeight / 2); showToast('已放大'); }
      if (key === '-') { zoom(1 / 1.2, innerWidth / 2, innerHeight / 2); showToast('已缩小'); }
      if (key === '0') { setView(initial); showToast('视图已重置'); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);
  function popStamp(x: number, y: number, id: string) {
    setStamps(prev => prev.filter(s => s.id !== id));
    playStampPop();

    const newParticles: Particle[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 70;
      newParticles.push({
        id: Math.random().toString(36).slice(2),
        x: x,
        y: y,
        color: ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e'][Math.floor(Math.random() * 5)],
        tx: `${Math.cos(angle) * distance}px`,
        ty: `${Math.sin(angle) * distance}px`,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 600);
  }

  function down(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    event.currentTarget.setPointerCapture(event.pointerId);

    // Add visual ripple with dynamic color based on tool
    const rippleColorMap: Record<string, string> = {
      'magic': 'var(--purple-500, #a855f7)',
      'stamp-brush': 'var(--green-500, #22c55e)',
      'scan': 'var(--cyan-500, #06b6d4)',
      'pen': 'var(--blue-500, #3b82f6)',
      'pan': 'var(--primary)',
    };

    const rippleId = Math.random().toString(36).slice(2);
    setRipples(prev => [...prev, { id: rippleId, x: event.clientX, y: event.clientY, color: rippleColorMap[tool] }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== rippleId));
    }, 600);

    if (tool === 'pen') {
      const worldX = (event.clientX - view.x) / view.scale;
      const worldY = (event.clientY - view.y) / view.scale;
      const color = STROKE_COLORS[Math.floor(Math.random() * STROKE_COLORS.length)];
      setCurrentStroke({ id: Math.random().toString(36).slice(2), points: [{ x: worldX, y: worldY }], color });
    } else if (tool === 'magic') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      setDragging(true);
      playMagicSparkle();
    } else if (tool === 'scan') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      setIsScanning(true);
      setScanPos({ x: event.clientX, y: event.clientY });
      playMagicSparkle();
    } else if (tool === 'stamp-brush') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };

      const worldX = (event.clientX - view.x) / view.scale;
      const worldY = (event.clientY - view.y) / view.scale;
      const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      setStamps(prev => {
        const next = [...prev, { id: Math.random().toString(36).slice(2), x: worldX, y: worldY, emoji }];
        if (next.length > 200) return next.slice(next.length - 200);
        return next;
      });
      playStampPlace();
      setDragging(true);
    } else if (tool === 'golf') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      setDragging(true);
    } else {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      setDragging(true);
    }
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const currentWorldX = (event.clientX - view.x) / view.scale;
    const currentWorldY = (event.clientY - view.y) / view.scale;

    // Strumming logic (Harp Mode)
    if (lastHoverPos.current && tool !== 'pen' && strokes.length > 0) {
      const p0_x = lastHoverPos.current.x;
      const p0_y = lastHoverPos.current.y;
      const p1_x = currentWorldX;
      const p1_y = currentWorldY;

      const mouseDist = Math.hypot(p1_x - p0_x, p1_y - p0_y);

      if (mouseDist > 0) {
        for (const stroke of strokes) {
          const now = Date.now();
          if (lastStrumTime.current[stroke.id] && now - lastStrumTime.current[stroke.id] < 100) continue;

          let intersected = false;
          let intersectPt = null;

          for (let i = 0; i < stroke.points.length - 1; i++) {
            const p2 = stroke.points[i];
            const p3 = stroke.points[i+1];

            const s1_x = p1_x - p0_x; const s1_y = p1_y - p0_y;
            const s2_x = p3.x - p2.x; const s2_y = p3.y - p2.y;

            const denom = (-s2_x * s1_y + s1_x * s2_y);
            if (denom === 0) continue;

            const s = (-s1_y * (p0_x - p2.x) + s1_x * (p0_y - p2.y)) / denom;
            const t = ( s2_x * (p0_y - p2.y) - s2_y * (p0_x - p2.x)) / denom;

            if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
              intersected = true;
              intersectPt = { x: p0_x + (t * s1_x), y: p0_y + (t * s1_y) };
              break;
            }
          }

          if (intersected && intersectPt) {
            lastStrumTime.current[stroke.id] = now;
            const speed = Math.min(mouseDist * view.scale * 10, 2000);

            playBounce(speed, stroke.color);

            const newParticle: MagicParticle = {
              id: Math.random().toString(36).slice(2),
              x: intersectPt.x,
              y: intersectPt.y,
              color: stroke.color,
              size: 15 + Math.random() * 15
            };
            setMagicParticles(prev => [...prev.slice(-30), newParticle]);

            setTimeout(() => {
              setMagicParticles(prev => prev.filter(p => p.id !== newParticle.id));
            }, 800);
          }
        }
      }
    }
    lastHoverPos.current = { x: currentWorldX, y: currentWorldY };

    if (tool === 'pen') {
      if (currentStroke) {
        const worldX = (event.clientX - view.x) / view.scale;
        const worldY = (event.clientY - view.y) / view.scale;
        setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, { x: worldX, y: worldY }] } : null);
      }
    } else if (tool === 'magic') {
      if (!drag.current || drag.current.id !== event.pointerId) return;

      const worldX = (event.clientX - view.x) / view.scale;
      const worldY = (event.clientY - view.y) / view.scale;

      // Throttle particle creation based on distance
      const dx = event.clientX - drag.current.x;
      const dy = event.clientY - drag.current.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 10) {
        const newParticle: MagicParticle = {
          id: Math.random().toString(36).slice(2),
          x: worldX,
          y: worldY,
          color: STROKE_COLORS[Math.floor(Math.random() * STROKE_COLORS.length)],
          size: 10 + Math.random() * 20
        };
        setMagicParticles(prev => [...prev.slice(-30), newParticle]);

        // Remove particle after animation
        setTimeout(() => {
          setMagicParticles(prev => prev.filter(p => p.id !== newParticle.id));
        }, 800);

        if (Math.random() < 0.1) playMagicSparkle();
        drag.current = { ...drag.current, x: event.clientX, y: event.clientY, isDrag: true };
      }
    } else if (tool === 'scan') {
      if (!drag.current || drag.current.id !== event.pointerId) return;
      setScanPos({ x: event.clientX, y: event.clientY });

      if (!drag.current.isDrag && (Math.abs(event.clientX - drag.current.startX) > 3 || Math.abs(event.clientY - drag.current.startY) > 3)) {
        drag.current.isDrag = true;
      }
      drag.current = { ...drag.current, x: event.clientX, y: event.clientY };
    } else if (tool === 'stamp-brush') {
      if (!drag.current || drag.current.id !== event.pointerId) return;

      const dx = event.clientX - drag.current.x;
      const dy = event.clientY - drag.current.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 40) {
        const worldX = (event.clientX - view.x) / view.scale;
        const worldY = (event.clientY - view.y) / view.scale;
        const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

        setStamps(prev => {
          const next = [...prev, { id: Math.random().toString(36).slice(2), x: worldX, y: worldY, emoji }];
          if (next.length > 200) return next.slice(next.length - 200);
          return next;
        });
        playStampPlace();

        drag.current = { ...drag.current, x: event.clientX, y: event.clientY, isDrag: true };
      }
    } else if (tool === 'golf') {
      if (!drag.current || drag.current.id !== event.pointerId) return;
      if (!drag.current.isDrag && (Math.abs(event.clientX - drag.current.startX) > 3 || Math.abs(event.clientY - drag.current.startY) > 3)) {
        drag.current.isDrag = true;
      }
      drag.current = { ...drag.current, x: event.clientX, y: event.clientY };
    } else {
      if (!drag.current || drag.current.id !== event.pointerId) return;
      const dx = event.clientX - drag.current.x, dy = event.clientY - drag.current.y;

      if (!drag.current.isDrag && (Math.abs(event.clientX - drag.current.startX) > 3 || Math.abs(event.clientY - drag.current.startY) > 3)) {
        drag.current.isDrag = true;
      }

      drag.current = { ...drag.current, x: event.clientX, y: event.clientY };
      setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
    }
  }
  function end(event: PointerEvent<HTMLDivElement>) {
    if (isScanning) setIsScanning(false);

    if (tool === 'pen') {
      if (currentStroke) {
        setStrokes(prev => [...prev, currentStroke]);
        setCurrentStroke(null);
      }
    } else if (drag.current?.id === event.pointerId) {
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
          playTreasureFound();
          showToast(`发现宝藏！ ${treasures[foundIndex].emoji}`);

          // Spawn confetti particles
          const newParticles: Particle[] = [];
          for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 150;
            newParticles.push({
              id: Math.random().toString(36).slice(2),
              x: treasures[foundIndex].x,
              y: treasures[foundIndex].y,
              color: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'][Math.floor(Math.random() * 5)],
              tx: `${Math.cos(angle) * distance}px`,
              ty: `${Math.sin(angle) * distance}px`,
            });
          }
          setParticles(prev => [...prev, ...newParticles]);
          setTimeout(() => {
            setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
          }, 600);

        } else {
          // Check if clicking on an existing stamp to pop it
          let poppedStampId: string | null = null;
          for (let i = stamps.length - 1; i >= 0; i--) {
            const dist = Math.hypot(stamps[i].x - worldX, stamps[i].y - worldY);
            if (dist < 40) { // Stamp hit radius
              poppedStampId = stamps[i].id;
              break;
            }
          }

          if (poppedStampId) {
            popStamp(worldX, worldY, poppedStampId);
          } else {
            // Place normal stamp if not using stamp-brush (as it already placed one on down)
            if (tool !== 'stamp-brush') {
              const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
              setStamps(prev => {
                const next = [...prev, { id: Math.random().toString(36).slice(2), x: worldX, y: worldY, emoji }];
                if (next.length > 200) return next.slice(next.length - 200);
                return next;
              });
              playStampPlace();
            }
          }
        }
      }
      drag.current = null;
      setDragging(false);
    } else if (tool === 'golf' && drag.current?.id === event.pointerId) {
      if (drag.current.isDrag) {
        const dx = drag.current.startX - event.clientX;
        const dy = drag.current.startY - event.clientY;
        const powerMultiplier = 8;
        setShootVector({ x: dx * powerMultiplier / view.scale, y: dy * powerMultiplier / view.scale });
        setShootSequence(s => s + 1);
      }
      drag.current = null;
      setDragging(false);
    }
  }

  // Workaround for CJS/ESM interop issue with react-cursor-cat in Vite
  const OnekoComponent = typeof Oneko === 'function' ? Oneko : (Oneko as any).default;

  function doubleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const worldX = (event.clientX - view.x) / view.scale;
    const worldY = (event.clientY - view.y) / view.scale;

    playTreasureFound();

    const newParticles: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 300;
      newParticles.push({
        id: Math.random().toString(36).slice(2),
        x: worldX,
        y: worldY,
        color: STROKE_COLORS[Math.floor(Math.random() * STROKE_COLORS.length)],
        tx: `${Math.cos(angle) * distance}px`,
        ty: `${Math.sin(angle) * distance}px`,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 600);
  }

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
    {toast && (
      <div className="canvas-toast" aria-live="polite" role="status">
        {toast.message}
      </div>
    )}
    <div className={`canvas-edge-glow ${isVeryClose ? 'very-close' : isClose ? 'close' : ''}`} aria-hidden="true" />
    {isScanning && (
      <div className="lens-overlay" style={{ '--mouse-x': scanPos.x, '--mouse-y': scanPos.y } as React.CSSProperties} aria-hidden="true" />
    )}
    <div ref={surface} className={`canvas-surface tool-${tool} ${dragging ? 'is-dragging' : ''}`} onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onDoubleClick={doubleClick} style={{ backgroundSize: `${24 * view.scale}px ${24 * view.scale}px`, backgroundPosition: `${view.x}px ${view.y}px` }}>
      {ripples.map(ripple => (
        <div key={ripple.id} className="interaction-ripple" style={{ left: ripple.x, top: ripple.y, background: ripple.color || 'var(--primary)' }} />
      ))}
      <div className="canvas-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }} aria-hidden="true">
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
          {strokes.map(stroke => (
            <polyline key={stroke.id} points={stroke.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {currentStroke && (
            <polyline points={currentStroke.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={currentStroke.color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
        {stamps.map(stamp => (
          <div key={stamp.id} className="stamp" style={{ left: stamp.x, top: stamp.y }}>
            <div className="stamp-inner">{stamp.emoji}</div>
          </div>
        ))}
        {treasures.map(t => t.discovered ? (
          <div key={t.id} className="stamp treasure-stamp" style={{ left: t.x, top: t.y }}>
            <div className="stamp-inner">{t.emoji}</div>
            <div className="treasure-label">发现宝藏！</div>
          </div>
        ) : (
          <div key={t.id} className="hidden-treasure" style={{
            left: t.x, top: t.y,
            opacity: isScanning && Math.hypot((t.x * view.scale + view.x) - scanPos.x, (t.y * view.scale + view.y) - scanPos.y) < 200 ? 1 : 0
          }}>
            {t.emoji}
          </div>
        ))}
        {particles.map(p => (
          <div key={p.id} className="canvas-particle" style={{
            left: p.x - 4, top: p.y - 4, width: 8, height: 8, backgroundColor: p.color,
            '--tx': p.tx, '--ty': p.ty
          } as React.CSSProperties} />
        ))}
        {magicParticles.map(p => (
          <div key={p.id} className="magic-particle" style={{
            left: p.x, top: p.y, width: p.size, height: p.size, backgroundColor: p.color,
            color: p.color
          }} aria-hidden="true">
             <Sparkles size={p.size} />
          </div>
        ))}
        {ballActive && <BouncyBall strokes={strokes} view={view} stamps={stamps} onStampHit={(id, x, y) => popStamp(x, y, id)} />}
        {musicBoxActive && <MusicBox strokes={strokes} view={view} stamps={stamps} />}
        {tool === 'golf' && <MiniGolf strokes={strokes} view={view} shootSequence={shootSequence} shootVector={shootVector} />}
      </div>

      {/* Aiming line overlay for golf */}
      {tool === 'golf' && dragging && drag.current && drag.current.isDrag && (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
          <line
            x1={drag.current.startX}
            y1={drag.current.startY}
            x2={drag.current.x}
            y2={drag.current.y}
            stroke="var(--primary)"
            strokeWidth="4"
            strokeDasharray="8 8"
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
    <div className="canvas-controls" aria-label="画板视图控制">
      {undiscoveredCount > 0 && (
        <div className={`treasure-compass ${isVeryClose ? 'very-close' : isClose ? 'close' : ''}`} title="宝藏探测器">
          {isVeryClose ? <Sparkles className="animate-pulse" /> : <Navigation style={{ transform: `rotate(${nearestAngle + Math.PI / 2}rad)` }} />}
        </div>
      )}
      <Button variant={ballActive ? 'secondary' : 'ghost'} size="icon-sm" aria-label="弹力球游戏" onClick={() => { setBallActive(prev => { const next = !prev; showToast(next ? '弹力球游戏: 开启' : '弹力球游戏: 关闭'); return next; }); }}><Sparkles /></Button>
      <Button variant={musicBoxActive ? 'secondary' : 'ghost'} size="icon-sm" aria-label="八音盒" onClick={() => { setMusicBoxActive(prev => { const next = !prev; showToast(next ? '八音盒: 开启' : '八音盒: 关闭'); return next; }); }}><Music /></Button>
      <Button variant={tool === 'pan' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="拖动画板" onClick={() => { setTool('pan'); showToast('已切换至: 拖动'); }}><Hand /></Button>
      <Button variant={tool === 'pen' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="画笔" onClick={() => { setTool('pen'); showToast('已切换至: 画笔'); }}><Pen /></Button>
      <Button variant={tool === 'magic' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="魔法棒" onClick={() => { setTool('magic'); showToast('已切换至: 魔法棒'); }}><Wand2 /></Button>
      <Button variant={tool === 'scan' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="扫描仪" onClick={() => { setTool('scan'); showToast('已切换至: 扫描仪'); }}><Search /></Button>
      <Button variant={tool === 'stamp-brush' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="印章刷" onClick={() => { setTool('stamp-brush'); showToast('已切换至: 印章刷'); }}><Smile /></Button>
      <Button variant={tool === 'golf' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="高尔夫" onClick={() => { setTool('golf'); showToast('已切换至: 高尔夫'); }}><Flag /></Button>
      {(stamps.length > 0 || strokes.length > 0) && (
        <Button variant="ghost" size="icon-sm" aria-label="清除内容" onClick={() => { setStamps([]); setStrokes([]); showToast('已清空画板内容'); }}><Eraser /></Button>
      )}
      <Button variant="ghost" size="icon-sm" aria-label="缩小画板" onClick={() => zoom(1 / 1.2, innerWidth / 2, innerHeight / 2)}><Minus /></Button>
      <span className="canvas-scale" aria-live="polite">{Math.round(view.scale * 100)}%</span>
      <Button variant="ghost" size="icon-sm" aria-label="放大画板" onClick={() => zoom(1.2, innerWidth / 2, innerHeight / 2)}><Plus /></Button>
      <Button variant="ghost" size="icon-sm" aria-label="重置画板视图" onClick={() => { setView(initial); showToast('视图已重置'); }}><LocateFixed /></Button>
    </div>
    <p className="canvas-hint">拖动或方向键移动 · Ctrl+滚轮或+/-缩放 · 0 重置 · 快捷键 V / P(B) / M / S / E / G</p>
    {OnekoComponent && <OnekoComponent />}
    <ParrotApp />

  </main>;
}

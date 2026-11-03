import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus, LocateFixed, Eraser, Navigation, Sparkles, Pen, Hand, Wand2, Search, Smile, Flag, Music, Radar, Magnet, Swords, PartyPopper, Snowflake, Gamepad2, Tornado, Pickaxe, Zap, Rocket, Droplet, CircleDotDashed, Fish } from 'lucide-react';
import Oneko from 'react-cursor-cat';
import { ParrotApp } from '@/components/ParrotApp';
import { BouncyBall } from '@/components/BouncyBall';
import { MiniGolf } from '@/components/MiniGolf';
import { MusicBox } from '@/components/MusicBox';
import { FruitNinja } from '@/components/FruitNinja';
import { CanvasSnake } from '@/components/CanvasSnake';
import { SpaceShooter } from '@/components/SpaceShooter';
import { WildlifeTracker } from '@/components/WildlifeTracker';
import { playStampPlace, playStampPop, playTreasureFound, playMagicSparkle, playBounce } from '@/lib/sound';

type View = { x: number; y: number; scale: number };
const initial: View = { x: 0, y: 0, scale: 1 };
const clamp = (n: number) => Math.max(.35, Math.min(2.5, n));

const EMOJIS = ['❤️', '⭐', '✨', '🔥', '🎉', '💡', '🌈', '🍕', '🚀', '🌺', '🍀', '🐾', '🦋'];
const TREASURE_EMOJIS = ['💎', '👑', '🎁', '🏆', '🔮', '💰', '🗝️'];
const FOSSIL_EMOJIS = ['🦴', '💎', '🦖', '🏺', '🪙', '🗿'];
const STROKE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'];

const ALCHEMY_PAIRS: [string, string, string][] = [
  ['🔥', '🍀', '🌳'],
  ['🔥', '💧', '☁️'],
  ['⭐', '🚀', '🛸'],
  ['💡', '❤️', '💖'],
  ['🦋', '🌺', '🧚'],
  ['🐾', '🍕', '💩'],
  ['💧', '🌈', '🦄'],
  ['✨', '🎉', '🎊']
];
const ALCHEMY_RECIPES = Object.fromEntries(
  ALCHEMY_PAIRS.map(([a, b, result]) => [[a, b].sort().join('+'), result])
);

type Treasure = { id: string; x: number; y: number; emoji: string; discovered: boolean };
type Fossil = { id: string; x: number; y: number; emoji: string; maxHP: number; hp: number };
type Point = { x: number; y: number };
type Stroke = { id: string; points: Point[]; color: string };
type Particle = { id: string; x: number; y: number; color: string; tx: string; ty: string };
type MagicParticle = { id: string; x: number; y: number; color: string; size: number };
type VisualRing = { id: string; color: string };
type Bubble = { id: string; x: number; y: number; radius: number; capturedEmoji?: {id: string, emoji: string}; floating: boolean; phase: number };
type SoundCaption = { id: string; color: string; text: string; x: number; y: number; isOffscreen?: boolean; angle?: number; worldX?: number; worldY?: number };
type SonarPing = { id: string; x: number; y: number };
type SonarHighlight = { id: string; x: number; y: number; type: 'treasure' | 'stamp' | 'fossil'; delay: number; emoji: string };
type FishingPond = { id: string; x: number; y: number; active: boolean };

const FISH_EMOJIS = ['🐟', '🐠', '🐡', '🐙', '🦑', '🦐', '🦞', '🦀', '🦈', '🐬', '🐳', '🐢'];

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

function generateFossils(): Fossil[] {
  const fossils: Fossil[] = [];
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const radius = 1000 + Math.random() * 7000;
    const maxHP = 50 + Math.floor(Math.random() * 100);
    fossils.push({
      id: `fossil-${i}`,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      emoji: FOSSIL_EMOJIS[Math.floor(Math.random() * FOSSIL_EMOJIS.length)],
      maxHP,
      hp: maxHP
    });
  }
  return fossils;
}

function generateFishingPonds(): FishingPond[] {
  const ponds: FishingPond[] = [];
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const radius = 1000 + Math.random() * 7000;
    ponds.push({
      id: `pond-${i}`,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      active: true
    });
  }
  return ponds;
}

// Application features belong inside this workspace; the control shell is separate.
export function Canvas() {

  const [view, setView] = useState(initial);
  const [stamps, setStamps] = useState<{ id: string; x: number; y: number; emoji: string }[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [ripples, setRipples] = useState<{ id: string; x: number; y: number; color?: string }[]>([]);
  const [tool, setTool] = useState<'pan' | 'pen' | 'magic' | 'scan' | 'stamp-brush' | 'golf' | 'sonar' | 'magnet' | 'ninja' | 'confetti' | 'kaleidoscope' | 'snake' | 'tornado' | 'dig' | 'laser' | 'shooter' | 'bubble' | 'blackhole' | 'fish'>('pan');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [treasures, setTreasures] = useState<Treasure[]>(generateTreasures);
  const [fossils, setFossils] = useState<Fossil[]>(generateFossils);
  const [fishingPonds, setFishingPonds] = useState<FishingPond[]>(generateFishingPonds);
  const [fishingState, setFishingState] = useState<{ active: boolean; pondId: string | null; bobberX: number; bobberY: number; status: 'idle' | 'waiting' | 'bite' | 'caught' | 'escaped' }>({ active: false, pondId: null, bobberX: 0, bobberY: 0, status: 'idle' });

  useEffect(() => {
      if (fishingState.status === 'waiting') {
        const waitTime = 2000 + Math.random() * 3000;
        const t = setTimeout(() => {
          setFishingState(prev => prev.status === 'waiting' ? { ...prev, status: 'bite' } : prev);
        }, waitTime);
        return () => clearTimeout(t);
      }

      if (fishingState.status === 'bite') {
        const escapeTime = 800 + Math.random() * 500;
        const t = setTimeout(() => {
          setFishingState(prev => {
            if (prev.status === 'bite') {
              showToast('哎呀，鱼跑了！');
              return { ...prev, status: 'escaped' };
            }
            return prev;
          });

          setTimeout(() => {
            setFishingState(prev => prev.status === 'escaped' ? { active: false, pondId: null, bobberX: 0, bobberY: 0, status: 'idle' } : prev);
          }, 1500);
        }, escapeTime);
        return () => clearTimeout(t);
      }
    }, [fishingState.status]);


  const [magicParticles, setMagicParticles] = useState<MagicParticle[]>([]);
  const [dragging, setDragging] = useState(false);
  const [ballActive, setBallActive] = useState(false);
  const [musicBoxActive, setMusicBoxActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanPos, setScanPos] = useState({ x: 0, y: 0 });
  const [sonarPings, setSonarPings] = useState<SonarPing[]>([]);
  const [sonarHighlights, setSonarHighlights] = useState<SonarHighlight[]>([]);
  const [isRepelling, setIsRepelling] = useState(false);
  const [toast, setToast] = useState<{ id: string; message: string } | null>(null);

  const [activeTornadoes, setActiveTornadoes] = useState<{ id: string; x: number; y: number }[]>([]);
  const [activeBlackholes, setActiveBlackholes] = useState<{ id: string; x: number; y: number }[]>([]);
  const [activeLasers, setActiveLasers] = useState<{ id: string; paths: {x1: number, y1: number, x2: number, y2: number}[]; sparks: {x: number, y: number}[] }[]>([]);
  const [laserAiming, setLaserAiming] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);

  const [shootSequence, setShootSequence] = useState(0);
  const [shootVector, setShootVector] = useState({ x: 0, y: 0 });

  const [visualRings, setVisualRings] = useState<VisualRing[]>([]);
  const [soundCaptions, setSoundCaptions] = useState<SoundCaption[]>([]);
  const viewRef = useRef<View>(initial);
  const bubblesRef = useRef<Bubble[]>([]);
  const stampsRef = useRef<{ id: string; x: number; y: number; emoji: string }[]>([]);
  const strokesRef = useRef<Stroke[]>([]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    bubblesRef.current = bubbles;
  }, [bubbles]);

  useEffect(() => {
    stampsRef.current = stamps;
  }, [stamps]);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);


  const calculateLaserPath = (startX: number, startY: number, dirX: number, dirY: number) => {
    let px = startX;
    let py = startY;
    let dx = dirX;
    let dy = dirY;
    const paths: {x1: number, y1: number, x2: number, y2: number}[] = [];
    const sparks: {x: number, y: number}[] = [];
    const maxBounces = 20;
    const rayLength = 8000;

    for (let bounce = 0; bounce < maxBounces; bounce++) {
      let closestT = 1;
      let hitNormalX = 0;
      let hitNormalY = 0;
      let hitType = 'none';
      let hitX = px + dx * rayLength;
      let hitY = py + dy * rayLength;

      // Check intersection with strokes (segments)
      for (const stroke of strokes) {
        for (let i = 0; i < stroke.points.length - 1; i++) {
          const p1 = stroke.points[i];
          const p2 = stroke.points[i+1];
          const sx1 = p1.x; const sy1 = p1.y;
          const sx2 = p2.x; const sy2 = p2.y;

          const rdx = dx * rayLength; const rdy = dy * rayLength;
          const sdx = sx2 - sx1; const sdy = sy2 - sy1;
          const denom = -sdx * rdy + rdx * sdy;
          if (denom === 0) continue;

          const t = (-sdy * (px - sx1) + sdx * (py - sy1)) / denom;
          const u = ( rdx * (py - sy1) - rdy * (px - sx1)) / denom;

          if (t > 0.001 && t < closestT && u >= 0 && u <= 1) {
            closestT = t;
            hitX = px + t * rdx;
            hitY = py + t * rdy;

            // normal vector to the segment
            let nx = -sdy; let ny = sdx;
            const len = Math.hypot(nx, ny);
            nx /= len; ny /= len;
            // Ensure normal points against ray direction
            if (nx * dx + ny * dy > 0) { nx = -nx; ny = -ny; }
            hitNormalX = nx; hitNormalY = ny;
            hitType = 'stroke';
          }
        }
      }

      // Check intersection with stamps (circles, radius approx 20)
      const stampRadius = 24;
      for (const stamp of stamps) {
        const cx = stamp.x; const cy = stamp.y;
        const fx = px - cx; const fy = py - cy;
        const rdx = dx * rayLength; const rdy = dy * rayLength;
        const a = rdx * rdx + rdy * rdy;
        const b = 2 * (fx * rdx + fy * rdy);
        const c = fx * fx + fy * fy - stampRadius * stampRadius;
        let discriminant = b * b - 4 * a * c;

        if (discriminant >= 0) {
          discriminant = Math.sqrt(discriminant);
          const t1 = (-b - discriminant) / (2 * a);
          const t2 = (-b + discriminant) / (2 * a);

          let t = -1;
          if (t1 > 0.001) t = t1;
          else if (t2 > 0.001) t = t2;

          if (t > 0.001 && t < closestT) {
            closestT = t;
            hitX = px + t * rdx;
            hitY = py + t * rdy;

            let nx = hitX - cx; let ny = hitY - cy;
            const len = Math.hypot(nx, ny);
            nx /= len; ny /= len;
            hitNormalX = nx; hitNormalY = ny;
            hitType = 'stamp';
          }
        }
      }

      paths.push({ x1: px, y1: py, x2: hitX, y2: hitY });

      if (hitType !== 'none') {
        sparks.push({ x: hitX, y: hitY });
        // Reflection: R = D - 2(D.N)N
        const dot = dx * hitNormalX + dy * hitNormalY;
        dx = dx - 2 * dot * hitNormalX;
        dy = dy - 2 * dot * hitNormalY;
        px = hitX;
        py = hitY;
      } else {
        break; // No hit, ray goes off to infinity (rayLength)
      }
    }
    return { paths, sparks };
  };

  // Emoji Alchemy logic
  useEffect(() => {
    if (stamps.length < 2) return;

    // Using a timeout to avoid reacting immediately during render
    const timeout = setTimeout(() => {
      let merged = false;
      const toRemove = new Set<string>();
      let newStamp: { x: number, y: number, emoji: string } | null = null;
      let newParticles: Particle[] = [];
      let alchemyResult = '';

      for (let i = 0; i < stamps.length; i++) {
        if (merged) break;
        for (let j = i + 1; j < stamps.length; j++) {
          const s1 = stamps[i];
          const s2 = stamps[j];
          const dist = Math.hypot(s1.x - s2.x, s1.y - s2.y);

          if (dist < 80) {
            const recipeKey = [s1.emoji, s2.emoji].sort().join('+');
            if (ALCHEMY_RECIPES[recipeKey]) {
              merged = true;
              toRemove.add(s1.id);
              toRemove.add(s2.id);
              alchemyResult = ALCHEMY_RECIPES[recipeKey];
              const midX = (s1.x + s2.x) / 2;
              const midY = (s1.y + s2.y) / 2;
              newStamp = { x: midX, y: midY, emoji: alchemyResult };

              for (let k = 0; k < 20; k++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 20 + Math.random() * 80;
                newParticles.push({
                  id: Math.random().toString(36).slice(2),
                  x: midX,
                  y: midY,
                  color: STROKE_COLORS[Math.floor(Math.random() * STROKE_COLORS.length)],
                  tx: `${Math.cos(angle) * distance}px`,
                  ty: `${Math.sin(angle) * distance}px`,
                });
              }
              break;
            }
          }
        }
      }

      if (merged && newStamp) {
        setStamps(prev => {
          const filtered = prev.filter(s => !toRemove.has(s.id));
          return [...filtered, { id: Math.random().toString(36).slice(2), x: newStamp!.x, y: newStamp!.y, emoji: newStamp!.emoji }];
        });

        playMagicSparkle();
        showToast(`炼金术：合成了 ${alchemyResult}!`);

        if (newParticles.length > 0) {
          setParticles(prev => [...prev, ...newParticles]);
          setTimeout(() => {
             setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
          }, 600);
        }
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [stamps]);

  const handleAnimalDiscover = (x: number, y: number, emoji: string) => {
    setStamps(prev => {
      const next = [...prev, { id: Math.random().toString(36).slice(2), x, y, emoji }];
      if (next.length > 200) return next.slice(next.length - 200);
      return next;
    });
    playTreasureFound();
    showToast(`发现野生动物！ ${emoji}`);
  };

  useEffect(() => {
    const handleVisualSound = (e: Event) => {
      const customEvent = e as CustomEvent<{ color: string; text?: string; x?: number; y?: number }>;
      if (customEvent.detail && customEvent.detail.color) {
        const id = Math.random().toString(36).slice(2);
        setVisualRings(prev => [...prev, { id, color: customEvent.detail.color }]);

        if (customEvent.detail.text) {
          let screenX = 50;
          let screenY = 50;
          let isOffscreen = false;
          let angle = 0;

          if (customEvent.detail.x !== undefined && customEvent.detail.y !== undefined) {
             const v = viewRef.current;
             const absoluteX = customEvent.detail.x * v.scale + v.x;
             const absoluteY = customEvent.detail.y * v.scale + v.y;

             screenX = (absoluteX / window.innerWidth) * 100;
             screenY = (absoluteY / window.innerHeight) * 100;

             if (screenX < 5 || screenX > 95 || screenY < 5 || screenY > 95) {
                 isOffscreen = true;
                 const clampedX = Math.max(5, Math.min(95, screenX));
                 const clampedY = Math.max(5, Math.min(95, screenY));

                 const dx = screenX - 50;
                 const dy = screenY - 50;
                 angle = Math.atan2(dy, dx);

                 screenX = clampedX;
                 screenY = clampedY;
             }
          } else {
            screenX = 10 + Math.random() * 80;
            screenY = 10 + Math.random() * 80;
          }
          setSoundCaptions(prev => [...prev, { id, color: customEvent.detail.color, text: customEvent.detail.text!, x: screenX, y: screenY, isOffscreen, angle, worldX: customEvent.detail.x, worldY: customEvent.detail.y }]);

          setTimeout(() => {
            setSoundCaptions(prev => prev.filter(c => c.id !== id));
          }, 1500); // Wait for float-up animation to complete
        }

        setTimeout(() => {
          setVisualRings(prev => prev.filter(r => r.id !== id));
        }, 800); // matches CSS animation duration
      }
    };
    window.addEventListener('app-sound-visual', handleVisualSound);
    return () => window.removeEventListener('app-sound-visual', handleVisualSound);
  }, []);


  const lastHoverPos = useRef<{ x: number; y: number } | null>(null);
  const pointerWorldPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastStrumTime = useRef<Record<string, number>>({});

  function showToast(message: string) {
    const id = Math.random().toString(36).slice(2);
    setToast({ id, message });
    setTimeout(() => {
      setToast(current => current?.id === id ? null : current);
    }, 2500);
  }
  const drag = useRef<{ id: number; x: number; y: number; startX: number; startY: number; isDrag: boolean } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsRepelling(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsRepelling(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
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
      if (key === 'f') { setTool('fish'); showToast('已切换至: 钓鱼'); }
      if (key === 'r') { setTool('sonar'); showToast('已切换至: 声纳探测'); }
      if (key === 'a') { setTool('magnet'); showToast('已切换至: 磁铁'); }
      if (key === 'n') { setTool('ninja'); showToast('已切换至: 切水果'); }
      if (key === 'c') { setTool('confetti'); showToast('已切换至: 派对纸屑'); }
      if (key === 'k') { setTool('kaleidoscope'); showToast('已切换至: 万花筒'); }
      if (key === 't') { setTool('tornado'); showToast('已切换至: 龙卷风'); }
      if (key === 'd') { setTool('dig'); showToast('已切换至: 挖掘'); }
      if (key === 'l') { setTool('laser'); showToast('已切换至: 激光'); }
      if (key === 'u') { setTool('bubble'); showToast('已切换至: 吹泡泡'); }
      if (key === 'h') { setTool('blackhole'); showToast('已切换至: 黑洞'); }

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
    (window as any).__lastPointerWorldPos = { x: (event.clientX - view.x) / view.scale, y: (event.clientY - view.y) / view.scale };

    // Add visual ripple with dynamic color based on tool
    const rippleColorMap: Record<string, string> = {
      'confetti': 'var(--pink-500, #ec4899)',
      'magic': 'var(--purple-500, #a855f7)',
      'stamp-brush': 'var(--green-500, #22c55e)',
      'scan': 'var(--cyan-500, #06b6d4)',
      'sonar': 'var(--cyan-400, #22d3ee)',
      'pen': 'var(--blue-500, #3b82f6)',
      'pan': 'var(--primary)',
      'dig': 'var(--orange-500, #f97316)',
    };

    const rippleId = Math.random().toString(36).slice(2);
    setRipples(prev => [...prev, { id: rippleId, x: event.clientX, y: event.clientY, color: rippleColorMap[tool] }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== rippleId));
    }, 600);

    if (tool === 'snake' || tool === 'shooter') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: true };
      setDragging(true);
      pointerWorldPosRef.current = { x: (event.clientX - view.x) / view.scale, y: (event.clientY - view.y) / view.scale };
    } else if (tool === 'pen' || tool === 'kaleidoscope') {
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
    } else if (tool === 'sonar') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      setDragging(true);
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
    } else if (tool === 'magnet') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      setDragging(true);
    } else if (tool === 'tornado') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      setDragging(true);
      const tornadoId = Math.random().toString(36).slice(2);
      setActiveTornadoes(prev => [...prev, { id: tornadoId, x: event.clientX, y: event.clientY }]);
    } else if (tool === 'ninja') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      setDragging(true);
    } else if (tool === 'confetti') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      setDragging(true);
      playStampPop();
    } else if (tool === 'dig') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      setDragging(true);
    } else if (tool === 'laser') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      const worldX = (event.clientX - view.x) / view.scale;
      const worldY = (event.clientY - view.y) / view.scale;
      setLaserAiming({ startX: worldX, startY: worldY, currentX: worldX, currentY: worldY });
      setDragging(true);
    } else if (tool === 'fish') {
      const worldX = (event.clientX - view.x) / view.scale;
      const worldY = (event.clientY - view.y) / view.scale;

      let nearestPondId: string | null = null;
      for (const p of fishingPonds) {
        if (p.active && Math.hypot(p.x - worldX, p.y - worldY) < 150) { // slightly larger hit area
          nearestPondId = p.id;
          break;
        }
      }

      if (fishingState.status === 'idle' && nearestPondId) {
        setFishingState({ active: true, pondId: nearestPondId, bobberX: worldX, bobberY: worldY, status: 'waiting' });
      } else if (fishingState.status === 'bite') {
        const emoji = FISH_EMOJIS[Math.floor(Math.random() * FISH_EMOJIS.length)];
        setStamps(prev => [...prev, { id: Math.random().toString(36).slice(2), x: fishingState.bobberX, y: fishingState.bobberY, emoji }]);
        setFishingState(prev => ({ ...prev, status: 'caught' }));
        showToast('钓到了一条鱼！');
        playTreasureFound();

        setTimeout(() => {
          setFishingState({ active: false, pondId: null, bobberX: 0, bobberY: 0, status: 'idle' });
        }, 1500);
      } else if (fishingState.status === 'waiting') {
         setFishingState({ active: false, pondId: null, bobberX: 0, bobberY: 0, status: 'idle' });
      }

    } else if (tool === 'bubble') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      const worldX = (event.clientX - view.x) / view.scale;
      const worldY = (event.clientY - view.y) / view.scale;
      const newBubbleId = Math.random().toString(36).slice(2);
      setBubbles(prev => [...prev, { id: newBubbleId, x: worldX, y: worldY, radius: 10, floating: false, phase: Math.random() * Math.PI * 2 }]);
      setDragging(true);
    } else if (tool === 'blackhole') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      setDragging(true);
      const blackholeId = Math.random().toString(36).slice(2);
      setActiveBlackholes(prev => [...prev, { id: blackholeId, x: event.clientX, y: event.clientY }]);
    } else {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      setDragging(true);
    }
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const currentWorldX = (event.clientX - view.x) / view.scale;
    const currentWorldY = (event.clientY - view.y) / view.scale;
    (window as any).__lastPointerWorldPos = { x: currentWorldX, y: currentWorldY };

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

    if (tool === 'snake' || tool === 'shooter') {
       if (pointerWorldPosRef) {
          pointerWorldPosRef.current = { x: currentWorldX, y: currentWorldY };
       }
    } else if (tool === 'pen' || tool === 'kaleidoscope') {
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
    } else if (tool === 'sonar') {
      if (!drag.current || drag.current.id !== event.pointerId) return;
      if (!drag.current.isDrag && (Math.abs(event.clientX - drag.current.startX) > 3 || Math.abs(event.clientY - drag.current.startY) > 3)) {
        drag.current.isDrag = true;
      }
      drag.current = { ...drag.current, x: event.clientX, y: event.clientY };
    } else if (tool === 'confetti') {
      if (!drag.current || drag.current.id !== event.pointerId) return;
      const dx = event.clientX - drag.current.x;
      const dy = event.clientY - drag.current.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 15) {
        drag.current = { ...drag.current, x: event.clientX, y: event.clientY };
        const worldX = (event.clientX - view.x) / view.scale;
        const worldY = (event.clientY - view.y) / view.scale;
        const newParticles: Particle[] = [];
        for (let i = 0; i < 5; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = 20 + Math.random() * 80;
          newParticles.push({
            id: Math.random().toString(36).slice(2),
            x: worldX,
            y: worldY,
            color: STROKE_COLORS[Math.floor(Math.random() * STROKE_COLORS.length)],
            tx: `${Math.cos(angle) * distance}px`,
            ty: `${Math.sin(angle) * distance}px`,
          });
        }
        setParticles(prev => [...prev.slice(-100), ...newParticles]);
        if (Math.random() < 0.2) playStampPop();

        setTimeout(() => {
           setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
        }, 600);
      }
    } else if (tool === 'magnet') {
      if (!drag.current || drag.current.id !== event.pointerId) return;
      if (!drag.current.isDrag && (Math.abs(event.clientX - drag.current.startX) > 3 || Math.abs(event.clientY - drag.current.startY) > 3)) {
        drag.current.isDrag = true;
      }

      const dx = event.clientX - drag.current.x;
      const dy = event.clientY - drag.current.y;
      drag.current = { ...drag.current, x: event.clientX, y: event.clientY };

      const repelMultiplier = isRepelling ? -1 : 1;
      const forceMultiplier = 0.1 * repelMultiplier;
      const radius = 250; // pixels

      setStamps(prev => prev.map(stamp => {
        const sx = stamp.x * view.scale + view.x;
        const sy = stamp.y * view.scale + view.y;
        const dist = Math.hypot(event.clientX - sx, event.clientY - sy);
        if (dist < radius) {
          const moveDx = (event.clientX - sx) * forceMultiplier;
          const moveDy = (event.clientY - sy) * forceMultiplier;
          return { ...stamp, x: stamp.x + moveDx / view.scale, y: stamp.y + moveDy / view.scale };
        }
        return stamp;
      }));

      setTreasures(prev => prev.map(treasure => {
        if (!treasure.discovered) return treasure;
        const tx = treasure.x * view.scale + view.x;
        const ty = treasure.y * view.scale + view.y;
        const dist = Math.hypot(event.clientX - tx, event.clientY - ty);
        if (dist < radius) {
          const moveDx = (event.clientX - tx) * forceMultiplier;
          const moveDy = (event.clientY - ty) * forceMultiplier;
          return { ...treasure, x: treasure.x + moveDx / view.scale, y: treasure.y + moveDy / view.scale };
        }
        return treasure;
      }));

      setStrokes(prev => prev.map(stroke => {
        // Find if stroke is within radius
        let inRadius = false;
        let strokeCenterX = 0;
        let strokeCenterY = 0;

        for (const p of stroke.points) {
          const px = p.x * view.scale + view.x;
          const py = p.y * view.scale + view.y;
          if (Math.hypot(event.clientX - px, event.clientY - py) < radius) {
            inRadius = true;
            strokeCenterX = px;
            strokeCenterY = py;
            break;
          }
        }

        if (inRadius) {
          const moveDx = (event.clientX - strokeCenterX) * forceMultiplier / view.scale;
          const moveDy = (event.clientY - strokeCenterY) * forceMultiplier / view.scale;
          return { ...stroke, points: stroke.points.map(p => ({ x: p.x + moveDx, y: p.y + moveDy })) };
        }
        return stroke;
      }));
    } else if (tool === 'tornado') {
      if (!drag.current || drag.current.id !== event.pointerId) return;
      if (!drag.current.isDrag && (Math.abs(event.clientX - drag.current.startX) > 3 || Math.abs(event.clientY - drag.current.startY) > 3)) {
        drag.current.isDrag = true;
      }

      drag.current = { ...drag.current, x: event.clientX, y: event.clientY };

      // Update tornado position
      setActiveTornadoes(prev => prev.map(t => {
        // Find the tornado created by this drag (assuming 1 for simplicity here, or match by some logic)
        return { ...t, x: event.clientX, y: event.clientY }; // Updates all active tornadoes to this pos, but usually there's only 1 active drag
      }));

    } else if (tool === 'blackhole') {
      if (!drag.current || drag.current.id !== event.pointerId) return;
      if (!drag.current.isDrag && (Math.abs(event.clientX - drag.current.startX) > 3 || Math.abs(event.clientY - drag.current.startY) > 3)) {
        drag.current.isDrag = true;
      }

      drag.current = { ...drag.current, x: event.clientX, y: event.clientY };

      // Update blackhole position
      setActiveBlackholes(prev => prev.map(t => {
        return { ...t, x: event.clientX, y: event.clientY };
      }));

    } else if (tool === 'dig') {
      if (!drag.current || drag.current.id !== event.pointerId) return;
      if (!drag.current.isDrag && (Math.abs(event.clientX - drag.current.startX) > 3 || Math.abs(event.clientY - drag.current.startY) > 3)) {
        drag.current.isDrag = true;
      }
      drag.current = { ...drag.current, x: event.clientX, y: event.clientY };

      const worldX = (event.clientX - view.x) / view.scale;
      const worldY = (event.clientY - view.y) / view.scale;

      let foundFossil = false;
      const uncoveredFossils: Fossil[] = [];

      setFossils(prev => {
        let changed = false;
        const next = prev.map(f => {
          if (f.hp <= 0) return f;
          const dist = Math.hypot(f.x - worldX, f.y - worldY);
          if (dist < 60) {
            changed = true;
            foundFossil = true;
            const damage = 5 + Math.random() * 5;
            const newHp = Math.max(0, f.hp - damage);
            if (newHp === 0) {
              uncoveredFossils.push({ ...f, hp: newHp });
            }
            return { ...f, hp: newHp };
          }
          return f;
        });

        return changed ? next.filter(f => f.hp > 0) : prev;
      });

      if (uncoveredFossils.length > 0) {
        setStamps(s => {
          const newStamps = uncoveredFossils.map(f => ({ id: Math.random().toString(36).slice(2), x: f.x, y: f.y, emoji: f.emoji }));
          return [...s, ...newStamps];
        });
        playTreasureFound();
      }

      // Check dirt particles based on local variable mutated inside functional update
      // Better to use state tracking or derive it outside. For this, since React updater might not run synchronously:
      // We do a manual check against fossils state.
      const isDiggingFossil = fossils.some(f => Math.hypot(f.x - worldX, f.y - worldY) < 60 && f.hp > 0);

      if (isDiggingFossil && Math.random() < 0.3) {
        // Spawn dirt particle
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 40;
        const particleId = Math.random().toString(36).slice(2);
        setParticles(prev => [...prev.slice(-100), {
          id: particleId,
          x: worldX,
          y: worldY,
          color: '#8b4513', // dirt color
          tx: `${Math.cos(angle) * distance}px`,
          ty: `${Math.sin(angle) * distance}px`,
        }]);
        setTimeout(() => {
          setParticles(prev => prev.filter(p => p.id !== particleId));
        }, 600);
      }

    } else if (tool === 'ninja') {
      if (!drag.current || drag.current.id !== event.pointerId) return;
      if (!drag.current.isDrag && (Math.abs(event.clientX - drag.current.startX) > 3 || Math.abs(event.clientY - drag.current.startY) > 3)) {
        drag.current.isDrag = true;
      }
      drag.current = { ...drag.current, x: event.clientX, y: event.clientY };
    } else if (tool === 'laser') {
      if (!drag.current || drag.current.id !== event.pointerId) return;
      if (!drag.current.isDrag && (Math.abs(event.clientX - drag.current.startX) > 3 || Math.abs(event.clientY - drag.current.startY) > 3)) {
        drag.current.isDrag = true;
      }
      drag.current = { ...drag.current, x: event.clientX, y: event.clientY };
      const worldX = (event.clientX - view.x) / view.scale;
      const worldY = (event.clientY - view.y) / view.scale;
      setLaserAiming(prev => prev ? { ...prev, currentX: worldX, currentY: worldY } : null);
    } else if (tool === 'bubble') {
      if (!drag.current || drag.current.id !== event.pointerId) return;

      const dx = event.clientX - drag.current.x;
      const dy = event.clientY - drag.current.y;
      const dist = Math.hypot(dx, dy);

      if (!drag.current.isDrag && (Math.abs(event.clientX - drag.current.startX) > 3 || Math.abs(event.clientY - drag.current.startY) > 3)) {
        drag.current.isDrag = true;
      }
      drag.current = { ...drag.current, x: event.clientX, y: event.clientY };

      if (drag.current.isDrag && dist > 0) {
        setBubbles(prev => prev.map(b => {
          if (!b.floating) {
             return { ...b, radius: Math.min(200, b.radius + dist / view.scale) };
          }
          return b;
        }));
      }
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
    } else if (tool === 'kaleidoscope') {
      if (currentStroke && currentStroke.points.length > 0) {
        const N = 8;
        const center = currentStroke.points[0];
        const newStrokes: Stroke[] = [];
        for (let i = 0; i < N; i++) {
          const angle = (i * 2 * Math.PI) / N;
          const color = STROKE_COLORS[(STROKE_COLORS.indexOf(currentStroke.color) + i) % STROKE_COLORS.length];
          const rotatedPoints = currentStroke.points.map(p => {
            const dx = p.x - center.x;
            const dy = p.y - center.y;
            return {
              x: center.x + dx * Math.cos(angle) - dy * Math.sin(angle),
              y: center.y + dx * Math.sin(angle) + dy * Math.cos(angle)
            };
          });
          newStrokes.push({ id: Math.random().toString(36).slice(2), points: rotatedPoints, color });
        }
        setStrokes(prev => [...prev, ...newStrokes]);
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
    } else if (tool === 'sonar' && drag.current?.id === event.pointerId) {
      if (!drag.current.isDrag) {
        const worldX = (event.clientX - view.x) / view.scale;
        const worldY = (event.clientY - view.y) / view.scale;
        const pingId = Math.random().toString(36).slice(2);

        setSonarPings(prev => [...prev, { id: pingId, x: worldX, y: worldY }]);
        playMagicSparkle();

        const speed = 2000; // pixels per second (matches CSS animation scale)
        const maxDist = 4000;
        const newHighlights: SonarHighlight[] = [];

        let foundCount = 0;

        treasures.forEach(t => {
          if (!t.discovered) {
            const dist = Math.hypot(t.x - worldX, t.y - worldY);
            if (dist < maxDist) {
              foundCount++;
              newHighlights.push({
                id: Math.random().toString(36).slice(2),
                x: t.x, y: t.y, type: 'treasure',
                delay: dist / speed,
                emoji: t.emoji
              });
            }
          }
        });

        stamps.forEach(s => {
          const dist = Math.hypot(s.x - worldX, s.y - worldY);
          if (dist < maxDist) {
            newHighlights.push({
              id: Math.random().toString(36).slice(2),
              x: s.x, y: s.y, type: 'stamp',
              delay: dist / speed,
              emoji: s.emoji
            });
          }
        });

        fossils.forEach(f => {
          if (f.hp > 0) {
            const dist = Math.hypot(f.x - worldX, f.y - worldY);
            if (dist < maxDist) {
              foundCount++;
              newHighlights.push({
                id: Math.random().toString(36).slice(2),
                x: f.x, y: f.y, type: 'fossil',
                delay: dist / speed,
                emoji: f.emoji
              });
            }
          }
        });

        if (newHighlights.length > 0) {
          setSonarHighlights(prev => [...prev, ...newHighlights]);
        }

        if (foundCount > 0) {
          showToast(`声纳探测到 ${foundCount} 个隐藏宝藏！`);
        } else {
          showToast(`未探测到附近有宝藏`);
        }

        // Cleanup after animation completes (max radius 8000px at 2000px/s + 1s buffer = 5s)
        setTimeout(() => {
          setSonarPings(prev => prev.filter(p => p.id !== pingId));
          setSonarHighlights(prev => prev.filter(h => !newHighlights.find(nh => nh.id === h.id)));
        }, 5000);
      }
      drag.current = null;
      setDragging(false);
    } else if (tool === 'tornado') {
      setActiveTornadoes([]);
      drag.current = null;
      setDragging(false);
    } else if (tool === 'blackhole') {
      setActiveBlackholes([]);
      drag.current = null;
      setDragging(false);
    } else if (tool === 'magnet') {
      drag.current = null;
      setDragging(false);
    } else if (tool === 'ninja') {
      drag.current = null;
      setDragging(false);
    } else if (tool === 'snake' || tool === 'shooter') {
      drag.current = null;
      setDragging(false);
    } else if (tool === 'dig') {
      drag.current = null;
      setDragging(false);
    } else if (tool === 'confetti') {
      drag.current = null;
      setDragging(false);
    } else if (tool === 'laser') {
      if (laserAiming) {
        const dx = laserAiming.startX - laserAiming.currentX;
        const dy = laserAiming.startY - laserAiming.currentY;
        const dist = Math.hypot(dx, dy);

        if (dist > 5) {
          const dirX = dx / dist;
          const dirY = dy / dist;
          const { paths, sparks } = calculateLaserPath(laserAiming.startX, laserAiming.startY, dirX, dirY);

          const laserId = Math.random().toString(36).slice(2);
          setActiveLasers(prev => [...prev, { id: laserId, paths, sparks }]);
          playMagicSparkle(); // Reuse sound

          setTimeout(() => {
            setActiveLasers(prev => prev.filter(l => l.id !== laserId));
          }, 800);
        }
      }
      drag.current = null;
      setDragging(false);
      setLaserAiming(null);
    } else if (tool === 'bubble') {
      setBubbles(prev => prev.map(b => {
        if (!b.floating) return { ...b, floating: true };
        return b;
      }));
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

  // Bubble physics logic (animation loop)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const updateBubbles = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (dt > 0.1) {
        animationFrameId = requestAnimationFrame(updateBubbles);
        return; // skip large jumps
      }

      const currentBubbles = bubblesRef.current;
      if (currentBubbles.length === 0) {
         animationFrameId = requestAnimationFrame(updateBubbles);
         return;
      }

      let bubblesChanged = false;
      let stampsChanged = false;
      const poppedBubbleIds = new Set<string>();
      const releasedEmojis: {id: string, x: number, y: number, emoji: string}[] = [];
      let currentStamps = [...stampsRef.current];

      const nextBubbles = currentBubbles.map(bubble => {
         if (!bubble.floating) return bubble;
         bubblesChanged = true;

         const newPhase = bubble.phase + dt * 2;
         const moveY = -100 * dt;
         const moveX = Math.sin(newPhase) * 50 * dt;
         const newX = bubble.x + moveX;
         const newY = bubble.y + moveY;
         const newRadius = bubble.radius - dt * 2;

         if (newRadius < 10) {
            poppedBubbleIds.add(bubble.id);
            if (bubble.capturedEmoji) {
               releasedEmojis.push({ id: bubble.capturedEmoji.id, x: newX, y: newY, emoji: bubble.capturedEmoji.emoji });
            }
            return { ...bubble, radius: newRadius };
         }

         let nextBubble = { ...bubble, x: newX, y: newY, phase: newPhase, radius: newRadius };

         if (!nextBubble.capturedEmoji) {
            let stampCaptured = false;
            let stampToCapture: {id: string, emoji: string} | null = null;

            const remainingStamps = currentStamps.filter(s => {
               if (stampCaptured) return true;
               const dist = Math.hypot(s.x - newX, s.y - newY);
               if (dist < nextBubble.radius) {
                  stampCaptured = true;
                  stampToCapture = { id: s.id, emoji: s.emoji };
                  stampsChanged = true;
                  return false;
               }
               return true;
            });

            if (stampToCapture) {
               nextBubble.capturedEmoji = stampToCapture;
               currentStamps = remainingStamps;
            }
         }

         let hitStroke = false;
         for (const stroke of strokesRef.current) {
            for (const p of stroke.points) {
               if (Math.hypot(p.x - newX, p.y - newY) < nextBubble.radius) {
                  hitStroke = true;
                  break;
               }
            }
            if (hitStroke) break;
         }

         if (hitStroke) {
            poppedBubbleIds.add(nextBubble.id);
            if (nextBubble.capturedEmoji) {
               releasedEmojis.push({ id: nextBubble.capturedEmoji.id, x: newX, y: newY, emoji: nextBubble.capturedEmoji.emoji });
            }
         }

         return nextBubble;
      });

      if (poppedBubbleIds.size > 0) {
         poppedBubbleIds.forEach(id => {
            const b = currentBubbles.find(bb => bb.id === id);
            if (b) {
               popStamp(b.x, b.y, id);
            }
         });

         if (releasedEmojis.length > 0) {
            currentStamps = [...currentStamps, ...releasedEmojis];
            stampsChanged = true;
         }
      }

      if (bubblesChanged || poppedBubbleIds.size > 0) {
         setBubbles(nextBubbles.filter(b => !poppedBubbleIds.has(b.id)));
      }

      if (stampsChanged) {
         setStamps(currentStamps);
      }

      animationFrameId = requestAnimationFrame(updateBubbles);
    };

    animationFrameId = requestAnimationFrame(updateBubbles);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Blackhole effect logic (animation loop)
  useEffect(() => {
    if (activeBlackholes.length === 0) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const updateBlackhole = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (dt > 0.1) {
        animationFrameId = requestAnimationFrame(updateBlackhole);
        return;
      }

      const blackholeRadius = 500;
      const pullForce = 800; // Strong inward pull

      const processEntities = (entities: any[], setEntities: React.Dispatch<React.SetStateAction<any[]>>, isTreasure = false) => {
        let changed = false;
        let consumedIds = new Set<string>();

        const newEntities = entities.map(entity => {
          if (isTreasure && entity.discovered) return entity;

          let entityX = entity.x;
          let entityY = entity.y;

          for (const bh of activeBlackholes) {
             const bx = bh.x;
             const by = bh.y;
             const exScreen = entityX * view.scale + view.x;
             const eyScreen = entityY * view.scale + view.y;

             const dx = bx - exScreen;
             const dy = by - eyScreen;
             const dist = Math.hypot(dx, dy);

             if (dist > 0 && dist < blackholeRadius) {
               changed = true;

               if (dist < 20) {
                 consumedIds.add(entity.id);
               } else {
                 const pull = pullForce * dt;
                 const ratio = Math.min(1, pull / dist);

                 const newExScreen = exScreen + dx * ratio;
                 const newEyScreen = eyScreen + dy * ratio;

                 entityX = (newExScreen - view.x) / view.scale;
                 entityY = (newEyScreen - view.y) / view.scale;
               }
             }
          }

          if (entityX !== entity.x || entityY !== entity.y) {
             return { ...entity, x: entityX, y: entityY };
          }
          return entity;
        });

        if (changed) {
          const filtered = newEntities.filter((e: any) => !consumedIds.has(e.id));
          setEntities(filtered as any);
        }
      };

      setStamps(prevStamps => {
          let currentStamps = prevStamps;
          processEntities(currentStamps, (n) => currentStamps = n as any);
          return currentStamps;
      });

      setTreasures(prevTreasures => {
          let currentTreasures = prevTreasures;
          processEntities(currentTreasures, (n) => currentTreasures = n as any, true);
          return currentTreasures;
      });

      setBubbles(prevBubbles => {
          let currentBubbles = prevBubbles;
          processEntities(currentBubbles, (n) => currentBubbles = n as any);
          return currentBubbles;
      });

      animationFrameId = requestAnimationFrame(updateBlackhole);
    };

    animationFrameId = requestAnimationFrame(updateBlackhole);

    return () => cancelAnimationFrame(animationFrameId);
  }, [activeBlackholes, view]);

  // Tornado effect logic (animation loop)
  useEffect(() => {
    if (activeTornadoes.length === 0) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const updateTornado = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (dt > 0.1) {
        animationFrameId = requestAnimationFrame(updateTornado);
        return; // skip large jumps
      }

      const tornadoRadius = 400; // Radius of effect
      const pullForce = 150; // pixels per second
      const spinSpeed = 3; // radians per second

      const processEntities = (entities: any[], setEntities: React.Dispatch<React.SetStateAction<any[]>>, isTreasure = false) => {
        let changed = false;
        const newEntities = entities.map(entity => {
          if (isTreasure && entity.discovered) return entity;

          let entityX = entity.x;
          let entityY = entity.y;

          for (const tornado of activeTornadoes) {
             const tx = tornado.x;
             const ty = tornado.y;
             const exScreen = entityX * view.scale + view.x;
             const eyScreen = entityY * view.scale + view.y;

             const dx = exScreen - tx;
             const dy = eyScreen - ty;
             const dist = Math.hypot(dx, dy);

             if (dist > 0 && dist < tornadoRadius) {
               changed = true;

               // Calculate new position
               let angle = Math.atan2(dy, dx);
               let radius = dist;

               // Pull inward (inverse square ish or linear)
               const pull = (1 - dist / tornadoRadius) * pullForce * dt;
               radius = Math.max(10, radius - pull);

               // Spin (faster when closer)
               const spin = (1 - dist / tornadoRadius + 0.2) * spinSpeed * dt;
               angle += spin;

               // Back to screen coordinates
               const newExScreen = tx + Math.cos(angle) * radius;
               const newEyScreen = ty + Math.sin(angle) * radius;

               // Convert to world coordinates
               entityX = (newExScreen - view.x) / view.scale;
               entityY = (newEyScreen - view.y) / view.scale;
             }
          }

          if (entityX !== entity.x || entityY !== entity.y) {
             return { ...entity, x: entityX, y: entityY };
          }
          return entity;
        });

        if (changed) {
          setEntities(newEntities as any);
        }
      };

      setStamps(prevStamps => {
          let currentStamps = prevStamps;
          processEntities(currentStamps, (n) => currentStamps = n as any);
          return currentStamps;
      });

      setTreasures(prevTreasures => {
          let currentTreasures = prevTreasures;
          processEntities(currentTreasures, (n) => currentTreasures = n as any, true);
          return currentTreasures;
      });

      animationFrameId = requestAnimationFrame(updateTornado);
    };

    animationFrameId = requestAnimationFrame(updateTornado);

    return () => cancelAnimationFrame(animationFrameId);
  }, [activeTornadoes, view]);

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
    <div className="canvas-visual-feedback">
      {visualRings.map(ring => (
        <div key={ring.id} className="visual-sound-wave" style={{ '--wave-color': ring.color } as React.CSSProperties} aria-hidden="true" />
      ))}
      {soundCaptions.map(caption => (
        <div key={caption.id}
             className={`sound-caption ${caption.isOffscreen ? 'is-offscreen' : ''}`}
             style={{
               left: `${caption.x}%`,
               top: `${caption.y}%`,
               color: caption.color,
               textShadow: `0 2px 4px rgba(0,0,0,0.5), 0 0 10px ${caption.color}`,
               '--angle': caption.angle ? `${caption.angle}rad` : '0rad'
             } as React.CSSProperties}
             onClick={() => {
                if (caption.worldX !== undefined && caption.worldY !== undefined) {
                    playBounce(1500, caption.color, caption.worldX, caption.worldY);
                }
             }}
             role="button"
             tabIndex={0}
             aria-label={`重播声音 ${caption.text}`}
        >
          {caption.isOffscreen && <span className="offscreen-arrow">➤</span>}
          <span className="caption-text">{caption.text}</span>
        </div>
      ))}
    </div>

    <div className={`canvas-edge-glow ${isVeryClose ? 'very-close' : isClose ? 'close' : ''}`} aria-hidden="true" />
    {isScanning && (
      <div className="lens-overlay" style={{ '--mouse-x': scanPos.x, '--mouse-y': scanPos.y } as React.CSSProperties} aria-hidden="true" />
    )}
    {tool === 'tornado' && dragging && drag.current && activeTornadoes.map(t => (
      <div
        key={t.id}
        className="tornado-field"
        style={{ left: t.x, top: t.y }}
        aria-hidden="true"
      >
        <div className="tornado-swirl" />
        <div className="tornado-swirl reverse" />
      </div>
    ))}
    {tool === 'blackhole' && dragging && drag.current && activeBlackholes.map(t => (
      <div
        key={t.id}
        className="blackhole-field"
        style={{ left: t.x, top: t.y }}
        aria-hidden="true"
      >
        <div className="blackhole-core" />
      </div>
    ))}
    {tool === 'magnet' && drag.current && dragging && (
      <div
        className={`magnet-field ${isRepelling ? 'repel' : ''}`}
        style={{ left: drag.current.x, top: drag.current.y }}
        aria-hidden="true"
      />
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
          {currentStroke && tool !== 'kaleidoscope' && (
            <polyline points={currentStroke.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={currentStroke.color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {currentStroke && tool === 'kaleidoscope' && (
            Array.from({ length: 8 }).map((_, i) => {
              const color = STROKE_COLORS[(STROKE_COLORS.indexOf(currentStroke.color) + i) % STROKE_COLORS.length];
              return (
                <polyline
                  key={i}
                  points={currentStroke.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={color}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  transform={`rotate(${i * 45} ${currentStroke.points[0].x} ${currentStroke.points[0].y})`}
                />
              );
            })
          )}
          {activeLasers.map(laser => (
             <g key={laser.id}>
                {laser.paths.map((path, i) => {
                    const dist = Math.hypot(path.x2 - path.x1, path.y2 - path.y1);
                    return (
                        <g key={i}>
                            <line className="laser-beam" x1={path.x1} y1={path.y1} x2={path.x2} y2={path.y2} style={{'--len': dist} as React.CSSProperties} />
                            <line className="laser-beam-core" x1={path.x1} y1={path.y1} x2={path.x2} y2={path.y2} style={{'--len': dist} as React.CSSProperties} />
                        </g>
                    )
                })}
             </g>
          ))}
          {tool === 'laser' && laserAiming && (
             <line className="laser-aiming-line" x1={laserAiming.startX} y1={laserAiming.startY} x2={laserAiming.startX - (laserAiming.currentX - laserAiming.startX)} y2={laserAiming.startY - (laserAiming.currentY - laserAiming.startY)} />
          )}
        </svg>
        {activeLasers.map(laser => (
           laser.sparks.map((spark, i) => (
               <div key={`${laser.id}-${i}`} className="laser-spark" style={{ left: spark.x, top: spark.y }} aria-hidden="true">
                   <Zap size={24} />
               </div>
           ))
        ))}

        {fishingPonds.map(p => p.active && (
          <div key={p.id} className="fishing-pond" style={{ left: p.x, top: p.y }} aria-hidden="true">
            <div className="pond-water" />
          </div>
        ))}
        {fishingState.active && fishingState.pondId && (
          <div className={`bobber ${fishingState.status}`} style={{ left: fishingState.bobberX, top: fishingState.bobberY }} aria-hidden="true" />
        )}

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
        {fossils.map(f => f.hp > 0 ? (
          <div key={f.id} className="hidden-fossil" style={{
            left: f.x, top: f.y,
            opacity: Math.max(0, 1 - f.hp / f.maxHP) * 0.8
          }} aria-hidden="true">
            {f.emoji}
          </div>
        ) : null)}
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
        {sonarPings.map(ping => (
          <div key={ping.id} className="sonar-ring" style={{ left: ping.x, top: ping.y }} aria-hidden="true" />
        ))}
        {sonarHighlights.map(h => (
          <div key={h.id} className={`sonar-highlight ${h.type}`} style={{ left: h.x, top: h.y, '--delay': `${h.delay}s` } as React.CSSProperties} aria-hidden="true">
            {h.emoji}
          </div>
        ))}
        {bubbles.map(b => (
          <div key={b.id} className="bubble" style={{
            left: b.x, top: b.y,
            width: b.radius * 2, height: b.radius * 2,
            marginLeft: -b.radius, marginTop: -b.radius
          }} onClick={(e) => {
             e.stopPropagation();
             popStamp(b.x, b.y, b.id);
             if (b.capturedEmoji) {
                setStamps(prev => [...prev, { id: b.capturedEmoji!.id, x: b.x, y: b.y, emoji: b.capturedEmoji!.emoji }]);
             }
             setBubbles(prev => prev.filter(bb => bb.id !== b.id));
          }}>
             <div className="bubble-highlight" />
             {b.capturedEmoji && <div className="bubble-content">{b.capturedEmoji.emoji}</div>}
          </div>
        ))}
        <WildlifeTracker view={view} onDiscover={handleAnimalDiscover} />
        {ballActive && <BouncyBall strokes={strokes} view={view} stamps={stamps} onStampHit={(id, x, y) => popStamp(x, y, id)} />}
        {musicBoxActive && <MusicBox strokes={strokes} view={view} stamps={stamps} />}
        {tool === 'golf' && <MiniGolf strokes={strokes} view={view} shootSequence={shootSequence} shootVector={shootVector} />}
      </div>
      {tool === 'ninja' && <FruitNinja view={view} dragRef={drag} />}
      {tool === 'snake' && <CanvasSnake strokes={strokes} view={view} pointerWorldPosRef={pointerWorldPosRef} />}
      {tool === 'shooter' && <SpaceShooter view={view} pointerWorldPosRef={pointerWorldPosRef} />}

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
      <Button variant={tool === 'bubble' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="吹泡泡" onClick={() => { setTool('bubble'); showToast('已切换至: 吹泡泡'); }}><Droplet /></Button>
      <Button variant={tool === 'blackhole' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="黑洞" onClick={() => { setTool('blackhole'); showToast('已切换至: 黑洞'); }}><CircleDotDashed /></Button>
      <Button variant={tool === 'scan' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="扫描仪" onClick={() => { setTool('scan'); showToast('已切换至: 扫描仪'); }}><Search /></Button>
      <Button variant={tool === 'sonar' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="声纳探测" onClick={() => { setTool('sonar'); showToast('已切换至: 声纳探测'); }}><Radar /></Button>
      <Button variant={tool === 'stamp-brush' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="印章刷" onClick={() => { setTool('stamp-brush'); showToast('已切换至: 印章刷'); }}><Smile /></Button>
      <Button variant={tool === 'golf' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="高尔夫" onClick={() => { setTool('golf'); showToast('已切换至: 高尔夫'); }}><Flag /></Button>
      <Button variant={tool === 'magnet' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="磁铁" onClick={() => { setTool('magnet'); showToast('已切换至: 磁铁'); }}><Magnet /></Button>
      <Button variant={tool === 'ninja' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="切水果" onClick={() => { setTool('ninja'); showToast('已切换至: 切水果'); }}><Swords /></Button>
      <Button variant={tool === 'snake' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="贪吃蛇" onClick={() => { setTool('snake'); showToast('已切换至: 贪吃蛇'); }}><Gamepad2 /></Button>
      <Button variant={tool === 'confetti' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="派对纸屑" onClick={() => { setTool('confetti'); showToast('已切换至: 派对纸屑'); }}><PartyPopper /></Button>
      <Button variant={tool === 'kaleidoscope' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="万花筒" onClick={() => { setTool('kaleidoscope'); showToast('已切换至: 万花筒'); }}><Snowflake /></Button>
      <Button variant={tool === 'tornado' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="龙卷风" onClick={() => { setTool('tornado'); showToast('已切换至: 龙卷风'); }}><Tornado /></Button>
      <Button variant={tool === 'dig' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="挖掘" onClick={() => { setTool('dig'); showToast('已切换至: 挖掘'); }}><Pickaxe /></Button>
      <Button variant={tool === 'laser' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="激光" onClick={() => { setTool('laser'); showToast('已切换至: 激光'); }}><Zap /></Button>
      <Button variant={tool === 'shooter' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="星际保卫战" onClick={() => { setTool('shooter'); showToast('已切换至: 星际保卫战'); }}><Rocket /></Button>
      <Button variant={tool === 'fish' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="钓鱼" onClick={() => { setTool('fish'); showToast('已切换至: 钓鱼'); }}><Fish /></Button>
      {(stamps.length > 0 || strokes.length > 0) && (
        <Button variant="ghost" size="icon-sm" aria-label="清除内容" onClick={() => { setStamps([]); setStrokes([]); showToast('已清空画板内容'); }}><Eraser /></Button>
      )}
      <Button variant="ghost" size="icon-sm" aria-label="缩小画板" onClick={() => zoom(1 / 1.2, innerWidth / 2, innerHeight / 2)}><Minus /></Button>
      <span className="canvas-scale" aria-live="polite">{Math.round(view.scale * 100)}%</span>
      <Button variant="ghost" size="icon-sm" aria-label="放大画板" onClick={() => zoom(1.2, innerWidth / 2, innerHeight / 2)}><Plus /></Button>
      <Button variant="ghost" size="icon-sm" aria-label="重置画板视图" onClick={() => { setView(initial); showToast('视图已重置'); }}><LocateFixed /></Button>
    </div>
    <p className="canvas-hint">拖动或方向键移动 · Ctrl+滚轮或+/-缩放 · 0 重置 · 快捷键 V / P(B) / M / S / R / E / G / A / K / T</p>
    {OnekoComponent && <OnekoComponent />}
    <ParrotApp />

  </main>;
}

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus, LocateFixed, Eraser, Navigation, Sparkles, Pen, Hand, Wand2, Search, Smile, Flag, Music, Radar, Magnet, Swords, PartyPopper, Snowflake, Gamepad2, Tornado, Pickaxe, Zap, Rocket, Droplet, CircleDotDashed, Fish, Leaf, Captions, ChevronsUp, Star, Map, Send, Hammer, Dices, Flashlight, SprayCan, CarFront, Target } from 'lucide-react';
import Oneko from 'react-cursor-cat';
import { ParrotApp } from '@/components/ParrotApp';
import { BouncyBall } from '@/components/BouncyBall';
import { MiniGolf } from '@/components/MiniGolf';
import { MusicBox } from '@/components/MusicBox';
import { FruitNinja } from '@/components/FruitNinja';
import { CanvasSnake } from '@/components/CanvasSnake';
import { SpaceShooter } from '@/components/SpaceShooter';
import { WildlifeTracker } from '@/components/WildlifeTracker';
import { StrokeJumper } from '@/components/StrokeJumper';
import { Fireworks } from '@/components/Fireworks';
import { WhackAMole } from '@/components/WhackAMole';
import { DiceRoller } from '@/components/DiceRoller';
import { RCCar } from '@/components/RCCar';
import { playStampPlace, playStampPop, playTreasureFound, playMagicSparkle, playBounce } from '@/lib/sound';

type View = { x: number; y: number; scale: number };
const initial: View = { x: 0, y: 0, scale: 1 };
const clamp = (n: number) => Math.max(.35, Math.min(2.5, n));

const EMOJIS = ['❤️', '⭐', '✨', '🔥', '🎉', '💡', '🌈', '🍕', '🚀', '🌺', '🍀', '🐾', '🦋', '💧', '🌱', '🧊', '🎈', '💣', '☁️', '🌽', '🥚', '🛸', '🐌', '🐝', '🕊️', '🦇'];
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
type Ghost = { id: string; x: number; y: number; emoji: string; caught: boolean };
type Point = { x: number; y: number };
type Stroke = { id: string; points: Point[]; color: string; type?: 'vine' | 'spray' };
type Particle = { id: string; x: number; y: number; color: string; tx: string; ty: string };
type MagicParticle = { id: string; x: number; y: number; color: string; size: number };
type VisualRing = { id: string; color: string };
type Bubble = { id: string; x: number; y: number; radius: number; capturedEmoji?: {id: string, emoji: string}; floating: boolean; phase: number };
type SoundCaption = { id: string; color: string; text: string; x: number; y: number; isOffscreen?: boolean; angle?: number; worldX?: number; worldY?: number };
type SonarPing = { id: string; x: number; y: number };
type SonarHighlight = { id: string; x: number; y: number; type: 'treasure' | 'stamp' | 'fossil'; delay: number; emoji: string };
type FishingPond = { id: string; x: number; y: number; active: boolean };
type PaperPlane = { id: string; x: number; y: number; vx: number; vy: number; life: number; angle: number };

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

const GHOST_EMOJIS = ['👻', '👽', '👾', '🦇', '🦉', '🕸️', '🕷️'];

function generateGhosts(): Ghost[] {
  const ghosts: Ghost[] = [];
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const radius = 1000 + Math.random() * 7000;
    ghosts.push({
      id: `ghost-${i}`,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      emoji: GHOST_EMOJIS[Math.floor(Math.random() * GHOST_EMOJIS.length)],
      caught: false
    });
  }
  return ghosts;
}

// Application features belong inside this workspace; the control shell is separate.
export function Canvas() {

  function renderSprayCanDots(stroke: Stroke) {
    if (stroke.type !== 'spray') return null;
    const dots = [];
    for (let i = 0; i < stroke.points.length; i++) {
      const p = stroke.points[i];
      // Seed based on point coordinates to make the scattering consistent
      const seed = Math.abs(Math.sin(p.x * 12.9898 + p.y * 78.233)) * 10000;
      const rand = (n: number) => {
        const x = Math.sin(seed + n) * 10000;
        return x - Math.floor(x);
      };

      const numDots = 6;
      for (let j = 0; j < numDots; j++) {
        const angle = rand(j * 2) * Math.PI * 2;
        const radius = rand(j * 2 + 1) * 20; // 20px scatter radius
        const dotSize = 1 + rand(j * 3) * 3; // 1 to 4px size
        dots.push(
          <circle
            key={`${stroke.id}-${i}-${j}`}
            cx={p.x + Math.cos(angle) * radius}
            cy={p.y + Math.sin(angle) * radius}
            r={dotSize}
            fill={stroke.color}
            opacity={0.6 + rand(j * 4) * 0.4}
          />
        );
      }
    }
    return dots;
  }

  function renderVineLeaves(stroke: Stroke) {
    if (stroke.type !== 'vine') return null;
    let accumulatedDist = 0;
    const leaves = [];
    for (let i = 1; i < stroke.points.length; i++) {
      const p1 = stroke.points[i - 1];
      const p2 = stroke.points[i];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      accumulatedDist += dist;
      if (accumulatedDist >= 40) {
        // Calculate angle to align leaf with stroke direction
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
        leaves.push(<text key={`${stroke.id}-${i}`} x={p2.x} y={p2.y} fontSize="24" style={{ transform: `translate(-12px, 8px) rotate(${angle}deg)`, transformOrigin: `${p2.x}px ${p2.y}px` }}>🍃</text>);
        accumulatedDist = 0;
      }
    }
    return <g key={`${stroke.id}-leaves`}>{leaves}</g>;
  }

  const [view, setView] = useState(initial);
  const [stamps, setStamps] = useState<{ id: string; x: number; y: number; emoji: string; vx?: number; vy?: number }[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [ripples, setRipples] = useState<{ id: string; x: number; y: number; color?: string }[]>([]);
  const [fireworkTargets, setFireworkTargets] = useState<{id: string, x: number, y: number, color: string}[]>([]);
  const [tool, setTool] = useState<'pan' | 'pen' | 'magic' | 'scan' | 'stamp-brush' | 'golf' | 'sonar' | 'magnet' | 'ninja' | 'confetti' | 'kaleidoscope' | 'snake' | 'tornado' | 'dig' | 'laser' | 'shooter' | 'bubble' | 'blackhole' | 'fish' | 'vine' | 'jumper' | 'firework' | 'map' | 'plane' | 'whack' | 'dice' | 'flashlight' | 'spray' | 'drive' | 'slingshot'>('pan');
  const [diceTargets, setDiceTargets] = useState<{id: string, x: number, y: number}[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [treasures, setTreasures] = useState<Treasure[]>(generateTreasures);
  const [fossils, setFossils] = useState<Fossil[]>(generateFossils);
  const [ghosts, setGhosts] = useState<Ghost[]>(generateGhosts);
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
  const [flashlightPos, setFlashlightPos] = useState({ x: 0, y: 0 });
  const [activeLasers, setActiveLasers] = useState<{ id: string; paths: {x1: number, y1: number, x2: number, y2: number}[]; sparks: {x: number, y: number}[] }[]>([]);
  const [laserAiming, setLaserAiming] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);

  const [shootSequence, setShootSequence] = useState(0);
  const [shootVector, setShootVector] = useState({ x: 0, y: 0 });

  const [activePlanes, setActivePlanes] = useState<PaperPlane[]>([]);
  const [planeAiming, setPlaneAiming] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);
  const activePlanesRef = useRef<PaperPlane[]>([]);

  const [visualRings, setVisualRings] = useState<VisualRing[]>([]);
  const [soundCaptions, setSoundCaptions] = useState<SoundCaption[]>([]);
  const [showCaptionsLog, setShowCaptionsLog] = useState(false);
  const [captionsLog, setCaptionsLog] = useState<{ id: string; text: string; color: string; x?: number; y?: number; time: number }[]>([]);
  const [focusMode, setFocusMode] = useState(false);
  const [focusedItem, setFocusedItem] = useState<{ id: string; type: 'treasure' | 'stamp'; x: number; y: number } | null>(null);

  const viewRef = useRef<View>(initial);
  const bubblesRef = useRef<Bubble[]>([]);
  const stampsRef = useRef<{ id: string; x: number; y: number; emoji: string; vx?: number; vy?: number }[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const treasuresRef = useRef<Treasure[]>([]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    treasuresRef.current = treasures;
  }, [treasures]);

  useEffect(() => {
    bubblesRef.current = bubbles;
  }, [bubbles]);

  useEffect(() => {
    if (tool !== 'dice') setDiceTargets([]);
  }, [tool]);

  useEffect(() => {
    stampsRef.current = stamps;
  }, [stamps]);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    activePlanesRef.current = activePlanes;
  }, [activePlanes]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-tool-change', { detail: { tool } }));
    }
  }, [tool]);

  useEffect(() => {
    const handleParrotDrop = (e: Event) => {
      const ce = e as CustomEvent<{ emoji: string }>;
      if (ce.detail && ce.detail.emoji) {
        const v = viewRef.current;
        // Parrot is at right: 28px, bottom: 80px (center approx right 100, bottom 150)
        // Responsive approx coordinates:
        const screenX = window.innerWidth - 100;
        const screenY = window.innerHeight - 150;
        const worldX = (screenX - v.x) / v.scale;
        const worldY = (screenY - v.y) / v.scale;

        setStamps(prev => {
          const next = [...prev, { id: Math.random().toString(36).slice(2), x: worldX, y: worldY, emoji: ce.detail.emoji }];
          if (next.length > 200) return next.slice(next.length - 200);
          return next;
        });
        playStampPlace(worldX, worldY);
      }
    };
    window.addEventListener('app-parrot-drop', handleParrotDrop);
    return () => window.removeEventListener('app-parrot-drop', handleParrotDrop);
  }, []);

  const calculateLaserPath = (startX: number, startY: number, dirX: number, dirY: number) => {
    let px = startX;
    let py = startY;
    let dx = dirX;
    let dy = dirY;
    const paths: {x1: number, y1: number, x2: number, y2: number}[] = [];
    const sparks: {x: number, y: number}[] = [];
    const hitStampIds: string[] = [];
    const maxBounces = 20;
    const rayLength = 8000;

    for (let bounce = 0; bounce < maxBounces; bounce++) {
      let closestT = 1;
      let hitNormalX = 0;
      let hitNormalY = 0;
      let hitType = 'none';
      let hitX = px + dx * rayLength;
      let hitY = py + dy * rayLength;
      let closestStampId: string | null = null;

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

            closestStampId = stamp.id;
          }
        }
      }

      paths.push({ x1: px, y1: py, x2: hitX, y2: hitY });

      if (hitType !== 'none') {
        if (hitType === 'stamp' && closestStampId) {
          hitStampIds.push(closestStampId);
        }
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
    return { paths, sparks, hitStampIds };
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
          setCaptionsLog(prev => {
            const next = [{ id, text: customEvent.detail.text!, color: customEvent.detail.color, x: customEvent.detail.x, y: customEvent.detail.y, time: Date.now() }, ...prev];
            return next.slice(0, 20); // Keep max 20 logs
          });

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
  const drag = useRef<{ id: number; x: number; y: number; startX: number; startY: number; isDrag: boolean; targetId?: string } | null>(null);

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

  const focusedItemRef = useRef<{ id: string; type: 'treasure' | 'stamp'; x: number; y: number } | null>(null);
  useEffect(() => {
    focusedItemRef.current = focusedItem;
  }, [focusedItem]);

  const focusModeRef = useRef(false);
  useEffect(() => {
    focusModeRef.current = focusMode;
  }, [focusMode]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      const key = event.key.toLowerCase();

      if (event.key === 'Tab') {
        event.preventDefault(); // Prevent standard tabbing out of the canvas when we want to cycle items
        const currentView = viewRef.current;
        const centerWorldX = (window.innerWidth / 2 - currentView.x) / currentView.scale;
        const centerWorldY = (window.innerHeight / 2 - currentView.y) / currentView.scale;

        const interactables = [
          ...treasuresRef.current.filter(t => !t.discovered).map(t => ({ id: t.id, type: 'treasure' as const, x: t.x, y: t.y })),
          ...stampsRef.current.map(s => ({ id: s.id, type: 'stamp' as const, x: s.x, y: s.y }))
        ];

        if (interactables.length === 0) return;

        if (!focusModeRef.current) {
          setFocusMode(true);
          // Focus the closest item to center
          interactables.sort((a, b) => {
            const distA = Math.hypot(a.x - centerWorldX, a.y - centerWorldY);
            const distB = Math.hypot(b.x - centerWorldX, b.y - centerWorldY);
            return distA - distB;
          });
          const nextItem = interactables[0];
          setFocusedItem(nextItem);
          setView(v => ({
             ...v,
             x: window.innerWidth / 2 - nextItem.x * v.scale,
             y: window.innerHeight / 2 - nextItem.y * v.scale
          }));
          return;
        }

        // Already in focus mode, cycle through items
        let nextIndex = 0;
        const currentFocused = focusedItemRef.current;
        if (currentFocused) {
          const currentIndex = interactables.findIndex(i => i.id === currentFocused.id);
          if (currentIndex !== -1) {
             nextIndex = (currentIndex + (event.shiftKey ? -1 : 1) + interactables.length) % interactables.length;
          }
        }

        const nextItem = interactables[nextIndex];
        setFocusedItem(nextItem);
        setView(v => ({
           ...v,
           x: window.innerWidth / 2 - nextItem.x * v.scale,
           y: window.innerHeight / 2 - nextItem.y * v.scale
        }));
        return;
      }

      if (event.key === 'Enter') {
        if (focusModeRef.current && focusedItemRef.current) {
          event.preventDefault();
          handleItemInteraction(focusedItemRef.current.type, focusedItemRef.current.id);
        }
        return;
      }

      if (event.key === 'Escape') {
        if (focusModeRef.current) {
          event.preventDefault();
          setFocusMode(false);
          setFocusedItem(null);
        }
        return;
      }

      // Exit focus mode if other keys are pressed (like panning)
      if (focusModeRef.current && (key.startsWith('arrow') || ['v','p','b','m','s','e','g','f','r','a','n','c','k','t','d','l','u','h','i','y','q'].includes(key))) {
         setFocusMode(false);
         setFocusedItem(null);
      }

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
      if (key === 'w') { setTool('whack'); showToast('已切换至: 打地鼠'); }
      if (key === 'c') { setTool('confetti'); showToast('已切换至: 派对纸屑'); }
      if (key === 'k') { setTool('kaleidoscope'); showToast('已切换至: 万花筒'); }
      if (key === 't') { setTool('tornado'); showToast('已切换至: 龙卷风'); }
      if (key === 'd') { setTool('dig'); showToast('已切换至: 挖掘'); }
      if (key === 'l') { setTool('laser'); showToast('已切换至: 激光'); }
      if (key === 'x') { setTool('flashlight'); showToast('已切换至: 手电筒'); }
      if (key === 'j') { setTool('spray'); showToast('已切换至: 喷漆'); }
      if (key === 'u') { setTool('bubble'); showToast('已切换至: 吹泡泡'); }
      if (key === 'h') { setTool('blackhole'); showToast('已切换至: 黑洞'); }
      if (key === 'o') { setTool('drive'); showToast('已切换至: 遥控车'); }
      if (key === 'i') { setTool('vine'); showToast('已切换至: 藤蔓'); }
      if (key === 'y') { setTool('map'); showToast('已切换至: 藏宝图'); }
      if (key === 'q') { setTool('plane'); showToast('已切换至: 纸飞机'); }

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

    if (focusModeRef.current) {
       setFocusMode(false);
       setFocusedItem(null);
    }

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
      'vine': 'var(--green-600, #16a34a)',
      'firework': '#facc15',
      'map': 'var(--amber-500, #f59e0b)',
    };

    const rippleId = Math.random().toString(36).slice(2);
    setRipples(prev => [...prev, { id: rippleId, x: event.clientX, y: event.clientY, color: rippleColorMap[tool] }]);

    if (tool === 'firework') {
      const worldX = (event.clientX - view.x) / view.scale;
      const worldY = (event.clientY - view.y) / view.scale;
      setFireworkTargets(prev => [...prev, {
        id: rippleId,
        x: worldX,
        y: worldY,
        color: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)]
      }]);
    }
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== rippleId));
    }, 600);

    if (tool === 'snake' || tool === 'shooter' || tool === 'drive') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: true };
      setDragging(true);
      pointerWorldPosRef.current = { x: (event.clientX - view.x) / view.scale, y: (event.clientY - view.y) / view.scale };
    } else if (tool === 'pen' || tool === 'kaleidoscope') {
      const worldX = (event.clientX - view.x) / view.scale;
      const worldY = (event.clientY - view.y) / view.scale;
      const color = STROKE_COLORS[Math.floor(Math.random() * STROKE_COLORS.length)];
      setCurrentStroke({ id: Math.random().toString(36).slice(2), points: [{ x: worldX, y: worldY }], color });
    } else if (tool === 'vine') {
      const worldX = (event.clientX - view.x) / view.scale;
      const worldY = (event.clientY - view.y) / view.scale;
      setCurrentStroke({ id: Math.random().toString(36).slice(2), points: [{ x: worldX, y: worldY }], color: '#22c55e', type: 'vine' });
    } else if (tool === 'spray') {
      const worldX = (event.clientX - view.x) / view.scale;
      const worldY = (event.clientY - view.y) / view.scale;
      const color = STROKE_COLORS[Math.floor(Math.random() * STROKE_COLORS.length)];
      setCurrentStroke({ id: Math.random().toString(36).slice(2), points: [{ x: worldX, y: worldY }], color, type: 'spray' });
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
    } else if (tool === 'whack') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      setDragging(true);
    } else if (tool === 'dice') {
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

    } else if (tool === 'plane') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      const worldX = (event.clientX - view.x) / view.scale;
      const worldY = (event.clientY - view.y) / view.scale;
      setPlaneAiming({ startX: worldX, startY: worldY, currentX: worldX, currentY: worldY });
      setDragging(true);
    } else if (tool === 'bubble') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      const worldX = (event.clientX - view.x) / view.scale;
      const worldY = (event.clientY - view.y) / view.scale;
      const newBubbleId = Math.random().toString(36).slice(2);
      setBubbles(prev => [...prev, { id: newBubbleId, x: worldX, y: worldY, radius: 10, floating: false, phase: Math.random() * Math.PI * 2 }]);
      setDragging(true);
    } else if (tool === 'map') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };

      const worldX = (event.clientX - view.x) / view.scale;
      const worldY = (event.clientY - view.y) / view.scale;

      setStamps(prev => {
        const next = [...prev, { id: Math.random().toString(36).slice(2), x: worldX, y: worldY, emoji: '📜' }];
        if (next.length > 200) return next.slice(next.length - 200);
        return next;
      });
      playStampPlace();
      setDragging(true);
    } else if (tool === 'blackhole') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      setDragging(true);
      const blackholeId = Math.random().toString(36).slice(2);
      setActiveBlackholes(prev => [...prev, { id: blackholeId, x: event.clientX, y: event.clientY }]);
    } else if (tool === 'slingshot') {
      const worldX = (event.clientX - view.x) / view.scale;
      const worldY = (event.clientY - view.y) / view.scale;
      const currentStamps = stampsRef.current || stamps;
      let closest = null;
      let minD = Infinity;
      for (const stamp of currentStamps) {
        const d = Math.hypot(stamp.x - worldX, stamp.y - worldY);
        if (d < 40 && d < minD) {
          minD = d;
          closest = stamp;
        }
      }
      if (closest) {
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false, targetId: closest.id };
        setDragging(true);
      }
    } else if (tool === 'flashlight') {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, isDrag: false };
      setDragging(true);
      setFlashlightPos({ x: event.clientX, y: event.clientY });
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

    if (tool === 'snake' || tool === 'shooter' || tool === 'drive') {
       if (pointerWorldPosRef) {
          pointerWorldPosRef.current = { x: currentWorldX, y: currentWorldY };
       }
    } else if (tool === 'pen' || tool === 'kaleidoscope' || tool === 'vine' || tool === 'spray') {
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
    } else if (tool === 'whack') {
      if (!drag.current || drag.current.id !== event.pointerId) return;
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
    } else if (tool === 'plane') {
      if (!drag.current || drag.current.id !== event.pointerId) return;
      if (!drag.current.isDrag && (Math.abs(event.clientX - drag.current.startX) > 3 || Math.abs(event.clientY - drag.current.startY) > 3)) {
        drag.current.isDrag = true;
      }
      drag.current = { ...drag.current, x: event.clientX, y: event.clientY };
      const worldX = (event.clientX - view.x) / view.scale;
      const worldY = (event.clientY - view.y) / view.scale;
      setPlaneAiming(prev => prev ? { ...prev, currentX: worldX, currentY: worldY } : null);
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
    } else if (tool === 'slingshot') {
      if (!drag.current || drag.current.id !== event.pointerId) return;
      if (!drag.current.isDrag && (Math.abs(event.clientX - drag.current.startX) > 3 || Math.abs(event.clientY - drag.current.startY) > 3)) {
        drag.current.isDrag = true;
      }
      drag.current = { ...drag.current, x: event.clientX, y: event.clientY };
    } else if (tool === 'flashlight') {
      if (!drag.current || drag.current.id !== event.pointerId) return;
      const dx = event.clientX - drag.current.x, dy = event.clientY - drag.current.y;

      if (!drag.current.isDrag && (Math.abs(event.clientX - drag.current.startX) > 3 || Math.abs(event.clientY - drag.current.startY) > 3)) {
        drag.current.isDrag = true;
      }

      drag.current = { ...drag.current, x: event.clientX, y: event.clientY };
      setFlashlightPos({ x: event.clientX, y: event.clientY });

      // Pan canvas when dragging with flashlight
      if (drag.current.isDrag) {
        setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
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

    if (tool === 'pen' || tool === 'vine' || tool === 'spray') {
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

        let foundGhostIndex = -1;
        if (tool === 'flashlight') {
           for (let i = 0; i < ghosts.length; i++) {
             if (!ghosts[i].caught) {
               const dist = Math.hypot(ghosts[i].x - worldX, ghosts[i].y - worldY);
               if (dist < 150) {
                 foundGhostIndex = i;
                 break;
               }
             }
           }
        }

        if (foundGhostIndex !== -1) {
           const ghost = ghosts[foundGhostIndex];
           setGhosts(prev => {
             const next = [...prev];
             next[foundGhostIndex] = { ...next[foundGhostIndex], caught: true };
             return next;
           });

           const candy = Math.random() > 0.5 ? '🍬' : '🍭';
           setStamps(prev => {
             const next = [...prev, { id: Math.random().toString(36).slice(2), x: ghost.x, y: ghost.y, emoji: candy }];
             if (next.length > 200) return next.slice(next.length - 200);
             return next;
           });

           playTreasureFound();
           showToast(`抓到了一只 ${ghost.emoji}，掉落了 ${candy}！`);

           // Particle effect
           const newParticles: Particle[] = [];
           for (let i = 0; i < 20; i++) {
             const angle = Math.random() * Math.PI * 2;
             const distance = 40 + Math.random() * 100;
             // Note: Particles are rendered inside `.canvas-world`, which has a transform applied to it:
             // transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`
             // This means particles actually expect world coordinates, not screen coordinates.
             newParticles.push({
               id: Math.random().toString(36).slice(2),
               x: ghost.x,
               y: ghost.y,
               color: ['#a855f7', '#d946ef', '#f43f5e', '#3b82f6'][Math.floor(Math.random() * 4)],
               tx: `${Math.cos(angle) * distance}px`,
               ty: `${Math.sin(angle) * distance}px`,
             });
           }
           setParticles(prev => [...prev.slice(-100), ...newParticles]);
           setTimeout(() => {
             setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
           }, 800);
        } else if (foundIndex !== -1) {
          handleItemInteraction('treasure', treasures[foundIndex].id);
        } else {
          // Check if clicking on an existing stamp to interact with it
          let nearestStamp = null;
          let minStampDist = Infinity;
          for (const s of stamps) {
            const dist = Math.hypot(s.x - worldX, s.y - worldY);
            if (dist < 40 && dist < minStampDist) {
              minStampDist = dist;
              nearestStamp = s;
            }
          }

          if (nearestStamp) {
            handleItemInteraction('stamp', nearestStamp.id);
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
    } else if (tool === 'whack') {
      drag.current = null;
      setDragging(false);
    } else if (tool === 'dice') {
      if (drag.current && !drag.current.isDrag) {
        setDiceTargets(prev => [...prev, { id: Math.random().toString(36).slice(2), x: drag.current!.x, y: drag.current!.y }]);
      }
      drag.current = null;
      setDragging(false);
    } else if (tool === 'snake' || tool === 'shooter' || tool === 'jumper' || tool === 'drive') {
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
          const { paths, sparks, hitStampIds } = calculateLaserPath(laserAiming.startX, laserAiming.startY, dirX, dirY);

          const laserId = Math.random().toString(36).slice(2);
          setActiveLasers(prev => [...prev, { id: laserId, paths, sparks }]);
          playMagicSparkle(); // Reuse sound

          if (hitStampIds.length > 0) {
            const stampsToPop: {id: string, x: number, y: number}[] = [];

            setStamps(prev => {
              let next = [...prev];
              hitStampIds.forEach(id => {
                const sIdx = next.findIndex(s => s.id === id);
                if (sIdx !== -1) {
                  let newEmoji = next[sIdx].emoji;
                  if (newEmoji === '🧊' || newEmoji === '⛄') newEmoji = '💧';
                  else if (newEmoji === '🌽') newEmoji = '🍿';
                  else if (newEmoji === '🥚') newEmoji = '🍳';
                  else if (['🌲', '🌳', '🌱', '🌿', '🍀'].includes(newEmoji)) newEmoji = '🔥';
                  else if (newEmoji === '🐔') newEmoji = '🍗';
                  else if (newEmoji === '🐷') newEmoji = '🥓';

                  if (newEmoji === '💣' || newEmoji === '🎈') {
                     stampsToPop.push({ id, x: next[sIdx].x, y: next[sIdx].y });
                  } else {
                     next[sIdx] = { ...next[sIdx], emoji: newEmoji };
                  }
                }
              });
              return next;
            });

            if (stampsToPop.length > 0) {
               setTimeout(() => {
                  stampsToPop.forEach(s => popStamp(s.x, s.y, s.id));
               }, 50);
            }
          }

          setTimeout(() => {
            setActiveLasers(prev => prev.filter(l => l.id !== laserId));
          }, 800);
        }
      }
      drag.current = null;
      setDragging(false);
      setLaserAiming(null);
    } else if (tool === 'plane') {
      if (planeAiming) {
        const dx = planeAiming.startX - planeAiming.currentX;
        const dy = planeAiming.startY - planeAiming.currentY;
        const dist = Math.hypot(dx, dy);

        if (dist > 10) {
           const vx = dx * 3; // Throw power multiplier
           const vy = dy * 3;
           const angle = Math.atan2(vy, vx);

           const newPlane: PaperPlane = {
              id: Math.random().toString(36).slice(2),
              x: planeAiming.startX,
              y: planeAiming.startY,
              vx,
              vy,
              life: 3 + Math.random() * 2, // seconds
              angle
           };
           setActivePlanes(prev => [...prev, newPlane]);
        }
      }
      drag.current = null;
      setDragging(false);
      setPlaneAiming(null);
    } else if (tool === 'slingshot') {
      if (drag.current && drag.current.targetId && drag.current.isDrag) {
        const dx = drag.current.startX - drag.current.x;
        const dy = drag.current.startY - drag.current.y;
        const target = drag.current.targetId;
        setStamps(prev => prev.map(s => {
          if (s.id === target) {
            return { ...s, vx: (dx / view.scale) * 5, vy: (dy / view.scale) * 5 };
          }
          return s;
        }));
      }
      drag.current = null;
      setDragging(false);
    } else if (tool === 'bubble') {
      setBubbles(prev => prev.map(b => {
        if (!b.floating) return { ...b, floating: true };
        return b;
      }));
      drag.current = null;
      setDragging(false);
    }
  }

  const handleItemInteraction = (targetType: 'treasure' | 'stamp', targetId: string) => {
    if (targetType === 'treasure') {
      const currentTreasures = treasuresRef.current;
      const index = currentTreasures.findIndex(t => t.id === targetId);
      if (index === -1 || currentTreasures[index].discovered) return;

      const t = currentTreasures[index];
      setTreasures(prev => {
        const next = [...prev];
        const nextIndex = next.findIndex(item => item.id === targetId);
        if (nextIndex > -1) next[nextIndex] = { ...next[nextIndex], discovered: true };
        return next;
      });
      playTreasureFound();
      showToast(`发现宝藏！ ${t.emoji}`);

      const newParticles: Particle[] = [];
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 150;
        newParticles.push({
          id: Math.random().toString(36).slice(2),
          x: t.x,
          y: t.y,
          color: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'][Math.floor(Math.random() * 5)],
          tx: `${Math.cos(angle) * distance}px`,
          ty: `${Math.sin(angle) * distance}px`,
        });
      }
      setParticles(prev => [...prev, ...newParticles]);
      setTimeout(() => {
        setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
      }, 600);

    } else if (targetType === 'stamp') {
      const nearestStamp = stampsRef.current.find(s => s.id === targetId);
      if (!nearestStamp) return;

      const e = nearestStamp.emoji;
      const worldX = nearestStamp.x;
      const worldY = nearestStamp.y;

      const ANIMALS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦋', '🐢', '🐈', '🐕', '🐾'];
      const MUSIC = ['🎵', '🎶', '🎸', '🎹', '🎷', '🎺', '🎻', '🥁'];
      const BALLS = ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱'];
      const BOMBS = ['💣', '🧨'];

      let actionTaken = true;
      let particlesToSpawn: Particle[] = [];
      const spawnParticles = (colors: string[], count = 10, distanceScale = 80) => {
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = 20 + Math.random() * distanceScale;
          particlesToSpawn.push({
            id: Math.random().toString(36).slice(2),
            x: worldX, y: worldY,
            color: colors[Math.floor(Math.random() * colors.length)],
            tx: `${Math.cos(angle) * distance}px`, ty: `${Math.sin(angle) * distance}px`
          });
        }
      };

      if (e === '🎈') {
        playStampPop();
        setStamps(prev => prev.filter(s => s.id !== nearestStamp.id));
        spawnParticles(['#ef4444', '#3b82f6', '#22c55e', '#eab308'], 15);
        showToast('啪！气球破了 🎈');
      } else if (e === '☁️') {
        playMagicSparkle();
        spawnParticles(['#60a5fa', '#3b82f6', '#93c5fd'], 15, 60);
        const newDrops: {id: string, x: number, y: number, emoji: string}[] = [];
        for(let i=0; i<3; i++) {
           newDrops.push({ id: Math.random().toString(36).slice(2), x: worldX + (Math.random() - 0.5) * 40, y: worldY + 20 + Math.random() * 20, emoji: '💧' });
        }
        setStamps(prev => [...prev, ...newDrops]);
      } else if (e === '🥚') {
        playStampPop();
        setStamps(prev => prev.map(s => s.id === nearestStamp.id ? { ...s, emoji: '🐣' } : s));
        spawnParticles(['#fde047', '#fef08a'], 10, 40);
      } else if (BOMBS.includes(e)) {
        playStampPop();
        setStamps(prev => prev.filter(s => s.id !== nearestStamp.id));
        spawnParticles(['#ef4444', '#f97316', '#f59e0b', '#000000'], 30, 150);
        showToast('轰！爆炸了 💥');
      } else if (ANIMALS.includes(e)) {
        playMagicSparkle();
        spawnParticles(['#ec4899', '#f43f5e', '#f9a8d4'], 8, 50);
        showToast(`抚摸了 ${e} 💕`);
      } else if (e === '🌱') {
        playMagicSparkle();
        setStamps(prev => prev.map(s => s.id === nearestStamp.id ? { ...s, emoji: '🌿' } : s));
        spawnParticles(['#22c55e', '#86efac'], 10, 60);
      } else if (e === '🌿') {
        playMagicSparkle();
        setStamps(prev => prev.map(s => s.id === nearestStamp.id ? { ...s, emoji: '🌳' } : s));
        spawnParticles(['#16a34a', '#4ade80'], 15, 80);
      } else if (e === '🌳') {
        playMagicSparkle();
        const FRUITS = ['🍎', '🍋', '🍒', '🍊', '🍑'];
        const newFruits: {id: string, x: number, y: number, emoji: string}[] = [];
        const numFruits = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numFruits; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 30 + Math.random() * 50;
          newFruits.push({
            id: Math.random().toString(36).slice(2),
            x: worldX + Math.cos(angle) * dist,
            y: worldY + Math.sin(angle) * dist,
            emoji: FRUITS[Math.floor(Math.random() * FRUITS.length)]
          });
        }
        setStamps(prev => [...prev, ...newFruits]);
        spawnParticles(['#ef4444', '#facc15', '#16a34a'], 10, 60);
        showToast('树上结出了果实！');
      } else if (e === '💡') {
        playBounce(300);
        setStamps(prev => prev.map(s => s.id === nearestStamp.id ? { ...s, emoji: '🌑' } : s));
      } else if (e === '🌑') {
        playBounce(300);
        setStamps(prev => prev.map(s => s.id === nearestStamp.id ? { ...s, emoji: '💡' } : s));
      } else if (e === '📜') {
        playMagicSparkle();
        setStamps(prev => prev.map(s => s.id === nearestStamp.id ? { ...s, emoji: '🗺️' } : s));
        spawnParticles(['#f59e0b', '#d97706'], 15, 60);
        showToast('打开了藏宝图！寻找终点的宝藏吧 🧰');

        const angle = Math.random() * Math.PI * 2;
        const dist = 300 + Math.random() * 400;
        const treasureX = worldX + Math.cos(angle) * dist;
        const treasureY = worldY + Math.sin(angle) * dist;

        const treasureId = Math.random().toString(36).slice(2);
        setStamps(prev => [...prev, { id: treasureId, x: treasureX, y: treasureY, emoji: '🧰' }]);

        const pathPoints: Point[] = [];
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
          pathPoints.push({
            x: worldX + (treasureX - worldX) * (i / steps),
            y: worldY + (treasureY - worldY) * (i / steps)
          });
        }
        setStrokes(prev => [...prev, { id: Math.random().toString(36).slice(2), points: pathPoints, color: '#f59e0b', type: 'vine' }]);
      } else if (e === '🧰') {
        playTreasureFound();
        setStamps(prev => prev.filter(s => s.id !== nearestStamp.id));
        spawnParticles(['#facc15', '#fef08a', '#eab308'], 25, 120);
        showToast('找到了宝藏！💎🪙');

        const REWARDS = ['💎', '🪙', '👑', '💍', '💰'];
        const newRewards: {id: string, x: number, y: number, emoji: string}[] = [];
        for (let i = 0; i < 5; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 30 + Math.random() * 80;
          newRewards.push({
            id: Math.random().toString(36).slice(2),
            x: worldX + Math.cos(angle) * dist,
            y: worldY + Math.sin(angle) * dist,
            emoji: REWARDS[Math.floor(Math.random() * REWARDS.length)]
          });
        }
        setStamps(prev => [...prev, ...newRewards]);
      } else if (MUSIC.includes(e)) {
        playBounce(300);
        spawnParticles(['#a855f7', '#d946ef', '#ec4899'], 8, 60);
      } else if (BALLS.includes(e)) {
        playBounce(300);
        // Using screen center as a push reference since event might not be mouse click now
        const viewCenterWorldX = (window.innerWidth / 2 - viewRef.current.x) / viewRef.current.scale;
        const viewCenterWorldY = (window.innerHeight / 2 - viewRef.current.y) / viewRef.current.scale;
        // if this was clicked by mouse, we use mouse pos. The mouse pos is passed in implicitly here from nearestStamp.
        // We'll just push it right slightly for keyboard users, or away from center.
        const pushX = worldX > viewCenterWorldX ? 80 : -80;
        setStamps(prev => prev.map(s => s.id === nearestStamp.id ? { ...s, x: s.x + pushX, y: s.y } : s));
        spawnParticles(['#d1d5db', '#9ca3af'], 5, 30);
      } else {
        popStamp(worldX, worldY, nearestStamp.id);
      }

      if (actionTaken && particlesToSpawn.length > 0) {
        setParticles(prev => [...prev, ...particlesToSpawn]);
        setTimeout(() => {
          setParticles(prev => prev.filter(p => !particlesToSpawn.find(np => np.id === p.id)));
        }, 1000);
      }
    }
  };

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

  // Paper Plane physics logic (animation loop)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const updatePlanes = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (dt > 0.1) {
         animationFrameId = requestAnimationFrame(updatePlanes);
         return;
      }

      const currentPlanes = activePlanesRef.current;
      if (currentPlanes.length === 0) {
         animationFrameId = requestAnimationFrame(updatePlanes);
         return;
      }

      let planesChanged = false;
      let stampsChanged = false;
      const deadPlaneIds = new Set<string>();
      const newStamps: {id: string, x: number, y: number, emoji: string}[] = [];
      const newParticles: Particle[] = [];
      const poppedStampIds = new Set<string>();

      const nextPlanes = currentPlanes.map(plane => {
         planesChanged = true;

         const speed = Math.hypot(plane.vx, plane.vy);
         const drag = 0.5 * dt;
         let newVx = plane.vx * (1 - drag);
         let newVy = plane.vy * (1 - drag);

         // Wobble effect based on life
         const wobble = Math.sin(time / 200) * 50 * dt;
         const perpX = -plane.vy / (speed || 1);
         const perpY = plane.vx / (speed || 1);

         newVx += perpX * wobble;
         newVy += perpY * wobble;

         const newX = plane.x + newVx * dt;
         const newY = plane.y + newVy * dt;
         const newLife = plane.life - dt;
         const newAngle = Math.atan2(newVy, newVx);

         if (Math.random() < 0.2) {
             const angle = Math.random() * Math.PI * 2;
             const distance = 5 + Math.random() * 10;
             newParticles.push({
               id: Math.random().toString(36).slice(2),
               x: newX, y: newY,
               color: '#d1d5db',
               tx: `${Math.cos(angle) * distance}px`, ty: `${Math.sin(angle) * distance}px`
             });
         }

         if (newLife <= 0 || speed < 20) {
            deadPlaneIds.add(plane.id);
            newStamps.push({ id: Math.random().toString(36).slice(2), x: newX, y: newY, emoji: '✈️' });
            return plane;
         }

         let finalLife = newLife;
         let finalVx = newVx;
         let finalVy = newVy;

         // Collision with balloons and environmental elements
         for (const s of stampsRef.current) {
            const dist = Math.hypot(s.x - newX, s.y - newY);
            if (dist < 30) {
               if (s.emoji === '🎈' && !poppedStampIds.has(s.id)) {
                  poppedStampIds.add(s.id);
               } else if (s.emoji === '🔥') {
                  finalLife = 0; // Burn up
                  if (Math.random() < 0.5) newStamps.push({ id: Math.random().toString(36).slice(2), x: newX, y: newY, emoji: '💨' });
               } else if (s.emoji === '☁️' || s.emoji === '🌧️' || s.emoji === '💧') {
                  finalLife -= dt * 2; // Wet planes fall faster
                  finalVx *= 0.9;
                  finalVy *= 0.9;
               }
            }
         }

         return { ...plane, x: newX, y: newY, vx: finalVx, vy: finalVy, life: finalLife, angle: newAngle };
      });

      if (poppedStampIds.size > 0) {
         poppedStampIds.forEach(id => {
            const s = stampsRef.current.find(ss => ss.id === id);
            if (s) popStamp(s.x, s.y, s.id);
         });
      }

      if (deadPlaneIds.size > 0) {
         if (newStamps.length > 0) {
            setStamps(prev => [...prev, ...newStamps]);
         }
      }

      if (newParticles.length > 0) {
         setParticles(prev => [...prev.slice(-150), ...newParticles]);
         setTimeout(() => {
            setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
         }, 600);
      }

      if (planesChanged || deadPlaneIds.size > 0) {
         setActivePlanes(nextPlanes.filter(p => !deadPlaneIds.has(p.id)));
      }

      animationFrameId = requestAnimationFrame(updatePlanes);
    };

    animationFrameId = requestAnimationFrame(updatePlanes);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);


  // Living stamps physics and visual audio logic (animation loop)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let lastRenderTime = performance.now();

    // Track sounds to prevent spamming
    const soundTimers: Record<string, number> = {};

    const updateLivingStamps = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (dt > 0.1) {
         animationFrameId = requestAnimationFrame(updateLivingStamps);
         return;
      }

      const currentStamps = stampsRef.current;
      if (currentStamps.length === 0) {
         animationFrameId = requestAnimationFrame(updateLivingStamps);
         return;
      }

      let stampsChanged = false;
      const nextStamps = currentStamps.map(stamp => {
         const { emoji, id } = stamp;
         let newX = stamp.x;
         let newY = stamp.y;
         let moved = false;

         const dispatchSound = (color: string, text: string) => {
            if (!soundTimers[id] || time - soundTimers[id] > 5000 + Math.random() * 5000) {
               soundTimers[id] = time;
               if (Math.random() < 0.3) {
                  window.dispatchEvent(new CustomEvent('app-sound-visual', { detail: { color, text, x: newX, y: newY } }));
               }
            }
         };

         if (emoji === '🎈' || emoji === '☁️') {
            newY -= 20 * dt;
            moved = true;
         } else if (emoji === '🦋' || emoji === '🐝') {
            newX += (Math.random() - 0.5) * 50 * dt;
            newY += (Math.random() - 0.5) * 50 * dt - 10 * dt;
            moved = true;
            if (emoji === '🐝') dispatchSound('#eab308', '嗡嗡...');
         } else if (emoji === '🛸' || emoji === '🚀') {
            newX += 100 * dt;
            newY -= 50 * dt;
            moved = true;
            if (emoji === '🛸') dispatchSound('#a855f7', '嗖...');
         } else if (emoji === '🐌') {
            newX += 5 * dt;
            moved = true;
         } else if (emoji === '🦇') {
            newX += (Math.random() - 0.5) * 100 * dt;
            newY += (Math.random() - 0.5) * 100 * dt;
            moved = true;
            dispatchSound('#334155', '叽...');
         } else if (emoji === '🕊️') {
            newX -= 60 * dt;
            newY -= 10 * dt;
            moved = true;
            dispatchSound('#f8fafc', '咕咕...');
         }

         let newVx = stamp.vx;
         let newVy = stamp.vy;

         if (newVx !== undefined && newVy !== undefined && (Math.abs(newVx) > 5 || Math.abs(newVy) > 5)) {
            newX += newVx * dt;
            newY += newVy * dt;
            newVx *= 0.98; // Friction
            newVy *= 0.98;

            const left = -viewRef.current.x / viewRef.current.scale;
            const right = (window.innerWidth - viewRef.current.x) / viewRef.current.scale;
            const top = -viewRef.current.y / viewRef.current.scale;
            const bottom = (window.innerHeight - viewRef.current.y) / viewRef.current.scale;

            if (newX < left) { newX = left; newVx *= -0.8; }
            if (newX > right) { newX = right; newVx *= -0.8; }
            if (newY < top) { newY = top; newVy *= -0.8; }
            if (newY > bottom) { newY = bottom; newVy *= -0.8; }

            moved = true;
         } else if (newVx !== undefined || newVy !== undefined) {
            newVx = undefined;
            newVy = undefined;
            moved = true; // One last update to clear velocity
         }

         if (moved) {
            stampsChanged = true;
            return { ...stamp, x: newX, y: newY, vx: newVx, vy: newVy };
         }
         return stamp;
      });

      if (stampsChanged) {
         // Throttle state updates to roughly 20fps for performance
         stampsRef.current = nextStamps;
         if (time - lastRenderTime > 50) {
            setStamps(nextStamps);
            lastRenderTime = time;
         }
      }

      animationFrameId = requestAnimationFrame(updateLivingStamps);
    };

    animationFrameId = requestAnimationFrame(updateLivingStamps);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

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

               // Splash effect on nearby stamps
               let transformedAny = false;
               currentStamps = currentStamps.map(s => {
                  if (Math.hypot(s.x - b.x, s.y - b.y) < 80) {
                     let newEmoji = s.emoji;
                     if (s.emoji === '🌱') newEmoji = '🌿';
                     else if (s.emoji === '🌿') newEmoji = '🌳';
                     else if (s.emoji === '🔥') newEmoji = '💨';
                     else if (s.emoji === '🥀') newEmoji = '🌺';
                     else if (s.emoji === '💩') newEmoji = '✨';
                     else if (s.emoji === '🐱') newEmoji = '🙀';
                     else if (s.emoji === '☁️') newEmoji = '🌧️';

                     if (newEmoji !== s.emoji) {
                        transformedAny = true;
                        return { ...s, emoji: newEmoji };
                     }
                  }
                  return s;
               });
               if (transformedAny) {
                  stampsChanged = true;
               }
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
  // Initialize flashlight position on mount
  useEffect(() => {
    setFlashlightPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }, []);

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
    {tool === 'flashlight' && (
      <div
        className="flashlight-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 10,
          background: `radial-gradient(circle 300px at ${flashlightPos.x}px ${flashlightPos.y}px, transparent 0%, rgba(0, 0, 0, 0.85) 80%, rgba(0, 0, 0, 0.95) 100%)`
        }}
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
            <g key={stroke.id}>
              {stroke.type !== 'spray' && <polyline points={stroke.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />}
              {renderVineLeaves(stroke)}
              {renderSprayCanDots(stroke)}
            </g>
          ))}
          {currentStroke && tool !== 'kaleidoscope' && (
            <g>
              {currentStroke.type !== 'spray' && <polyline points={currentStroke.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={currentStroke.color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />}
              {renderVineLeaves(currentStroke)}
              {renderSprayCanDots(currentStroke)}
            </g>
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
          {tool === 'plane' && planeAiming && (
             <line x1={planeAiming.startX} y1={planeAiming.startY} x2={planeAiming.currentX} y2={planeAiming.currentY} stroke="var(--primary)" strokeWidth="4" strokeDasharray="8 8" strokeLinecap="round" />
          )}
          {tool === 'slingshot' && drag.current && drag.current.isDrag && drag.current.targetId && (
             <line x1={drag.current.startX} y1={drag.current.startY} x2={drag.current.x} y2={drag.current.y} stroke="var(--orange-500, #f97316)" strokeWidth="6" strokeLinecap="round" />
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
          <div key={stamp.id} className={`stamp ${focusMode && focusedItem?.id === stamp.id ? 'is-focused' : ''}`} style={{ left: stamp.x, top: stamp.y }}>
            <div className="stamp-inner">{stamp.emoji}</div>
          </div>
        ))}
        {treasures.map(t => t.discovered ? (
          <div key={t.id} className="stamp treasure-stamp" style={{ left: t.x, top: t.y }}>
            <div className="stamp-inner">{t.emoji}</div>
            <div className="treasure-label">发现宝藏！</div>
          </div>
        ) : (
          <div key={t.id} className={`hidden-treasure ${focusMode && focusedItem?.id === t.id ? 'is-focused' : ''}`} style={{
            left: t.x, top: t.y,
            opacity: (isScanning && Math.hypot((t.x * view.scale + view.x) - scanPos.x, (t.y * view.scale + view.y) - scanPos.y) < 200) || (focusMode && focusedItem?.id === t.id) ? 1 : 0
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
        {tool === 'flashlight' && ghosts.map(g => !g.caught ? (
          <div key={g.id} className="hidden-ghost" style={{
            left: g.x, top: g.y,
            position: 'absolute',
            fontSize: '48px',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.8))',
            opacity: Math.hypot((g.x * view.scale + view.x) - flashlightPos.x, (g.y * view.scale + view.y) - flashlightPos.y) < 300 ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out'
          }} aria-hidden="true">
            {g.emoji}
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
        {activePlanes.map(plane => (
          <div key={plane.id} className="paper-plane-active" style={{ left: plane.x, top: plane.y, position: 'absolute', transform: `translate(-50%, -50%) rotate(${plane.angle + Math.PI/4}rad)` }} aria-hidden="true">
            <Send size={32} color="#9ca3af" fill="#e5e7eb" />
          </div>
        ))}
        <WildlifeTracker view={view} onDiscover={handleAnimalDiscover} />
        {ballActive && <BouncyBall strokes={strokes} view={view} stamps={stamps} onStampHit={(id, x, y) => popStamp(x, y, id)} />}
        {musicBoxActive && <MusicBox strokes={strokes} view={view} stamps={stamps} />}
        {tool === 'golf' && <MiniGolf strokes={strokes} view={view} shootSequence={shootSequence} shootVector={shootVector} />}
      </div>
      {tool === 'ninja' && <FruitNinja view={view} dragRef={drag} />}
      {tool === 'whack' && <WhackAMole view={view} dragRef={drag} />}
      {tool === 'dice' && <DiceRoller diceTargets={diceTargets} />}
      {tool === 'snake' && <CanvasSnake strokes={strokes} view={view} pointerWorldPosRef={pointerWorldPosRef} />}
      {tool === 'shooter' && <SpaceShooter view={view} pointerWorldPosRef={pointerWorldPosRef} />}
      {tool === 'jumper' && <StrokeJumper strokes={strokes} view={view} pointerWorldPosRef={pointerWorldPosRef} />}
      {tool === 'drive' && <RCCar strokes={strokes} view={view} stamps={stamps} pointerWorldPosRef={pointerWorldPosRef} isDragging={dragging} onStampHit={(id, x, y) => popStamp(x, y, id)} />}
      {(tool === 'firework' || fireworkTargets.length > 0) && <Fireworks fireworks={fireworkTargets} view={view} />}

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
      <Button variant={tool === 'spray' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="喷漆" onClick={() => { setTool('spray'); showToast('已切换至: 喷漆'); }}><SprayCan /></Button>
      <Button variant={tool === 'magic' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="魔法棒" onClick={() => { setTool('magic'); showToast('已切换至: 魔法棒'); }}><Wand2 /></Button>
      <Button variant={tool === 'bubble' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="吹泡泡" onClick={() => { setTool('bubble'); showToast('已切换至: 吹泡泡'); }}><Droplet /></Button>
      <Button variant={tool === 'blackhole' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="黑洞" onClick={() => { setTool('blackhole'); showToast('已切换至: 黑洞'); }}><CircleDotDashed /></Button>
      <Button variant={tool === 'scan' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="扫描仪" onClick={() => { setTool('scan'); showToast('已切换至: 扫描仪'); }}><Search /></Button>
      <Button variant={tool === 'sonar' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="声纳探测" onClick={() => { setTool('sonar'); showToast('已切换至: 声纳探测'); }}><Radar /></Button>
      <Button variant={tool === 'stamp-brush' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="印章刷" onClick={() => { setTool('stamp-brush'); showToast('已切换至: 印章刷'); }}><Smile /></Button>
      <Button variant={tool === 'golf' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="高尔夫" onClick={() => { setTool('golf'); showToast('已切换至: 高尔夫'); }}><Flag /></Button>
      <Button variant={tool === 'magnet' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="磁铁" onClick={() => { setTool('magnet'); showToast('已切换至: 磁铁'); }}><Magnet /></Button>
      <Button variant={tool === 'ninja' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="切水果" onClick={() => { setTool('ninja'); showToast('已切换至: 切水果'); }}><Swords /></Button>
      <Button variant={tool === 'whack' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="打地鼠" onClick={() => { setTool('whack'); showToast('已切换至: 打地鼠'); }}><Hammer /></Button>
      <Button variant={tool === 'dice' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="掷骰子" onClick={() => { setTool('dice'); showToast('已切换至: 掷骰子'); }}><Dices /></Button>
      <Button variant={tool === 'snake' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="贪吃蛇" onClick={() => { setTool('snake'); showToast('已切换至: 贪吃蛇'); }}><Gamepad2 /></Button>
      <Button variant={tool === 'confetti' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="派对纸屑" onClick={() => { setTool('confetti'); showToast('已切换至: 派对纸屑'); }}><PartyPopper /></Button>
      <Button variant={tool === 'kaleidoscope' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="万花筒" onClick={() => { setTool('kaleidoscope'); showToast('已切换至: 万花筒'); }}><Snowflake /></Button>
      <Button variant={tool === 'tornado' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="龙卷风" onClick={() => { setTool('tornado'); showToast('已切换至: 龙卷风'); }}><Tornado /></Button>
      <Button variant={tool === 'dig' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="挖掘" onClick={() => { setTool('dig'); showToast('已切换至: 挖掘'); }}><Pickaxe /></Button>
      <Button variant={tool === 'laser' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="激光" onClick={() => { setTool('laser'); showToast('已切换至: 激光'); }}><Zap /></Button>
      <Button variant={tool === 'shooter' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="星际保卫战" onClick={() => { setTool('shooter'); showToast('已切换至: 星际保卫战'); }}><Rocket /></Button>
      <Button variant={tool === 'fish' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="钓鱼" onClick={() => { setTool('fish'); showToast('已切换至: 钓鱼'); }}><Fish /></Button>
      <Button variant={tool === 'map' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="藏宝图" onClick={() => { setTool('map'); showToast('已切换至: 藏宝图'); }}><Map /></Button>
      <Button variant={tool === 'plane' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="纸飞机" onClick={() => { setTool('plane'); showToast('已切换至: 纸飞机'); }}><Send /></Button>
      <Button variant={tool === 'vine' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="藤蔓" onClick={() => { setTool('vine'); showToast('已切换至: 藤蔓'); }}><Leaf /></Button>
      <Button variant={tool === 'drive' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="遥控车" onClick={() => { setTool('drive'); showToast('已切换至: 遥控车'); }}><CarFront /></Button>
      <Button variant={tool === 'flashlight' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="手电筒" onClick={() => { setTool('flashlight'); showToast('已切换至: 手电筒'); }}><Flashlight /></Button>
      <Button variant={tool === 'jumper' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="跳跳乐" onClick={() => { setTool('jumper'); showToast('已切换至: 跳跳乐'); }}><ChevronsUp /></Button>
      <Button variant={tool === 'firework' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="烟花" onClick={() => { setTool('firework'); showToast('已切换至: 烟花'); }}><Star /></Button>
      <Button variant={tool === 'slingshot' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="弹弓" onClick={() => { setTool('slingshot'); showToast('已切换至: 弹弓'); }}><Target /></Button>
      {(stamps.length > 0 || strokes.length > 0) && (
        <Button variant="ghost" size="icon-sm" aria-label="清除内容" onClick={() => { setStamps([]); setStrokes([]); showToast('已清空画板内容'); }}><Eraser /></Button>
      )}
      <Button variant="ghost" size="icon-sm" aria-label="缩小画板" onClick={() => zoom(1 / 1.2, innerWidth / 2, innerHeight / 2)}><Minus /></Button>
      <span className="canvas-scale" aria-live="polite">{Math.round(view.scale * 100)}%</span>
      <Button variant="ghost" size="icon-sm" aria-label="放大画板" onClick={() => zoom(1.2, innerWidth / 2, innerHeight / 2)}><Plus /></Button>
      <Button variant="ghost" size="icon-sm" aria-label="重置画板视图" onClick={() => { setView(initial); showToast('视图已重置'); }}><LocateFixed /></Button>
      <Button variant={showCaptionsLog ? 'secondary' : 'ghost'} size="icon-sm" aria-label="声音记录" onClick={() => { setShowCaptionsLog(prev => !prev); showToast(showCaptionsLog ? '声音记录: 关闭' : '声音记录: 开启'); }}><Captions /></Button>
    </div>

    {showCaptionsLog && (
      <div className="captions-log-panel" role="log" aria-live="polite" aria-label="声音记录日志">
        <div className="captions-log-header">最近的声音</div>
        <div className="captions-log-list">
          {captionsLog.length === 0 && <div className="captions-log-empty">暂无记录</div>}
          {captionsLog.map(log => (
            <button
              key={log.id}
              className={`captions-log-item ${log.x !== undefined && log.y !== undefined ? 'clickable' : ''}`}
              style={{ '--log-color': log.color } as React.CSSProperties}
              onClick={() => {
                if (log.x !== undefined && log.y !== undefined) {
                  // Pan to location
                  setView(v => ({ x: -log.x! * v.scale + window.innerWidth / 2, y: -log.y! * v.scale + window.innerHeight / 2, scale: v.scale }));
                  playBounce(1500, log.color, log.x, log.y);
                }
              }}
              title={log.x !== undefined && log.y !== undefined ? '点击定位并重放' : undefined}
            >
              <span className="captions-log-time">{new Date(log.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
              <span className="captions-log-text">{log.text}</span>
              {log.x !== undefined && log.y !== undefined && <Navigation className="captions-log-nav-icon" size={12} />}
            </button>
          ))}
        </div>
      </div>
    )}

    <p className="canvas-hint">拖动或方向键移动 · Ctrl+滚轮或+/-缩放 · 0 重置 · 快捷键 V / P(B) / M / S / R / E / G / A / K / T</p>
    {OnekoComponent && <OnekoComponent />}
    <ParrotApp />

  </main>;
}

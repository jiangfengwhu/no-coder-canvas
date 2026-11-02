import { useEffect, useRef, useState } from 'react';
import { playStampPop, playStampPlace } from '@/lib/sound';

type View = { x: number; y: number; scale: number };
type Drag = { id: number; x: number; y: number; startX: number; startY: number; isDrag: boolean } | null;

type SlicePoint = { x: number; y: number; time: number };

type Fruit = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  type: 'fruit' | 'bomb';
  sliced: boolean;
};

const FRUITS = ['🍎', '🍌', '🍉', '🍇', '🍓', '🍑', '🍍', '🥝'];
const BOMBS = ['💣'];

export function FruitNinja({ view, dragRef }: { view: View, dragRef: React.MutableRefObject<Drag> }) {
  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [slicePath, setSlicePath] = useState<SlicePoint[]>([]);

  const fruitsRef = useRef<Fruit[]>([]);
  const lastTimeRef = useRef<number>(0);
  const slicePathRef = useRef<SlicePoint[]>([]);

  useEffect(() => {
    fruitsRef.current = fruits;
  }, [fruits]);

  useEffect(() => {
    slicePathRef.current = slicePath;
  }, [slicePath]);

  const restart = () => {
    setScore(0);
    setLives(3);
    setGameOver(false);
    setFruits([]);
  };

  const scoreRef = useRef(score);
  useEffect(() => { scoreRef.current = score; }, [score]);

  useEffect(() => {
    if (gameOver) return;

    let animId: number;

    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (dt > 0.1) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const gravity = 800;

      // Manually pull from dragRef inside the loop
      const currentDrag = dragRef.current;
      if (currentDrag && currentDrag.isDrag) {
        setSlicePath(prev => {
          const lastP = prev[prev.length - 1];
          if (!lastP || lastP.x !== currentDrag.x || lastP.y !== currentDrag.y) {
            const next = [...prev, { x: currentDrag.x, y: currentDrag.y, time: Date.now() }];
            return next.filter(p => Date.now() - p.time < 200).slice(-15);
          }
          return prev.filter(p => Date.now() - p.time < 200);
        });
      } else {
        if (slicePathRef.current.length > 0) {
           setSlicePath(prev => prev.filter(p => Date.now() - p.time < 200));
        }
      }

      const nextFruits = fruitsRef.current.map(fruit => {
        if (fruit.sliced) return fruit;

        let nx = fruit.x + fruit.vx * dt;
        let ny = fruit.y + fruit.vy * dt;
        let nvy = fruit.vy + gravity * dt;

        return { ...fruit, x: nx, y: ny, vy: nvy };
      }).filter(fruit => {
        if (fruit.sliced) return false;

        if (fruit.y > window.innerHeight + 100 && fruit.vy > 0) {
          if (fruit.type === 'fruit') {
             setLives(l => {
                 const updatedLives = Math.max(0, l - 1);
                 if (updatedLives === 0) setGameOver(true);
                 return updatedLives;
             });
          }
          return false;
        }
        return true;
      });

      const currentPath = slicePathRef.current;
      if (currentPath.length > 1) {
         const p1 = currentPath[currentPath.length - 2];
         const p2 = currentPath[currentPath.length - 1];

         for (let i = 0; i < nextFruits.length; i++) {
           const fruit = nextFruits[i];
           if (fruit.sliced) continue;

           const dx = p2.x - p1.x;
           const dy = p2.y - p1.y;
           const len = Math.hypot(dx, dy);
           if (len > 0) {
             const t = Math.max(0, Math.min(1, ((fruit.x - p1.x) * dx + (fruit.y - p1.y) * dy) / (len * len)));
             const closestX = p1.x + t * dx;
             const closestY = p1.y + t * dy;
             const dist = Math.hypot(fruit.x - closestX, fruit.y - closestY);

             if (dist < 40) {
               nextFruits[i] = { ...fruit, sliced: true };
               if (fruit.type === 'fruit') {
                 setScore(s => s + 10);
                 playStampPop();
               } else if (fruit.type === 'bomb') {
                 playStampPlace();
                 setLives(l => {
                   const updatedLives = Math.max(0, l - 1);
                   if (updatedLives === 0) setGameOver(true);
                   return updatedLives;
                 });
               }
             }
           }
         }
      }

      setFruits(nextFruits.filter(f => !f.sliced));

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameOver]);

  useEffect(() => {
    if (gameOver) return;

    let intervalId: ReturnType<typeof setInterval>;

    // Initial delay so fruits don't spawn instantly
    const timeout = setTimeout(() => {
        const loop = () => {
           if (document.hidden) return; // don't spawn when tab is hidden

           const isBomb = Math.random() < 0.2;
           const emoji = isBomb ? BOMBS[0] : FRUITS[Math.floor(Math.random() * FRUITS.length)];
           const startX = window.innerWidth * 0.2 + Math.random() * (window.innerWidth * 0.6);

           const newFruit: Fruit = {
             id: Math.random().toString(36).slice(2),
             x: startX,
             y: window.innerHeight + 50,
             vx: (Math.random() - 0.5) * 400,
             vy: -600 - Math.random() * 400,
             emoji,
             type: isBomb ? 'bomb' : 'fruit',
             sliced: false
           };
           setFruits(prev => [...prev, newFruit]);

           const nextInterval = Math.max(500, 1500 - scoreRef.current * 2);
           intervalId = setTimeout(loop, nextInterval);
        };
        intervalId = setTimeout(loop, 1500);
    }, 1000);

    return () => {
        clearTimeout(timeout);
        if (intervalId) clearTimeout(intervalId);
    };
  }, [gameOver]);

  return (
    <>
      <div style={{ position: 'fixed', top: 20, left: 20, zIndex: 100, background: 'var(--card)', color: 'var(--foreground)', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: '20px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        切水果 🍎 {score} | 生命 {'❤️'.repeat(lives)}
      </div>

      {gameOver && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 101, background: 'var(--card)', color: 'var(--foreground)', padding: '40px', borderRadius: 'var(--radius-lg)', textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}>
          <h2 style={{ fontSize: '32px', marginBottom: '20px' }}>游戏结束</h2>
          <p style={{ fontSize: '24px', marginBottom: '30px' }}>最终得分: {score}</p>
          <button onClick={restart} style={{ fontSize: '18px', padding: '10px 30px', cursor: 'pointer', borderRadius: 'var(--radius-md)', background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', fontWeight: 'bold' }}>
            重新开始
          </button>
        </div>
      )}

      {fruits.map(fruit => (
        <div key={fruit.id} style={{
          position: 'fixed',
          left: fruit.x,
          top: fruit.y,
          fontSize: '60px',
          transform: `translate(-50%, -50%) rotate(${fruit.vx}deg)`,
          pointerEvents: 'none',
          zIndex: 90
        }}>
          {fruit.emoji}
        </div>
      ))}

      <svg style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 95 }}>
        {slicePath.length > 1 && (
          <polyline
            points={slicePath.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
            style={{ filter: 'drop-shadow(0px 0px 4px rgba(255,255,255,0.8))' }}
          />
        )}
      </svg>
    </>
  );
}

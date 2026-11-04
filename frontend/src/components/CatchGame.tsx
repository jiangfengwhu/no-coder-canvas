import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { playStampPop, playStampPlace, playTreasureFound } from '@/lib/sound';

type Point = { x: number; y: number };
type View = { x: number; y: number; scale: number };

interface CatchGameProps {
  view: View;
  pointerWorldPosRef: MutableRefObject<Point | null>;
}

type FallingItem = {
  id: string;
  x: number;
  y: number;
  speed: number;
  emoji: string;
  type: 'good' | 'bad';
  caught: boolean;
};

const GOOD_ITEMS = ['🍎', '💎', '🎁', '⭐', '🍀'];
const BAD_ITEMS = ['💣', '💩'];

export function CatchGame({ view, pointerWorldPosRef }: CatchGameProps) {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [, setRenderCount] = useState(0);

  const basketPosRef = useRef<number>(0);
  const itemsRef = useRef<FallingItem[]>([]);
  const lastTimeRef = useRef<number>(0);
  const lastSpawnTimeRef = useRef<number>(0);

  const scoreRef = useRef(score);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const viewRef = useRef<View>(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  const gameOverRef = useRef(gameOver);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  const restart = () => {
    setScore(0);
    setLives(3);
    setGameOver(false);
    itemsRef.current = [];
    lastTimeRef.current = 0;
  };

  useEffect(() => {
    if (gameOverRef.current) return;

    // Set initial basket position to screen center (in world coordinates)
    if (basketPosRef.current === 0) {
      basketPosRef.current = (window.innerWidth / 2 - viewRef.current.x) / viewRef.current.scale;
    }

    let animId: number;

    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (dt > 0.1) {
        animId = requestAnimationFrame(loop);
        return;
      }

      // Update basket position smoothly to follow pointer X
      if (pointerWorldPosRef.current) {
         const targetX = pointerWorldPosRef.current.x;
         basketPosRef.current += (targetX - basketPosRef.current) * 15 * dt;
      }

      const now = performance.now();
      const v = viewRef.current;

      // Calculate top and bottom of screen in world coordinates
      const topY = -v.y / v.scale - 50;
      const bottomY = (window.innerHeight - v.y) / v.scale + 50;

      const leftX = -v.x / v.scale + 50;
      const rightX = (window.innerWidth - v.x) / v.scale - 50;

      // Spawn new items
      const spawnInterval = Math.max(400, 1500 - scoreRef.current * 20);
      if (now - lastSpawnTimeRef.current > spawnInterval) {
          const isBad = Math.random() < 0.2;
          itemsRef.current.push({
             id: Math.random().toString(36).substring(2,9),
             x: leftX + Math.random() * (rightX - leftX),
             y: topY,
             speed: 200 + Math.random() * 150 + scoreRef.current * 10,
             emoji: isBad ? BAD_ITEMS[Math.floor(Math.random() * BAD_ITEMS.length)] : GOOD_ITEMS[Math.floor(Math.random() * GOOD_ITEMS.length)],
             type: isBad ? 'bad' : 'good',
             caught: false
          });
          lastSpawnTimeRef.current = now;
      }

      const basketY = (window.innerHeight - 80 - v.y) / v.scale;
      const catchRadius = 60 / v.scale;

      let scoreDelta = 0;
      let livesLost = 0;

      const nextItems = [];
      for (const item of itemsRef.current) {
          if (item.caught) continue;

          item.y += item.speed * dt;

          // Collision detection
          if (Math.abs(item.y - basketY) < catchRadius && Math.abs(item.x - basketPosRef.current) < catchRadius) {
              item.caught = true;
              if (item.type === 'good') {
                  scoreDelta += 10;
                  playTreasureFound(item.x, item.y);
              } else {
                  livesLost++;
                  playStampPlace(item.x, item.y);
              }
              continue;
          }

          // Missed item
          if (item.y > bottomY) {
              item.caught = true;
              if (item.type === 'good') {
                  // Optional: lose life if missed a good item? Let's keep it casual and only lose lives on bombs.
              }
              continue;
          }

          nextItems.push(item);
      }

      itemsRef.current = nextItems;

      if (scoreDelta > 0) {
          setScore(s => s + scoreDelta);
      }

      if (livesLost > 0) {
          setLives(l => {
              const newLives = Math.max(0, l - livesLost);
              if (newLives === 0) setGameOver(true);
              return newLives;
          });
      }

      setRenderCount(c => c + 1);

      if (!gameOverRef.current) {
          animId = requestAnimationFrame(loop);
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameOver, pointerWorldPosRef]);

  // Convert basket pos to screen coordinates for rendering
  const basketScreenX = basketPosRef.current * view.scale + view.x;
  const basketScreenY = window.innerHeight - 80;

  return (
    <>
      <div style={{ position: 'fixed', top: 20, left: 20, zIndex: 100, background: 'var(--card)', color: 'var(--foreground)', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: '20px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        接宝物 🧺 得分: {score} | 生命: {'❤️'.repeat(lives)}
      </div>

      {gameOver && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 200, background: 'var(--card)', color: 'var(--foreground)', padding: '40px', borderRadius: 'var(--radius-lg)', textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}>
          <h2 style={{ fontSize: '32px', margin: '0 0 20px 0' }}>游戏结束!</h2>
          <p style={{ fontSize: '24px', margin: '0 0 30px 0' }}>最终得分: {score}</p>
          <button onClick={restart} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', padding: '12px 24px', fontSize: '18px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold' }}>
            重新开始
          </button>
        </div>
      )}

      {/* The Basket */}
      {!gameOver && (
         <div style={{
           position: 'fixed',
           left: basketScreenX,
           top: basketScreenY,
           transform: `translate(-50%, -50%)`,
           fontSize: `${60 * view.scale}px`,
           pointerEvents: 'none',
           zIndex: 90
         }}>
           🧺
         </div>
      )}

      {/* Falling Items */}
      {itemsRef.current.map(item => (
         <div key={item.id} style={{
           position: 'fixed',
           left: item.x * view.scale + view.x,
           top: item.y * view.scale + view.y,
           transform: `translate(-50%, -50%)`,
           fontSize: `${40 * view.scale}px`,
           pointerEvents: 'none',
           zIndex: 80
         }}>
           {item.emoji}
         </div>
      ))}
    </>
  );
}

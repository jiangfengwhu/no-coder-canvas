import React, { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { playStampPop, playTreasureFound, playStampPlace } from '@/lib/sound';

type Point = { x: number; y: number };
type View = { x: number; y: number; scale: number };

interface SpaceShooterProps {
  view: View;
  pointerWorldPosRef: MutableRefObject<Point | null>;
}

type Projectile = { id: string; x: number; y: number };
type Enemy = { id: string; x: number; y: number; speed: number; emoji: string };

const ENEMIES = ['👾', '🛸', '☄️', '👽', '💀'];

export function SpaceShooter({ view, pointerWorldPosRef }: SpaceShooterProps) {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Use state only for triggering re-renders, not for frequent game loop state
  const [, setRenderCount] = useState(0);

  const shipPosRef = useRef<Point | null>(null);
  const projectilesRef = useRef<Projectile[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const lastTimeRef = useRef<number>(0);
  const lastShootTimeRef = useRef<number>(0);
  const lastEnemyTimeRef = useRef<number>(0);
  const viewRef = useRef<View>(view);
  const scoreRef = useRef(score);
  const gameOverRef = useRef(gameOver);

  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  useEffect(() => {
    if (gameOverRef.current) return;
    let animId: number;
    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (dt > 0.1) { animId = requestAnimationFrame(loop); return; }

      if (pointerWorldPosRef.current) {
         const target = pointerWorldPosRef.current;
         if (!shipPosRef.current) {
             shipPosRef.current = { ...target };
         } else {
             shipPosRef.current.x += (target.x - shipPosRef.current.x) * 15 * dt;
             shipPosRef.current.y += (target.y - shipPosRef.current.y) * 15 * dt;
         }
      }

      const now = performance.now();

      if (shipPosRef.current && now - lastShootTimeRef.current > 300) {
          projectilesRef.current.push({ id: Math.random().toString(36).substr(2,9), x: shipPosRef.current.x, y: shipPosRef.current.y - 20 });
          lastShootTimeRef.current = now;
          playStampPop(shipPosRef.current.x, shipPosRef.current.y);
      }

      if (now - lastEnemyTimeRef.current > Math.max(500, 2000 - scoreRef.current * 50)) {
          const v = viewRef.current;
          const topY = -v.y / v.scale - 50;
          const leftX = -v.x / v.scale;
          const rightX = (window.innerWidth - v.x) / v.scale;

          const x = leftX + Math.random() * (rightX - leftX);
          enemiesRef.current.push({
             id: Math.random().toString(36).substr(2,9),
             x,
             y: topY,
             speed: 100 + Math.random() * 50 + scoreRef.current * 5,
             emoji: ENEMIES[Math.floor(Math.random() * ENEMIES.length)]
          });
          lastEnemyTimeRef.current = now;
      }

      const nextProjectiles = [];
      const v = viewRef.current;
      const topY = -v.y / v.scale - 200;
      for (const p of projectilesRef.current) {
          p.y -= 500 * dt;
          if (p.y > topY) nextProjectiles.push(p);
      }
      projectilesRef.current = nextProjectiles;

      const nextEnemies = [];
      let isGameOver = false;
      const bottomY = (window.innerHeight - v.y) / v.scale + 200;
      for (const e of enemiesRef.current) {
          e.y += e.speed * dt;

          if (shipPosRef.current) {
             const dx = e.x - shipPosRef.current.x;
             const dy = e.y - shipPosRef.current.y;
             if (Math.hypot(dx, dy) < 40) {
                isGameOver = true;
                playStampPlace(e.x, e.y);
             }
          }

          if (e.y < bottomY) nextEnemies.push(e);
      }
      enemiesRef.current = nextEnemies;

      const survivingEnemies = [];
      const usedProj = new Set();
      let earned = 0;
      for (const e of enemiesRef.current) {
          let hit = false;
          for (const p of projectilesRef.current) {
              if (usedProj.has(p.id)) continue;
              const dx = p.x - e.x;
              const dy = p.y - e.y;
              if (Math.hypot(dx, dy) < 40) {
                  hit = true;
                  usedProj.add(p.id);
                  earned++;
                  playTreasureFound(e.x, e.y);
                  break;
              }
          }
          if (!hit) survivingEnemies.push(e);
      }
      enemiesRef.current = survivingEnemies;
      projectilesRef.current = projectilesRef.current.filter(p => !usedProj.has(p.id));

      if (earned > 0) {
          setScore(s => s + earned * 10);
      }

      setRenderCount(c => c + 1);

      if (isGameOver) {
          setGameOver(true);
      } else {
          animId = requestAnimationFrame(loop);
      }
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameOver]);

  const restart = () => {
    setScore(0);
    setGameOver(false);
    projectilesRef.current = [];
    enemiesRef.current = [];
    lastTimeRef.current = 0;
  };

  return (
    <>
      <div style={{ position: 'fixed', top: 20, left: 20, zIndex: 100, background: 'var(--card)', color: 'var(--foreground)', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: '20px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        星际保卫战 🚀 得分: {score}
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

      {shipPosRef.current && !gameOver && (
         <div style={{
           position: 'absolute',
           left: 0,
           top: 0,
           transform: `translate(${shipPosRef.current.x * view.scale + view.x}px, ${shipPosRef.current.y * view.scale + view.y}px) translate(-50%, -50%)`,
           fontSize: `${40 * view.scale}px`,
           pointerEvents: 'none',
           zIndex: 10
         }}>
           🚀
         </div>
      )}

      {projectilesRef.current.map(p => (
         <div key={p.id} style={{
           position: 'absolute',
           left: 0,
           top: 0,
           transform: `translate(${p.x * view.scale + view.x}px, ${p.y * view.scale + view.y}px) translate(-50%, -50%)`,
           width: `${6 * view.scale}px`,
           height: `${20 * view.scale}px`,
           background: '#ef4444',
           borderRadius: `${4 * view.scale}px`,
           pointerEvents: 'none',
           zIndex: 9
         }} />
      ))}

      {enemiesRef.current.map(e => (
         <div key={e.id} style={{
           position: 'absolute',
           left: 0,
           top: 0,
           transform: `translate(${e.x * view.scale + view.x}px, ${e.y * view.scale + view.y}px) translate(-50%, -50%)`,
           fontSize: `${40 * view.scale}px`,
           pointerEvents: 'none',
           zIndex: 10
         }}>
           {e.emoji}
         </div>
      ))}
    </>
  );
}

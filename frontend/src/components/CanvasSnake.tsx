import React, { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { playStampPop, playTreasureFound } from '@/lib/sound';

type Point = { x: number; y: number };
type Stroke = { id: string; points: Point[]; color: string };
type View = { x: number; y: number; scale: number };

interface CanvasSnakeProps {
  strokes: Stroke[];
  view: View;
  pointerWorldPosRef: MutableRefObject<Point | null>;
}

export function CanvasSnake({ strokes, view, pointerWorldPosRef }: CanvasSnakeProps) {
  const [snake, setSnake] = useState<Point[]>([]);
  const [apple, setApple] = useState<Point | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const snakeRef = useRef<Point[]>([]);
  const appleRef = useRef<Point | null>(null);
  const strokesRef = useRef<Stroke[]>(strokes);
  const viewRef = useRef<View>(view);
  const lastTimeRef = useRef<number>(0);

  const scoreRef = useRef(score);

  useEffect(() => { strokesRef.current = strokes; }, [strokes]);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { appleRef.current = apple; }, [apple]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);

  const restart = () => {
    const centerWorldX = (window.innerWidth / 2 - viewRef.current.x) / viewRef.current.scale;
    const centerWorldY = (window.innerHeight / 2 - viewRef.current.y) / viewRef.current.scale;

    setScore(0);
    setGameOver(false);

    const initialSnake = [];
    for (let i = 0; i < 15; i++) {
        initialSnake.push({ x: centerWorldX - i * 10, y: centerWorldY });
    }
    setSnake(initialSnake);
    snakeRef.current = initialSnake;

    spawnApple();
  };

  const spawnApple = () => {
    const centerWorldX = (window.innerWidth / 2 - viewRef.current.x) / viewRef.current.scale;
    const centerWorldY = (window.innerHeight / 2 - viewRef.current.y) / viewRef.current.scale;

    // Spawn apple roughly within screen bounds
    const screenWidthWorld = window.innerWidth / viewRef.current.scale;
    const screenHeightWorld = window.innerHeight / viewRef.current.scale;

    const newApple = {
      x: centerWorldX + (Math.random() - 0.5) * (screenWidthWorld * 0.8),
      y: centerWorldY + (Math.random() - 0.5) * (screenHeightWorld * 0.8)
    };

    setApple(newApple);
    appleRef.current = newApple;
  };

  useEffect(() => {
    restart();
  }, []);

  useEffect(() => {
    let animId: number;

    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (dt > 0.1) {
        animId = requestAnimationFrame(loop);
        return;
      }

      setSnake(prevSnake => {
        if (prevSnake.length === 0 || gameOver) return prevSnake;

        const head = prevSnake[0];
        let targetX = head.x;
        let targetY = head.y;

        if (pointerWorldPosRef.current) {
           targetX = pointerWorldPosRef.current.x;
           targetY = pointerWorldPosRef.current.y;
        }

        const dx = targetX - head.x;
        const dy = targetY - head.y;
        const dist = Math.hypot(dx, dy);

        // Speed increases slightly with score
        const speed = 200 + scoreRef.current * 10;

        let newHeadX = head.x;
        let newHeadY = head.y;

        if (dist > 5) { // Only move if far enough from pointer
            newHeadX += (dx / dist) * speed * dt;
            newHeadY += (dy / dist) * speed * dt;
        }

        const newSnake = [{ x: newHeadX, y: newHeadY }];
        const segmentDist = 15; // Distance between segments

        // Follow the leader for body segments
        for (let i = 1; i < prevSnake.length; i++) {
          const prevSeg = newSnake[i - 1];
          const currSeg = prevSnake[i];

          const segDx = prevSeg.x - currSeg.x;
          const segDy = prevSeg.y - currSeg.y;
          const segDist = Math.hypot(segDx, segDy);

          if (segDist > segmentDist) {
             const moveRatio = (segDist - segmentDist) / segDist;
             newSnake.push({
                 x: currSeg.x + segDx * moveRatio,
                 y: currSeg.y + segDy * moveRatio
             });
          } else {
             newSnake.push({ ...currSeg });
          }
        }

        // Collision logic
        if (newSnake.length > 0) {
            const currentHead = newSnake[0];
            const snakeRadius = 8;
            let crashed = false;

            // 1. Collision with itself
            // Skip the first few segments so it doesn't instantly die on tight turns
            for (let i = 15; i < newSnake.length; i++) {
                const seg = newSnake[i];
                if (Math.hypot(currentHead.x - seg.x, currentHead.y - seg.y) < snakeRadius) {
                    crashed = true;
                    break;
                }
            }

            // 2. Collision with strokes
            if (!crashed) {
                for (const stroke of strokesRef.current) {
                    if (crashed) break;
                    if (stroke.points.length < 2) continue;

                    for (let i = 0; i < stroke.points.length - 1; i++) {
                        const p1 = stroke.points[i];
                        const p2 = stroke.points[i + 1];

                        const lineDx = p2.x - p1.x;
                        const lineDy = p2.y - p1.y;
                        const len = Math.hypot(lineDx, lineDy);
                        if (len === 0) continue;

                        const t = Math.max(0, Math.min(1, ((currentHead.x - p1.x) * lineDx + (currentHead.y - p1.y) * lineDy) / (len * len)));
                        const closestX = p1.x + t * lineDx;
                        const closestY = p1.y + t * lineDy;

                        if (Math.hypot(currentHead.x - closestX, currentHead.y - closestY) < snakeRadius + 4) { // stroke width
                            crashed = true;
                            break;
                        }
                    }
                }
            }

            if (crashed) {
                setGameOver(true);
                playStampPop(head.x, head.y);
                setHighScore(prev => Math.max(prev, scoreRef.current));
                return newSnake;
            }

            // 3. Eating Apple
            if (appleRef.current) {
                const appleDist = Math.hypot(currentHead.x - appleRef.current.x, currentHead.y - appleRef.current.y);
                if (appleDist < snakeRadius + 12) {
                    playTreasureFound(head.x, head.y);
                    setScore(s => s + 10);
                    spawnApple();
                    // Add some new segments to the tail
                    const lastSeg = newSnake[newSnake.length - 1];
                    for (let i = 0; i < 5; i++) {
                         newSnake.push({ ...lastSeg });
                    }
                }
            }
        }

        return newSnake;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameOver]);

  return (
    <>
      <div style={{ position: 'fixed', top: 20, left: 20, zIndex: 100, background: 'var(--card)', color: 'var(--foreground)', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: '20px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        贪吃蛇 🐍 得分: {score} | 最高分: {highScore}
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

      {apple && (
        <div style={{
          position: 'absolute',
          left: apple.x * view.scale + view.x,
          top: apple.y * view.scale + view.y,
          fontSize: `${24 * view.scale}px`,
          transform: 'translate(-50%, -50%)',
          zIndex: 80,
          pointerEvents: 'none'
        }}>
          🍎
        </div>
      )}

      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 85, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: '0 0' }}>
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
        {snake.length > 1 && (
          <polyline
            points={snake.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#22c55e"
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0px 0px 4px rgba(34, 197, 94, 0.6))' }}
          />
        )}
        </svg>
      </div>
    </>
  );
}

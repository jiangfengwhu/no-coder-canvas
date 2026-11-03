import React, { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { playBounce } from '@/lib/sound';

type Point = { x: number; y: number };
type Stroke = { id: string; points: Point[]; color: string };
type View = { x: number; y: number; scale: number };

interface StrokeJumperProps {
  strokes: Stroke[];
  view: View;
  pointerWorldPosRef: MutableRefObject<Point | null>;
}

export function StrokeJumper({ strokes, view, pointerWorldPosRef }: StrokeJumperProps) {
  const [pos, setPos] = useState<Point>({ x: 0, y: 0 });
  const [score, setScore] = useState(0);

  const posRef = useRef<Point>({ x: 0, y: 0 });
  const velRef = useRef<Point>({ x: 0, y: 0 });
  const highestYRef = useRef<number>(0);
  const startYRef = useRef<number>(0);

  const lastTimeRef = useRef<number>(0);
  const strokesRef = useRef<Stroke[]>(strokes);
  const viewRef = useRef<View>(view);

  useEffect(() => { strokesRef.current = strokes; }, [strokes]);
  useEffect(() => { viewRef.current = view; }, [view]);

  useEffect(() => {
    // Reset position initially based on viewport top center
    const centerWorldX = (window.innerWidth / 2 - viewRef.current.x) / viewRef.current.scale;
    const topWorldY = (-viewRef.current.y) / viewRef.current.scale;

    posRef.current = { x: centerWorldX, y: topWorldY + 100 }; // start near top
    velRef.current = { x: 0, y: 0 };
    highestYRef.current = posRef.current.y;
    startYRef.current = posRef.current.y;
    setPos({ ...posRef.current });

    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (dt > 0.1) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const gravity = 1200;
      const jumpForce = -800;
      const radius = 20;

      velRef.current.y += gravity * dt;

      // Horizontal movement follows pointer
      if (pointerWorldPosRef.current) {
         const targetX = pointerWorldPosRef.current.x;
         const dx = targetX - posRef.current.x;
         velRef.current.x = dx * 5; // smooth follow
      }

      let nextX = posRef.current.x + velRef.current.x * dt;
      let nextY = posRef.current.y + velRef.current.y * dt;

      // Collision detection only when falling
      if (velRef.current.y > 0) {
        let hasCollided = false;

        for (const stroke of strokesRef.current) {
          if (hasCollided) break;
          if (stroke.points.length < 2) continue;

          for (let i = 0; i < stroke.points.length - 1; i++) {
            const p1 = stroke.points[i];
            const p2 = stroke.points[i+1];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy);
            if (len === 0) continue;

            const t = Math.max(0, Math.min(1, ((nextX - p1.x) * dx + (nextY - p1.y) * dy) / (len * len)));
            const closestX = p1.x + t * dx;
            const closestY = p1.y + t * dy;

            const dist = Math.hypot(nextX - closestX, nextY - closestY);

            // Give a bit of leniency
            if (dist < radius + 8 && nextY < closestY + radius) {
               hasCollided = true;

               // Push up to avoid sticking
               nextY = closestY - radius;
               velRef.current.y = jumpForce;
               playBounce(1000, stroke.color, closestX, closestY);
               break;
            }
          }
        }
      }

      // Update highest reached (lower Y is higher in world space)
      if (nextY < highestYRef.current) {
          highestYRef.current = nextY;
      }

      // Check if fallen way below starting point (reset)
      const bottomWorldY = (window.innerHeight - viewRef.current.y) / viewRef.current.scale;
      if (nextY > bottomWorldY + 1000) {
          const centerWorldX = (window.innerWidth / 2 - viewRef.current.x) / viewRef.current.scale;
          const topWorldY = (-viewRef.current.y) / viewRef.current.scale;
          nextX = centerWorldX;
          nextY = topWorldY + 100;
          velRef.current = { x: 0, y: 0 };
          highestYRef.current = nextY;
          startYRef.current = nextY;
      }

      posRef.current.x = nextX;
      posRef.current.y = nextY;

      setScore(Math.max(0, Math.floor(startYRef.current - highestYRef.current)));
      setPos({ ...posRef.current });

      animId = requestAnimationFrame(loop);
    };

    let animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: pos.x * view.scale + view.x,
          top: pos.y * view.scale + view.y,
          transform: 'translate(-50%, -50%)',
          fontSize: `${40 * view.scale}px`,
          pointerEvents: 'none',
          zIndex: 100,
          transition: 'transform 0.1s'
        }}
      >
        {velRef.current.y < 0 ? '🚀' : '🐸'}
      </div>

      <div style={{ position: 'fixed', top: 20, left: 20, zIndex: 100, background: 'var(--card)', color: 'var(--foreground)', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: '20px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        跳跳乐 ⬆️ 高度: {score}
      </div>
    </>
  );
}

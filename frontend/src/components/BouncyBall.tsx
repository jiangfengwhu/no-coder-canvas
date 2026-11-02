import { useEffect, useRef, useState } from 'react';
import { playBounce } from '@/lib/sound';

type Point = { x: number; y: number };
type Stroke = { id: string; points: Point[]; color: string };
type View = { x: number; y: number; scale: number };

export function BouncyBall({ strokes, view, stamps, onStampHit }: { strokes: Stroke[], view: View, stamps: { id: string; x: number; y: number; emoji: string }[], onStampHit: (id: string, x: number, y: number) => void }) {
  const [pos, setPos] = useState<Point>({ x: 0, y: -500 });
  const posRef = useRef<Point>({ x: 0, y: -500 });
  const velRef = useRef<Point>({ x: 0, y: 0 });
  const lastTimeRef = useRef<number>(0);
  const strokesRef = useRef<Stroke[]>(strokes);
  const viewRef = useRef<View>(view);
  const stampsRef = useRef<{ id: string; x: number; y: number; emoji: string }[]>(stamps);

  // Keep refs updated for the animation loop
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    stampsRef.current = stamps;
  }, [stamps]);

  useEffect(() => {
    // Reset position initially based on viewport center
    const centerWorldX = (window.innerWidth / 2 - viewRef.current.x) / viewRef.current.scale;
    const centerWorldY = (window.innerHeight / 2 - viewRef.current.y) / viewRef.current.scale;
    posRef.current = { x: centerWorldX, y: centerWorldY - 500 };
    velRef.current = { x: 0, y: 0 };

    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // Cap dt to avoid large jumps if tab is inactive
      if (dt > 0.1) {
        requestAnimationFrame(loop);
        return;
      }

      const gravity = 1000;
      const radius = 16; // 32px font size roughly means 16px radius

      // Update velocity with gravity
      velRef.current.y += gravity * dt;

      // Calculate next position
      let nextX = posRef.current.x + velRef.current.x * dt;
      let nextY = posRef.current.y + velRef.current.y * dt;

      // Collision detection with strokes
      let hasCollided = false;
      const bounceRestitution = 0.8; // Energy kept after bounce

      for (const stroke of strokesRef.current) {
        if (hasCollided) break;
        if (stroke.points.length < 2) continue;

        for (let i = 0; i < stroke.points.length - 1; i++) {
          const p1 = stroke.points[i];
          const p2 = stroke.points[i+1];

          // Line segment vector
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.hypot(dx, dy);
          if (len === 0) continue;

          // Ball center distance to line segment
          const t = Math.max(0, Math.min(1, ((nextX - p1.x) * dx + (nextY - p1.y) * dy) / (len * len)));
          const closestX = p1.x + t * dx;
          const closestY = p1.y + t * dy;

          const dist = Math.hypot(nextX - closestX, nextY - closestY);

          if (dist < radius) {
            // Collision!
            hasCollided = true;

            // Calculate normal vector of the line
            let nx = (nextX - closestX) / dist;
            let ny = (nextY - closestY) / dist;

            // Push ball out of collision
            nextX = closestX + nx * radius;
            nextY = closestY + ny * radius;

            // Reflect velocity: v' = v - 2 * (v . n) * n
            const dot = velRef.current.x * nx + velRef.current.y * ny;

            // Only bounce if moving towards the line
            if (dot < 0) {
              velRef.current.x = (velRef.current.x - 2 * dot * nx) * bounceRestitution;
              velRef.current.y = (velRef.current.y - 2 * dot * ny) * bounceRestitution;

              const speed = Math.hypot(velRef.current.x, velRef.current.y);
              if (speed > 50) {
                playBounce(speed, stroke.color, closestX, closestY);
              }
            }

            break;
          }
        }
      }

      // Collision detection with stamps
      if (!hasCollided) {
        for (const stamp of stampsRef.current) {
          const dist = Math.hypot(nextX - stamp.x, nextY - stamp.y);
          const stampRadius = 20; // Hit radius for stamps

          if (dist < radius + stampRadius) {
            // Collision with stamp!
            let nx = (nextX - stamp.x) / dist;
            let ny = (nextY - stamp.y) / dist;

            // Push ball out
            nextX = stamp.x + nx * (radius + stampRadius);
            nextY = stamp.y + ny * (radius + stampRadius);

            // Reflect velocity with a boost
            const dot = velRef.current.x * nx + velRef.current.y * ny;
            if (dot < 0) {
              velRef.current.x = (velRef.current.x - 2 * dot * nx) * 1.1; // Boost
              velRef.current.y = (velRef.current.y - 2 * dot * ny) * 1.1; // Boost

              // Trigger stamp hit
              onStampHit(stamp.id, stamp.x, stamp.y);
            }
            break; // Only hit one stamp per frame
          }
        }
      }

      posRef.current.x = nextX;
      posRef.current.y = nextY;

      // Check out of bounds (respawn)
      const viewportBottomWorldY = (window.innerHeight - viewRef.current.y) / viewRef.current.scale;
      if (posRef.current.y > viewportBottomWorldY + 500) {
        const centerWorldX = (window.innerWidth / 2 - viewRef.current.x) / viewRef.current.scale;
        const centerWorldY = (window.innerHeight / 2 - viewRef.current.y) / viewRef.current.scale;
        posRef.current = { x: centerWorldX, y: centerWorldY - 500 };
        velRef.current = { x: (Math.random() - 0.5) * 200, y: 0 };
      }

      setPos({ ...posRef.current });
      requestAnimationFrame(loop);
    };

    const animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      className="bouncy-ball"
      style={{ left: pos.x, top: pos.y }}
    >
      🏀
    </div>
  );
}

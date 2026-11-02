import { useEffect, useRef, useState } from 'react';
import { playBounce, playTreasureFound } from '@/lib/sound';

type Point = { x: number; y: number };
type Stroke = { id: string; points: Point[]; color: string };
type View = { x: number; y: number; scale: number };

export function MiniGolf({
  strokes,
  view,
  shootSequence,
  shootVector
}: {
  strokes: Stroke[],
  view: View,
  shootSequence: number,
  shootVector: Point
}) {
  const [pos, setPos] = useState<Point>({ x: 0, y: 0 });
  const [hole, setHole] = useState<Point>({ x: 200, y: -200 });
  const [score, setScore] = useState(0);
  const [shots, setShots] = useState(0);

  const posRef = useRef<Point>({ x: 0, y: 0 });
  const velRef = useRef<Point>({ x: 0, y: 0 });
  const lastTimeRef = useRef<number>(0);
  const strokesRef = useRef<Stroke[]>(strokes);
  const viewRef = useRef<View>(view);
  const lastShootSequence = useRef<number>(shootSequence);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // Handle shooting
  useEffect(() => {
    if (shootSequence > lastShootSequence.current) {
      // Add velocity based on the drag vector
      velRef.current = { x: shootVector.x, y: shootVector.y };
      lastShootSequence.current = shootSequence;
      setShots(s => s + 1);
    }
  }, [shootSequence, shootVector]);

  useEffect(() => {
    // Reset position initially based on viewport center
    const centerWorldX = (window.innerWidth / 2 - viewRef.current.x) / viewRef.current.scale;
    const centerWorldY = (window.innerHeight / 2 - viewRef.current.y) / viewRef.current.scale;

    // Only init once if it's the very first load
    if (posRef.current.x === 0 && posRef.current.y === 0) {
      posRef.current = { x: centerWorldX, y: centerWorldY };
      // Spawn initial hole nearby
      const angle = Math.random() * Math.PI * 2;
      const dist = 300 + Math.random() * 400;
      setHole({
        x: centerWorldX + Math.cos(angle) * dist,
        y: centerWorldY + Math.sin(angle) * dist
      });
      setPos({ ...posRef.current });
    }

    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (dt > 0.1) {
        requestAnimationFrame(loop);
        return;
      }

      const friction = 800; // Friction deceleration
      const radius = 10;
      const holeRadius = 25;

      // Apply friction
      const speed = Math.hypot(velRef.current.x, velRef.current.y);
      if (speed > 0) {
        const deceleration = friction * dt;
        if (speed <= deceleration) {
          velRef.current = { x: 0, y: 0 };
        } else {
          const ratio = (speed - deceleration) / speed;
          velRef.current.x *= ratio;
          velRef.current.y *= ratio;
        }
      }

      let nextX = posRef.current.x + velRef.current.x * dt;
      let nextY = posRef.current.y + velRef.current.y * dt;

      // Collision detection with strokes
      let hasCollided = false;
      const bounceRestitution = 0.7; // Energy kept after bounce

      if (speed > 5) {
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

            if (dist < radius + 4) { // Add stroke width
              hasCollided = true;
              let nx = (nextX - closestX) / dist;
              let ny = (nextY - closestY) / dist;

              nextX = closestX + nx * (radius + 4);
              nextY = closestY + ny * (radius + 4);

              const dot = velRef.current.x * nx + velRef.current.y * ny;

              if (dot < 0) {
                velRef.current.x = (velRef.current.x - 2 * dot * nx) * bounceRestitution;
                velRef.current.y = (velRef.current.y - 2 * dot * ny) * bounceRestitution;

                const bounceSpeed = Math.hypot(velRef.current.x, velRef.current.y);
                if (bounceSpeed > 50) {
                  playBounce(bounceSpeed, stroke.color);
                }
              }
              break;
            }
          }
        }
      }

      // Check hole collision (only when moving slowly)
      setHole(currentHole => {
        const distToHole = Math.hypot(nextX - currentHole.x, nextY - currentHole.y);
        if (distToHole < holeRadius && speed < 300) {
          // Scored!
          setScore(s => s + 1);
          setShots(0);
          playTreasureFound();

          // Pull into hole
          nextX = currentHole.x;
          nextY = currentHole.y;
          velRef.current = { x: 0, y: 0 };

          // Spawn new hole somewhere else
          const angle = Math.random() * Math.PI * 2;
          const dist = 300 + Math.random() * 800;
          return {
            x: currentHole.x + Math.cos(angle) * dist,
            y: currentHole.y + Math.sin(angle) * dist
          };
        }
        return currentHole;
      });


      posRef.current.x = nextX;
      posRef.current.y = nextY;
      setPos({ ...posRef.current });

      requestAnimationFrame(loop);
    };

    const animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <>
      <div
        className="golf-hole"
        style={{
          position: 'absolute',
          left: hole.x,
          top: hole.y,
          width: 50,
          height: 50,
          marginLeft: -25,
          marginTop: -25,
          backgroundColor: '#27272a',
          borderRadius: '50%',
          boxShadow: 'inset 0 10px 15px -3px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #52525b'
        }}
      >
         <div style={{
           position: 'absolute',
           bottom: 10,
           width: 4,
           height: 40,
           backgroundColor: '#facc15',
           borderRadius: 2
         }}>
           <div style={{
             position: 'absolute',
             top: 0,
             right: 0,
             width: 25,
             height: 15,
             backgroundColor: '#ef4444',
             borderBottomRightRadius: 4,
             borderTopRightRadius: 4
           }} />
         </div>
      </div>
      <div
        className="golf-ball"
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          width: 20,
          height: 20,
          marginLeft: -10,
          marginTop: -10,
          backgroundColor: '#ffffff',
          borderRadius: '50%',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2), inset -2px -2px 5px rgba(0,0,0,0.1)',
          zIndex: 10
        }}
      />
      <div style={{
        position: 'fixed',
        top: 20,
        right: 20,
        background: 'var(--card)',
        padding: '10px 20px',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        fontWeight: 'bold',
        zIndex: 50,
        pointerEvents: 'none'
      }}>
        高尔夫 ⛳ {score} 洞 | {shots} 杆
      </div>
    </>
  );
}

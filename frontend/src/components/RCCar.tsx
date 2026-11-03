import { useEffect, useRef, useState } from 'react';
import { Car } from 'lucide-react';
import { playBounce } from '@/lib/sound';

type Point = { x: number; y: number };
type Stroke = { id: string; points: Point[]; color: string; type?: 'vine' | 'spray' };
type View = { x: number; y: number; scale: number };

export function RCCar({
  view,
  strokes,
  stamps,
  pointerWorldPosRef,
  isDragging,
  onStampHit
}: {
  view: View,
  strokes: Stroke[],
  stamps: { id: string; x: number; y: number; emoji: string }[],
  pointerWorldPosRef: React.MutableRefObject<{ x: number; y: number } | null>,
  isDragging: boolean,
  onStampHit: (id: string, x: number, y: number) => void
}) {
  const [pos, setPos] = useState<Point>({ x: 0, y: 0 });
  const [angle, setAngle] = useState(0);

  const posRef = useRef<Point>({ x: 0, y: 0 });
  const velRef = useRef<number>(0);
  const angleRef = useRef<number>(0);

  const lastTimeRef = useRef<number>(0);
  const keysRef = useRef<{ [key: string]: boolean }>({});

  const strokesRef = useRef<Stroke[]>(strokes);
  const stampsRef = useRef<{ id: string; x: number; y: number; emoji: string }[]>(stamps);
  const viewRef = useRef<View>(view);
  const isDraggingRef = useRef<boolean>(isDragging);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    stampsRef.current = stamps;
  }, [stamps]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    // Initial position setup based on center of view
    if (posRef.current.x === 0 && posRef.current.y === 0) {
      const centerWorldX = (window.innerWidth / 2 - viewRef.current.x) / viewRef.current.scale;
      const centerWorldY = (window.innerHeight / 2 - viewRef.current.y) / viewRef.current.scale;
      posRef.current = { x: centerWorldX, y: centerWorldY };
      setPos({ ...posRef.current });
    }

    const maxSpeed = 600;
    const acceleration = 800;
    const friction = 300;
    const turnSpeed = 4; // Radians per second
    const carRadius = 15;

    let animId: number;

    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (dt > 0.1) {
        animId = requestAnimationFrame(loop);
        return;
      }

      let inputThrust = 0;
      let inputTurn = 0;

      // Keyboard controls
      if (keysRef.current['w'] || keysRef.current['arrowup']) inputThrust += 1;
      if (keysRef.current['s'] || keysRef.current['arrowdown']) inputThrust -= 1;
      if (keysRef.current['a'] || keysRef.current['arrowleft']) inputTurn -= 1;
      if (keysRef.current['d'] || keysRef.current['arrowright']) inputTurn += 1;

      // Pointer drag controls
      if (isDraggingRef.current && pointerWorldPosRef.current) {
        const dx = pointerWorldPosRef.current.x - posRef.current.x;
        const dy = pointerWorldPosRef.current.y - posRef.current.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 30) {
          const targetAngle = Math.atan2(dy, dx);
          let angleDiff = targetAngle - angleRef.current;

          // Normalize angle difference to -PI to PI
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          if (Math.abs(angleDiff) > 0.1) {
            inputTurn = angleDiff > 0 ? 1 : -1;
          }

          // Only thrust if not turning too sharply
          if (Math.abs(angleDiff) < Math.PI / 2) {
            inputThrust = 1;
          }
        }
      }

      // Physics
      if (inputThrust !== 0) {
        velRef.current += inputThrust * acceleration * dt;
        // Turn speed scales with velocity, but allow some turning even at low speeds
        const turnMult = Math.min(1, Math.abs(velRef.current) / 100);
        angleRef.current += inputTurn * turnSpeed * dt * turnMult * (velRef.current < 0 ? -1 : 1);
      } else {
        // Friction
        if (velRef.current > 0) {
          velRef.current = Math.max(0, velRef.current - friction * dt);
        } else if (velRef.current < 0) {
          velRef.current = Math.min(0, velRef.current + friction * dt);
        }
      }

      velRef.current = Math.max(-maxSpeed / 2, Math.min(maxSpeed, velRef.current));

      let nextX = posRef.current.x + Math.cos(angleRef.current) * velRef.current * dt;
      let nextY = posRef.current.y + Math.sin(angleRef.current) * velRef.current * dt;

      // Check collision with strokes
      let hasCollided = false;
      const speed = Math.abs(velRef.current);

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

            if (dist < carRadius + 4) {
              hasCollided = true;
              let nx = (nextX - closestX) / dist;
              let ny = (nextY - closestY) / dist;

              nextX = closestX + nx * (carRadius + 4);
              nextY = closestY + ny * (carRadius + 4);

              // Simple bounce reflection for 1D velocity
              const vx = Math.cos(angleRef.current) * velRef.current;
              const vy = Math.sin(angleRef.current) * velRef.current;

              const dot = vx * nx + vy * ny;

              if (dot < 0) {
                const bounceVx = (vx - 2 * dot * nx) * 0.5; // lose some energy
                const bounceVy = (vy - 2 * dot * ny) * 0.5;

                // Reconstruct velocity and angle from reflected vector
                velRef.current = Math.hypot(bounceVx, bounceVy);
                angleRef.current = Math.atan2(bounceVy, bounceVx);

                if (speed > 100) {
                  playBounce(speed, stroke.color, nx, ny);
                }
              }
              break;
            }
          }
        }
      }

      // Check collision with stamps
      for (const stamp of stampsRef.current) {
         if (Math.hypot(nextX - stamp.x, nextY - stamp.y) < carRadius + 20) { // Stamp hit radius
            onStampHit(stamp.id, stamp.x, stamp.y);
            // Small bump effect
            velRef.current *= 0.9;
         }
      }

      posRef.current.x = nextX;
      posRef.current.y = nextY;

      setPos({ ...posRef.current });
      setAngle(angleRef.current);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [onStampHit]);

  return (
    <>
      <div
        className="rc-car"
        style={{
          position: 'absolute',
          left: pos.x * view.scale + view.x,
          top: pos.y * view.scale + view.y,
          transform: `translate(-50%, -50%) scale(${view.scale}) rotate(${angle}rad)`,
          zIndex: 50,
          pointerEvents: 'none',
          color: '#3b82f6',
          filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.3))'
        }}
        aria-hidden="true"
      >
        <Car size={36} fill="#bfdbfe" />
      </div>
      <div style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--card)',
        padding: '10px 20px',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        fontWeight: 'bold',
        zIndex: 50,
        pointerEvents: 'none'
      }}>
        遥控车 🚗 WASD / 拖拽驾驶
      </div>
    </>
  );
}

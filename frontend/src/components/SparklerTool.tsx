import { useEffect, useRef, useState } from 'react';
import { playBounce } from '@/lib/sound';

type Point = { x: number; y: number };
type Stroke = { id: string; points: Point[]; color: string };
type View = { x: number; y: number; scale: number };
type Drag = { id: number; x: number; y: number; startX: number; startY: number; isDrag: boolean } | null;

type Spark = {
  id: string;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
};

const SPARK_COLORS = ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#fef3c7', '#ef4444'];

export function SparklerTool({ view, dragRef, strokes }: { view: View, dragRef: React.MutableRefObject<Drag>, strokes: Stroke[] }) {
  const [sparks, setSparks] = useState<Spark[]>([]);

  const sparksRef = useRef<Spark[]>([]);
  const lastTimeRef = useRef<number>(0);
  const strokesRef = useRef<Stroke[]>([]);
  const lastBounceSoundRef = useRef<number>(0);

  useEffect(() => { strokesRef.current = strokes; }, [strokes]);
  useEffect(() => { sparksRef.current = sparks; }, [sparks]);

  useEffect(() => {
    let animId: number;
    let spawnAccumulator = 0;

    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (dt > 0.1) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const currentDrag = dragRef.current;
      const newSparks: Spark[] = [];

      // Spawn new sparks if dragging
      if (currentDrag && currentDrag.isDrag) {
        const worldX = (currentDrag.x - view.x) / view.scale;
        const worldY = (currentDrag.y - view.y) / view.scale;

        // Spawn rate: e.g. 100 sparks per second
        spawnAccumulator += dt * 100;

        while (spawnAccumulator >= 1) {
          spawnAccumulator -= 1;
          const angle = Math.random() * Math.PI * 2;
          const speed = 100 + Math.random() * 400;

          newSparks.push({
            id: Math.random().toString(36).slice(2),
            x: worldX,
            y: worldY,
            lastX: worldX,
            lastY: worldY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.5 + Math.random() * 1.5,
            maxLife: 3,
            color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)]
          });
        }
      } else {
        spawnAccumulator = 0;
      }

      const gravity = 800; // px/s^2
      let bounceOccurred = false;

      const updatedSparks = [...sparksRef.current, ...newSparks].map(spark => {
        let nx = spark.x + spark.vx * dt;
        let ny = spark.y + spark.vy * dt;
        let nvx = spark.vx;
        let nvy = spark.vy + gravity * dt;

        let hasBounced = false;

        // Bounding box for movement path to optimize collision
        const minX = Math.min(spark.x, nx) - 5;
        const maxX = Math.max(spark.x, nx) + 5;
        const minY = Math.min(spark.y, ny) - 5;
        const maxY = Math.max(spark.y, ny) + 5;

        for (const stroke of strokesRef.current) {
          for (let i = 0; i < stroke.points.length - 1; i++) {
            const p1 = stroke.points[i];
            const p2 = stroke.points[i+1];

            // Fast bounding box check
            const sMinX = Math.min(p1.x, p2.x);
            const sMaxX = Math.max(p1.x, p2.x);
            const sMinY = Math.min(p1.y, p2.y);
            const sMaxY = Math.max(p1.y, p2.y);

            if (maxX < sMinX || minX > sMaxX || maxY < sMinY || minY > sMaxY) continue;

            // Line segment intersection (spark path vs stroke segment)
            // Using standard line-line intersection
            const den = (spark.x - nx) * (p1.y - p2.y) - (spark.y - ny) * (p1.x - p2.x);
            if (den === 0) continue; // Parallel

            const t = ((spark.x - p1.x) * (p1.y - p2.y) - (spark.y - p1.y) * (p1.x - p2.x)) / den;
            const u = -((spark.x - nx) * (spark.y - p1.y) - (spark.y - ny) * (spark.x - p1.x)) / den;

            if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
              // Intersection found!
              hasBounced = true;
              bounceOccurred = true;

              // Calculate reflection
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const len = Math.hypot(dx, dy);
              if (len > 0) {
                const normalX = -dy / len;
                const normalY = dx / len;

                const dot = nvx * normalX + nvy * normalY;

                // Only reflect if moving towards the segment
                if (dot < 0) {
                   const restitution = 0.5 + Math.random() * 0.3; // Bounciness
                   nvx = (nvx - 2 * dot * normalX) * restitution;
                   nvy = (nvy - 2 * dot * normalY) * restitution;

                   // Add a bit of friction along the tangent
                   const tangentDot = nvx * dx/len + nvy * dy/len;
                   nvx -= tangentDot * (dx/len) * 0.1;
                   nvy -= tangentDot * (dy/len) * 0.1;

                   nx = spark.x + nvx * dt;
                   ny = spark.y + nvy * dt;
                }
              }
              break; // Only bounce off one segment per frame for simplicity
            }
          }
          if (hasBounced) break;
        }

        return {
          ...spark,
          lastX: spark.x,
          lastY: spark.y,
          x: nx,
          y: ny,
          vx: nvx,
          vy: nvy,
          life: spark.life - dt
        };
      }).filter(s => s.life > 0 && s.y < 10000); // Also cull if it falls too far down

      if (bounceOccurred) {
         const now = Date.now();
         if (now - lastBounceSoundRef.current > 100) {
           lastBounceSoundRef.current = now;
           playBounce(800, undefined, undefined, undefined);
         }
      }

      setSparks(updatedSparks);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  if (sparks.length === 0) return null;

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 30 }}>
       {sparks.map(spark => {
          const opacity = Math.min(1, spark.life / 0.5);
          return (
             <line
                key={spark.id}
                x1={spark.lastX}
                y1={spark.lastY}
                x2={spark.x}
                y2={spark.y}
                stroke={spark.color}
                strokeWidth={3}
                strokeLinecap="round"
                opacity={opacity}
                style={{ filter: `drop-shadow(0 0 4px ${spark.color})` }}
             />
          );
       })}
    </svg>
  );
}
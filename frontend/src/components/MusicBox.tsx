import { useEffect, useRef, useState } from 'react';
import { playBounce, playStampPop } from '@/lib/sound';

type Point = { x: number; y: number };
type Stroke = { id: string; points: Point[]; color: string };
type View = { x: number; y: number; scale: number };

export function MusicBox({ strokes, view, stamps }: { strokes: Stroke[], view: View, stamps: { id: string; x: number; y: number; emoji: string }[] }) {
  const [lineX, setLineX] = useState(0);
  const [particles, setParticles] = useState<{ id: string; x: number; y: number; color: string }[]>([]);

  const lineXRef = useRef(0);
  const lastTimeRef = useRef<number>(0);
  const strokesRef = useRef<Stroke[]>(strokes);
  const viewRef = useRef<View>(view);
  const stampsRef = useRef<{ id: string; x: number; y: number; emoji: string }[]>(stamps);
  const lastHitRef = useRef<Record<string, number>>({});

  useEffect(() => { strokesRef.current = strokes; }, [strokes]);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { stampsRef.current = stamps; }, [stamps]);

  useEffect(() => {
    // Start slightly offscreen to the left
    const startX = (0 - viewRef.current.x) / viewRef.current.scale;
    lineXRef.current = startX;

    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (dt > 0.1) {
        requestAnimationFrame(loop);
        return;
      }

      // Sweep speed (pixels per second in screen space, adjusted by scale)
      const sweepSpeed = 200 / viewRef.current.scale;
      const prevX = lineXRef.current;
      lineXRef.current += sweepSpeed * dt;

      // Wrap around if it goes beyond screen
      const screenRight = (window.innerWidth - viewRef.current.x) / viewRef.current.scale;
      if (lineXRef.current > screenRight + 100) {
         lineXRef.current = (0 - viewRef.current.x) / viewRef.current.scale - 100;
      }

      const currentX = lineXRef.current;
      const newParticles: { id: string; x: number; y: number; color: string }[] = [];
      const now = Date.now();

      // Check intersections with strokes
      for (const stroke of strokesRef.current) {
        if (stroke.points.length < 2) continue;

        // Cooldown per stroke so we don't spam hits on the same stroke
        if (lastHitRef.current[stroke.id] && now - lastHitRef.current[stroke.id] < 100) continue;

        let hit = false;
        let hitY = 0;

        for (let i = 0; i < stroke.points.length - 1; i++) {
          const p1 = stroke.points[i];
          const p2 = stroke.points[i+1];

          const minX = Math.min(p1.x, p2.x);
          const maxX = Math.max(p1.x, p2.x);

          // If the line passed through this segment in this frame
          if (prevX <= maxX && currentX >= minX) {
             // Calculate Y at the intersection
             if (p2.x === p1.x) {
               hitY = (p1.y + p2.y) / 2; // Approximation for vertical lines
             } else {
               const t = (currentX - p1.x) / (p2.x - p1.x);
               hitY = p1.y + t * (p2.y - p1.y);
             }
             hit = true;
             break;
          }
        }

        if (hit) {
           lastHitRef.current[stroke.id] = now;

           // Play sound, pitch based on Y position (higher up = higher pitch)
           const screenY = hitY * viewRef.current.scale + viewRef.current.y;
           const normalizedY = Math.max(0, Math.min(1, 1 - (screenY / window.innerHeight))); // 0 to 1

           // map to a fake speed for playBounce (500 to 2000)
           const fakeSpeed = 500 + normalizedY * 1500;
           playBounce(fakeSpeed, stroke.color);

           newParticles.push({
             id: Math.random().toString(36).slice(2),
             x: currentX,
             y: hitY,
             color: stroke.color
           });
        }
      }

      // Check intersections with stamps
      for (const stamp of stampsRef.current) {
         if (lastHitRef.current[stamp.id] && now - lastHitRef.current[stamp.id] < 200) continue;

         if (prevX <= stamp.x && currentX >= stamp.x) {
            lastHitRef.current[stamp.id] = now;
            playStampPop();
            newParticles.push({
              id: Math.random().toString(36).slice(2),
              x: stamp.x,
              y: stamp.y,
              color: '#ffffff'
            });
         }
      }

      if (newParticles.length > 0) {
        setParticles(prev => {
          const next = [...prev, ...newParticles];
          return next.slice(-20); // Keep max 20 particles
        });

        // Schedule cleanup for these specific particles
        setTimeout(() => {
          setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
        }, 500);
      }

      setLineX(currentX);
      requestAnimationFrame(loop);
    };

    const animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <>
      <div
        className="music-sweep-line"
        style={{
          position: 'absolute',
          left: lineX,
          top: (0 - view.y) / view.scale - 1000,
          width: 2 / view.scale,
          height: window.innerHeight / view.scale + 2000,
          backgroundColor: 'var(--primary)',
          opacity: 0.5,
          pointerEvents: 'none',
          zIndex: 40,
          boxShadow: '0 0 10px var(--primary)'
        }}
      />
      {particles.map(p => (
        <div
          key={p.id}
          className="music-hit-particle"
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            backgroundColor: p.color,
            pointerEvents: 'none',
            zIndex: 45
          }}
        />
      ))}
    </>
  );
}

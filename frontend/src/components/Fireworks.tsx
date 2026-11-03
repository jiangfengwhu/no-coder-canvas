import { useEffect, useRef, useState } from 'react';
import { playBounce } from '@/lib/sound';

type View = { x: number; y: number; scale: number };

type FireworkTarget = {
  id: string;
  x: number;
  y: number;
  color: string;
};

type Rocket = {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  color: string;
  exploded: boolean;
};

type Particle = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
};

export function Fireworks({
  fireworks,
  view
}: {
  fireworks: FireworkTarget[];
  view: View;
}) {
  const [rockets, setRockets] = useState<Rocket[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  const rocketsRef = useRef<Rocket[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const processedTargetsRef = useRef<Set<string>>(new Set());
  const viewRef = useRef<View>(view);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // Process new firework targets
  useEffect(() => {
    const newRockets: Rocket[] = [];
    const viewportBottomY = (window.innerHeight - viewRef.current.y) / viewRef.current.scale;

    for (const fw of fireworks) {
      if (!processedTargetsRef.current.has(fw.id)) {
        processedTargetsRef.current.add(fw.id);

        // Rocket starts from the bottom of the screen, straight below the target
        const startX = fw.x;
        const startY = viewportBottomY + 200; // a bit below the screen

        const dx = fw.x - startX;
        const dy = fw.y - startY;
        const dist = Math.hypot(dx, dy);

        const speed = 1000;
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;

        newRockets.push({
          id: fw.id,
          x: startX,
          y: startY,
          targetX: fw.x,
          targetY: fw.y,
          vx,
          vy,
          color: fw.color,
          exploded: false
        });
      }
    }

    if (newRockets.length > 0) {
      rocketsRef.current = [...rocketsRef.current, ...newRockets];
    }
  }, [fireworks]);

  useEffect(() => {
    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (dt > 0.1) {
        requestAnimationFrame(loop);
        return;
      }

      let rocketsChanged = false;
      let particlesChanged = false;

      const currentRockets = [...rocketsRef.current];
      const newParticles: Particle[] = [];

      const activeRockets = currentRockets.filter(rocket => {
        if (rocket.exploded) return false;

        // Move rocket
        rocket.x += rocket.vx * dt;
        rocket.y += rocket.vy * dt;
        rocketsChanged = true;

        // Check if reached target
        // Since it's moving mostly vertically, we can check if it passed the target Y
        const reachedTarget = rocket.vy < 0 ? rocket.y <= rocket.targetY : rocket.y >= rocket.targetY;

        if (reachedTarget) {
          // Explode
          rocket.exploded = true;

          // Play sound
          const speed = 1000;
          playBounce(speed, rocket.color, rocket.x, rocket.y);

          // Create particles
          const numParticles = 40 + Math.random() * 20;
          for (let i = 0; i < numParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 200 + Math.random() * 400;
            newParticles.push({
              id: `${rocket.id}-p-${i}`,
              x: rocket.targetX, // use target exact position
              y: rocket.targetY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color: Math.random() > 0.5 ? rocket.color : '#ffffff',
              life: 1.0 + Math.random() * 0.5,
              maxLife: 1.5
            });
          }
          particlesChanged = true;
          return false; // remove rocket
        }
        return true;
      });

      if (newParticles.length > 0) {
        particlesRef.current = [...particlesRef.current, ...newParticles];
      }

      const activeParticles = particlesRef.current.filter(p => {
        p.life -= dt;
        if (p.life <= 0) return false;

        p.vy += 600 * dt; // gravity
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Add a bit of drag
        p.vx *= 0.95;
        p.vy *= 0.95;

        particlesChanged = true;
        return true;
      });

      if (rocketsChanged || particlesChanged) {
        rocketsRef.current = activeRockets;
        particlesRef.current = activeParticles;

        // Force a re-render
        setRockets([...rocketsRef.current]);
        setParticles([...particlesRef.current]);
      }

      requestAnimationFrame(loop);
    };

    const animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <>
      {rockets.map(r => (
        <div
          key={r.id}
          className="firework-rocket"
          style={{
            position: 'absolute',
            left: r.x * view.scale + view.x,
            top: r.y * view.scale + view.y,
            width: 4 * view.scale,
            height: 16 * view.scale,
            backgroundColor: r.color,
            borderRadius: '2px',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 50,
            boxShadow: `0 0 10px ${r.color}`
          }}
        />
      ))}
      {particles.map(p => {
        const opacity = Math.max(0, p.life / p.maxLife);
        return (
          <div
            key={p.id}
            className="firework-particle"
            style={{
              position: 'absolute',
              left: p.x * view.scale + view.x,
              top: p.y * view.scale + view.y,
              width: 6 * view.scale,
              height: 6 * view.scale,
              backgroundColor: p.color,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              opacity,
              pointerEvents: 'none',
              zIndex: 50,
              boxShadow: `0 0 ${8 * opacity}px ${p.color}`
            }}
          />
        );
      })}
    </>
  );
}

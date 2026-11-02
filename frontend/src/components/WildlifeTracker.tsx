import React, { useEffect, useState, useRef } from 'react';

type View = { x: number; y: number; scale: number };

type Animal = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
};

type Footprint = {
  id: string;
  x: number;
  y: number;
  timestamp: number;
};

const ANIMAL_EMOJIS = ['🦊', '🐰', '🐸', '🦋', '🐢', '🦌', '🦉'];

interface WildlifeTrackerProps {
  view: View;
  onDiscover: (x: number, y: number, emoji: string) => void;
}

export function WildlifeTracker({ view, onDiscover }: WildlifeTrackerProps) {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [footprints, setFootprints] = useState<Footprint[]>([]);

  // Use a ref for state to avoid recreating the interval on every render
  const animalsRef = useRef<Animal[]>([]);
  const footprintsRef = useRef<Footprint[]>([]);
  // Use a ref for onDiscover to avoid dependency issues in useEffect
  const onDiscoverRef = useRef(onDiscover);

  useEffect(() => {
    onDiscoverRef.current = onDiscover;
  }, [onDiscover]);

  useEffect(() => {
    // Initialize animals randomly in a wide area around origin
    const initialAnimals: Animal[] = [];
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const radius = 500 + Math.random() * 4000;
      initialAnimals.push({
        id: `animal-${Math.random().toString(36).slice(2)}`,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 50,
        vy: (Math.random() - 0.5) * 50,
        emoji: ANIMAL_EMOJIS[Math.floor(Math.random() * ANIMAL_EMOJIS.length)]
      });
    }
    animalsRef.current = initialAnimals;
    setAnimals(initialAnimals);

    let lastTick = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const delta = (now - lastTick) / 1000;
      lastTick = now;

      // Update animals
      const newAnimals = animalsRef.current.map(a => {
        // Randomly change direction slightly
        let newVx = a.vx + (Math.random() - 0.5) * 40;
        let newVy = a.vy + (Math.random() - 0.5) * 40;

        // Normalize speed to keep them wandering
        const speed = Math.hypot(newVx, newVy);
        if (speed > 100) {
          newVx = (newVx / speed) * 100;
          newVy = (newVy / speed) * 100;
        }

        return {
          ...a,
          x: a.x + newVx * delta,
          y: a.y + newVy * delta,
          vx: newVx,
          vy: newVy
        };
      });

      // Leave footprints (approx every 0.2 seconds per animal on average)
      if (Math.random() < delta * 5 && newAnimals.length > 0) {
         // pick a random animal to leave a footprint to avoid all leaving at once
         const a = newAnimals[Math.floor(Math.random() * newAnimals.length)];
         if (a) {
             footprintsRef.current.push({
                 id: `fp-${Math.random().toString(36).slice(2)}`,
                 x: a.x,
                 y: a.y,
                 timestamp: now
             });
             // Keep only last 150 footprints
             if (footprintsRef.current.length > 150) {
                 footprintsRef.current.shift();
             }
         }
      }

      // Remove old footprints (> 30s)
      footprintsRef.current = footprintsRef.current.filter(fp => now - fp.timestamp < 30000);

      animalsRef.current = newAnimals;
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    // State update interval for rendering
    const interval = setInterval(() => {
        setAnimals([...animalsRef.current]);
        setFootprints([...footprintsRef.current]);
    }, 250);

    return () => {
      cancelAnimationFrame(frameId);
      clearInterval(interval);
    };
  }, []);

  // Check discovery on view change or interval tick
  useEffect(() => {
    // Current viewport center in world coordinates
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const viewportCenterX = (viewportWidth / 2 - view.x) / view.scale;
    const viewportCenterY = (viewportHeight / 2 - view.y) / view.scale;

    const remainingAnimals = [...animals];
    let discovered = false;

    for (let i = remainingAnimals.length - 1; i >= 0; i--) {
      const a = remainingAnimals[i];
      const dist = Math.hypot(a.x - viewportCenterX, a.y - viewportCenterY);

      // If within 500px of center (so definitely on screen)
      if (dist < 500) {
        onDiscoverRef.current(a.x, a.y, a.emoji);
        remainingAnimals.splice(i, 1);
        discovered = true;
      }
    }

    if (discovered) {
      animalsRef.current = remainingAnimals;
      setAnimals(remainingAnimals);
    }
  }, [view.x, view.y, view.scale, animals]);

  return (
    <>
      {footprints.map(fp => {
        // Calculate opacity based on age (max 30s)
        const age = performance.now() - fp.timestamp;
        const opacity = Math.max(0, 1 - age / 30000) * 0.6; // Max 0.6 opacity

        return (
          <div
            key={fp.id}
            className="footprint"
            style={{
              position: 'absolute',
              left: fp.x,
              top: fp.y,
              opacity,
              fontSize: '24px',
              pointerEvents: 'none',
              transform: 'translate(-50%, -50%)',
              transition: 'opacity 0.2s linear'
            }}
            aria-hidden="true"
          >
            🐾
          </div>
        );
      })}
    </>
  );
}

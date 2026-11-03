import React, { useEffect, useRef, useState } from 'react';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react';

type DiceTarget = {
  id: string;
  x: number;
  y: number;
};

type DiceObj = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  value: number; // 1-6
  life: number;
  maxLife: number;
  settled: boolean;
};

interface DiceRollerProps {
  diceTargets: DiceTarget[];
}

const DICE_ICONS = [Dice1, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6]; // 1-indexed

export function DiceRoller({ diceTargets }: DiceRollerProps) {
  const [dices, setDices] = useState<DiceObj[]>([]);
  const lastTimeRef = useRef<number>(0);
  const dicesRef = useRef<DiceObj[]>([]);
  const targetsProcessedRef = useRef<Set<string>>(new Set());

  // Spawn new dice when diceTargets update
  useEffect(() => {
    const newTargets = diceTargets.filter(t => !targetsProcessedRef.current.has(t.id));
    if (newTargets.length === 0) return;

    newTargets.forEach(t => {
      targetsProcessedRef.current.add(t.id);

      const numDiceToSpawn = Math.floor(Math.random() * 2) + 1; // 1 or 2 dice per click
      const newDices: DiceObj[] = [];
      for (let i = 0; i < numDiceToSpawn; i++) {
        newDices.push({
          id: Math.random().toString(36).slice(2),
          x: t.x + (Math.random() - 0.5) * 40,
          y: t.y + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 1500, // speed
          vy: (Math.random() - 0.5) * 1500 - 500, // slightly upward
          angle: Math.random() * 360,
          vAngle: (Math.random() - 0.5) * 1000,
          value: Math.floor(Math.random() * 6) + 1,
          life: 0,
          maxLife: 1.5 + Math.random() * 1.5, // 1.5 to 3 seconds of rolling
          settled: false
        });
      }
      dicesRef.current = [...dicesRef.current, ...newDices];
    });

    setDices([...dicesRef.current]);
  }, [diceTargets]);

  // Clean up if targets are cleared
  useEffect(() => {
    if (diceTargets.length === 0) {
      dicesRef.current = [];
      targetsProcessedRef.current.clear();
      setDices([]);
    }
  }, [diceTargets]);

  useEffect(() => {
    let animationFrameId: number;

    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      let changed = false;
      const currentDices = dicesRef.current;
      const nextDices = currentDices.map(dice => {
        if (dice.settled) return dice;

        changed = true;
        let { x, y, vx, vy, angle, vAngle, life, maxLife, value } = dice;

        life += dt;

        // Apply friction
        vx *= 0.95;
        vy *= 0.95;
        vAngle *= 0.95;

        // Apply slight gravity
        vy += 800 * dt;

        x += vx * dt;
        y += vy * dt;
        angle += vAngle * dt;

        // Bounce off screen edges
        const padding = 30;
        if (x < padding) {
          x = padding;
          vx *= -0.7;
          vAngle += (Math.random() - 0.5) * 500;
        } else if (x > window.innerWidth - padding) {
          x = window.innerWidth - padding;
          vx *= -0.7;
          vAngle += (Math.random() - 0.5) * 500;
        }

        if (y < padding) {
          y = padding;
          vy *= -0.7;
        } else if (y > window.innerHeight - padding) {
          y = window.innerHeight - padding;
          vy *= -0.7;
          // Friction on ground bounce
          vx *= 0.8;
          vAngle += (Math.random() - 0.5) * 500;
        }

        // Randomize face while tumbling
        if (life < maxLife - 0.5 && Math.random() < 0.2) {
          value = Math.floor(Math.random() * 6) + 1;
        }

        let settled = false;
        if (life >= maxLife || (Math.abs(vx) < 10 && Math.abs(vy) < 10 && y > window.innerHeight - padding - 10)) {
          settled = true;
          // Pick a final integer angle
          angle = Math.round(angle / 90) * 90 + (Math.random() * 10 - 5);
        }

        return { ...dice, x, y, vx, vy, angle, vAngle, life, value, settled };
      });

      if (changed) {
        dicesRef.current = nextDices;
        setDices([...nextDices]);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <>
      {dices.map(dice => {
        const Icon = DICE_ICONS[dice.value] || Dice1;
        return (
          <div
            key={dice.id}
            style={{
              position: 'absolute',
              left: dice.x,
              top: dice.y,
              transform: `translate(-50%, -50%) rotate(${dice.angle}deg)`,
              pointerEvents: 'none',
              zIndex: 50,
            }}
            className="flex items-center justify-center bg-white rounded-xl shadow-lg border-2 border-gray-200 text-gray-800 p-2"
          >
            <Icon size={40} strokeWidth={1.5} />
          </div>
        );
      })}
    </>
  );
}

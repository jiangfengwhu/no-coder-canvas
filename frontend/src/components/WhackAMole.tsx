import { useEffect, useRef, useState } from 'react';
import { playStampPop, playStampPlace, playBounce } from '@/lib/sound';

type View = { x: number; y: number; scale: number };
type Drag = { id: number; x: number; y: number; startX: number; startY: number; isDrag: boolean } | null;

type Mole = {
  id: string;
  x: number;
  y: number;
  emoji: string;
  type: 'mole' | 'bomb';
  whacked: boolean;
  spawnTime: number;
  lifeTime: number;
};

const MOLES = ['🐹', '🐭', '🐰', '🦝'];
const BOMBS = ['💣'];

export function WhackAMole({ view, dragRef }: { view: View, dragRef: React.MutableRefObject<Drag> }) {
  const [moles, setMoles] = useState<Mole[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [hitEffects, setHitEffects] = useState<{ id: string; x: number; y: number; text: string; color: string }[]>([]);

  const molesRef = useRef<Mole[]>([]);
  useEffect(() => { molesRef.current = moles; }, [moles]);

  const scoreRef = useRef(score);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const restart = () => {
    setScore(0);
    setLives(3);
    setGameOver(false);
    setMoles([]);
    setHitEffects([]);
  };

  useEffect(() => {
    if (gameOver) return;

    let animId: number;

    const loop = () => {
      const now = Date.now();

      // Check clicks
      const currentDrag = dragRef.current;
      if (currentDrag && !currentDrag.isDrag) {
        // Find if we clicked any mole
        const clickWorldX = (currentDrag.x - view.x) / view.scale;
        const clickWorldY = (currentDrag.y - view.y) / view.scale;

        let hitMoleId: string | null = null;
        let nextMoles = [...molesRef.current];

        for (let i = 0; i < nextMoles.length; i++) {
          const mole = nextMoles[i];
          if (mole.whacked) continue;

          // Mole radius is ~40px
          const dist = Math.hypot(mole.x - clickWorldX, mole.y - clickWorldY);
          if (dist < 50) {
            nextMoles[i] = { ...mole, whacked: true };
            hitMoleId = mole.id;

            if (mole.type === 'mole') {
              setScore(s => s + 10);
              playStampPop();
              setHitEffects(prev => [...prev, { id: Math.random().toString(36).slice(2), x: mole.x, y: mole.y, text: '+10', color: '#22c55e' }]);
            } else if (mole.type === 'bomb') {
              playStampPlace();
              setHitEffects(prev => [...prev, { id: Math.random().toString(36).slice(2), x: mole.x, y: mole.y, text: '💥', color: '#ef4444' }]);
              setLives(l => {
                const updatedLives = Math.max(0, l - 1);
                if (updatedLives === 0) setGameOver(true);
                return updatedLives;
              });
            }
            // Consume the click so we don't hit multiple overlapping ones or re-hit next frame
            dragRef.current = null;
            break;
          }
        }

        if (hitMoleId) {
          setMoles(nextMoles);
        }
      }

      // Despawn expired moles
      let changed = false;
      const nextMoles = molesRef.current.map(mole => {
        if (!mole.whacked && now - mole.spawnTime > mole.lifeTime) {
          changed = true;
          return { ...mole, whacked: true }; // technically escaped, but we use whacked to despawn
        }
        return mole;
      }).filter(m => !m.whacked || now - m.spawnTime < m.lifeTime + 500); // Keep whacked/escaped around for a split second for animation?

      if (changed) {
         // setMoles(nextMoles.filter(m => !m.whacked)); // Just remove them immediately if escaped
         setMoles(nextMoles.filter(m => now - m.spawnTime <= m.lifeTime && !m.whacked));
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameOver, view, dragRef]);

  // Spawning logic
  useEffect(() => {
    if (gameOver) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const spawn = () => {
      if (document.hidden) {
        timeoutId = setTimeout(spawn, 1000);
        return;
      }

      // Only spawn if less than 5 active moles
      if (molesRef.current.length < 5) {
        const isBomb = Math.random() < 0.2;
        const emoji = isBomb ? BOMBS[0] : MOLES[Math.floor(Math.random() * MOLES.length)];

        // Spawn within current viewport
        const padding = 100;
        const viewportWidthWorld = window.innerWidth / view.scale;
        const viewportHeightWorld = window.innerHeight / view.scale;
        const startX = -view.x / view.scale + padding + Math.random() * (viewportWidthWorld - padding * 2);
        const startY = -view.y / view.scale + padding + Math.random() * (viewportHeightWorld - padding * 2);

        const newMole: Mole = {
          id: Math.random().toString(36).slice(2),
          x: startX,
          y: startY,
          emoji,
          type: isBomb ? 'bomb' : 'mole',
          whacked: false,
          spawnTime: Date.now(),
          lifeTime: Math.max(800, 2000 - scoreRef.current * 10) // Gets faster as score increases
        };

        setMoles(prev => [...prev, newMole]);
        playBounce(300, '#a855f7'); // small spawn sound
      }

      const nextInterval = Math.max(400, 1000 - scoreRef.current * 5);
      timeoutId = setTimeout(spawn, nextInterval);
    };

    timeoutId = setTimeout(spawn, 1000);

    return () => clearTimeout(timeoutId);
  }, [gameOver, view]);

  // Hit effects cleanup
  useEffect(() => {
    if (hitEffects.length > 0) {
      const timer = setTimeout(() => {
        setHitEffects(prev => prev.slice(1));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hitEffects]);


  return (
    <>
      <div style={{ position: 'fixed', top: 20, left: 20, zIndex: 100, background: 'var(--card)', color: 'var(--foreground)', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: '20px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        打地鼠 🔨 {score} | 生命 {'❤️'.repeat(lives)}
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

      {/* Note: Moles are drawn in world coordinates, we need to transform them to screen or render them inside the world container. Since this component is likely rendered inside the main <main> and not the world <svg> container (based on FruitNinja), we render them fixed on screen and calculate their screen positions. FruitNinja renders them fixed using world coordinates directly? Wait, FruitNinja renders them fixed using their `x` and `y` which are actually screen coordinates in FruitNinja (startX = window.innerWidth). Ah! But here we want them attached to the world so we can pan around. So we need to calculate screen coordinates based on view, or render them inside the world container. Wait, if we return them normally, they are fixed. Let's render them relative to the world by transforming them. */}
      {moles.map(mole => {
        const screenX = mole.x * view.scale + view.x;
        const screenY = mole.y * view.scale + view.y;

        // Only render if on screen (roughly)
        if (screenX < -100 || screenX > window.innerWidth + 100 || screenY < -100 || screenY > window.innerHeight + 100) return null;

        const age = Date.now() - mole.spawnTime;
        const progress = age / mole.lifeTime;
        let scale = 1;
        if (progress < 0.1) scale = progress / 0.1; // pop up
        else if (progress > 0.9) scale = (1 - progress) / 0.1; // hide

        return (
          <div key={mole.id} style={{
            position: 'fixed',
            left: screenX,
            top: screenY,
            fontSize: `${60 * view.scale}px`,
            transform: `translate(-50%, -50%) scale(${scale})`,
            pointerEvents: 'none',
            zIndex: 90,
            transition: 'transform 0.1s ease-out'
          }}>
            {mole.emoji}
          </div>
        );
      })}

      {hitEffects.map(effect => {
         const screenX = effect.x * view.scale + view.x;
         const screenY = effect.y * view.scale + view.y;
         return (
          <div key={effect.id} style={{
            position: 'fixed',
            left: screenX,
            top: screenY - 30, // move up a bit
            fontSize: `${30 * view.scale}px`,
            color: effect.color,
            fontWeight: 'bold',
            transform: `translate(-50%, -50%)`,
            pointerEvents: 'none',
            zIndex: 95,
            animation: 'floatUp 0.5s ease-out forwards'
          }}>
            {effect.text}
          </div>
        );
      })}

      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, calc(-50% - 50px)) scale(1.5); }
        }
      `}</style>
    </>
  );
}

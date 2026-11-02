import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Bird, Leaf, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
const phrases = ['啾！今天想在画板上留下什么？', '双击空白处，试试盖个图章。', '拖动画板，我陪你四处看看。', '有新点子？去左下角告诉大家。'];
export function ParrotApp() {
  const [hidden, setHidden] = useState(false);
  const [mood, setMood] = useState('idle');
  const [message, setMessage] = useState('');
  const [look, setLook] = useState(0);
  const next = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  function interact(feed = false) {
    clearTimeout(timer.current);
    setMood(feed ? 'snack' : 'happy');
    setMessage(feed ? '咔嚓……再来一粒？' : phrases[next.current++ % phrases.length]);
    timer.current = setTimeout(() => { setMood('idle'); setMessage(''); }, 4200);
  }
  if (hidden) return <Button variant="outline" size="icon-sm" className="parrot-return" aria-label="叫回鹦鹉" onClick={() => setHidden(false)}><Bird /></Button>;
  return <aside className={`parrot-companion ${mood}`} aria-label="画板鹦鹉" style={{ '--parrot-look': `${look}deg` } as CSSProperties} onPointerMove={event => { const box = event.currentTarget.getBoundingClientRect(); setLook(Math.max(-9, Math.min(9, (event.clientX - box.left - box.width / 2) / 8))); }} onPointerLeave={() => setLook(0)}>
    <div role="status" aria-live="polite" className={`parrot-bubble ${message ? 'visible' : ''}`}>{message}</div>
    <Button variant="ghost" className="parrot-body" aria-label="逗一逗鹦鹉" onClick={() => interact()}>
      <svg className="parrot-art size-auto" viewBox="0 0 160 200" aria-hidden="true">
        <ellipse cx="81" cy="184" rx="45" ry="4" fill="currentColor" opacity=".07" />
        <path d="M28 173q53-8 103 0" fill="none" stroke="#ab967c" strokeWidth="7" strokeLinecap="round" />
        <path d="m122 173 9-9" stroke="#ab967c" strokeWidth="3" strokeLinecap="round" />
        <g className="parrot-bird">
          <path d="m67 119 1 63 13-16 11 18-3-66" fill="#326858" />
          <path d="m75 131 4 40 5-32" fill="#6b9c78" />
          <ellipse cx="78" cy="112" rx="32" ry="45" fill="#6b9e76" />
          <path d="M69 78q-22 33-9 64 26 8 33-14 5-27-6-46" fill="#83b38a" />
          <g className="parrot-wing"><path d="M51 94q-19 36 7 64 21-9 20-47-5-18-27-17" fill="#417965" /><path d="m53 108 7 34m1-35 7 30m0-27 5 15" stroke="#649982" strokeWidth="2" strokeLinecap="round" /></g>
          <g className="parrot-head">
            <path d="M60 51q-3-26 20-27 24-2 29 24 1 24-17 38-31 1-32-35" fill="#83b38a" />
            <path d="M73 29q7-12 18-10l-2 9" fill="#83b38a" />
            <path d="M92 44q16-1 16 15-1 14-15 15-14-3-10-15" fill="#dce5b8" />
            <path d="M105 48q25 2 15 26-2-13-14-13" fill="#c97859" /><path d="M107 62q12-2 9 12l-9-5" fill="#704d44" />
            <g className="parrot-eye"><circle cx="96" cy="49" r="5" fill="#f2efe1" /><circle cx="97" cy="49" r="2.8" fill="#273b35" /><circle cx="98" cy="48" r=".9" fill="white" /></g>
            <path d="M68 76q15 13 30-2" fill="none" stroke="#3a6456" strokeWidth="3" strokeLinecap="round" /><path d="M72 81q11 7 21-1" fill="none" stroke="#bf8c79" strokeWidth="2" />
          </g>
          <path d="m66 158 1 13-7 1m8-1 6 2m13-16-1 14 7 1m-7-1-5 2" fill="none" stroke="#6d655a" strokeWidth="3" strokeLinecap="round" />
        </g>
        {mood === 'snack' && <g className="parrot-seed"><ellipse cx="124" cy="93" rx="4" ry="6" fill="#c6a36b" transform="rotate(25 124 93)" /></g>}
      </svg>
    </Button>
    <div className="parrot-actions" aria-label="鹦鹉互动">
      <Button variant="ghost" size="icon-sm" aria-label="和鹦鹉说话" title="说话" onClick={() => interact()}><MessageCircle /></Button>
      <Button variant="ghost" size="icon-sm" aria-label="喂鹦鹉一粒种子" title="喂食" onClick={() => interact(true)}><Leaf /></Button>
      <Button variant="ghost" size="icon-sm" aria-label="收起鹦鹉" title="收起" onClick={() => { clearTimeout(timer.current); setHidden(true); setMood('idle'); setMessage(''); }}><X /></Button>
    </div>
  </aside>;
}

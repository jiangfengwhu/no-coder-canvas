import { useState } from 'react';
import { Button } from '@/components/ui/button';
const messages = ['你好，我是画板上的鹦鹉。', '拖动画板，可以四处看看。', '点击左下角的入口，可以提交你的创意。', '队列会依次实现大家的需求。'];
export function ParrotApp() {
  const [index, setIndex] = useState(0);
  return <Button id="parrot-app-container" variant="outline" className="fixed right-6 bottom-24 z-20 h-auto max-w-[calc(100vw-3rem)] gap-3 bg-card p-3 text-left whitespace-normal" onClick={() => setIndex(previous => (previous + 1 + Math.floor(Math.random() * (messages.length - 1))) % messages.length)} aria-label="和鹦鹉聊天">
    <img src="/parrot.svg" alt="" width="40" height="48" className="shrink-0" />
    <span role="status" className="text-sm">{messages[index]}</span>
  </Button>;
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from './Canvas';
import './styles.css';
createRoot(document.getElementById('root')!, { onUncaughtError(error) { window.dispatchEvent(new ErrorEvent('error', { message: error instanceof Error ? error.message : 'React rendering failed', error })); } }).render(<StrictMode><Canvas /></StrictMode>);


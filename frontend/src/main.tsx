import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from './Canvas';
import './styles.css';
createRoot(document.getElementById('root')!).render(<StrictMode><Canvas /></StrictMode>);

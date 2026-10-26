import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA Android installation
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('AH NYI PWA update ready');
  },
  onOfflineReady() {
    console.log('AH NYI PWA offline ready');
  },
});

createRoot(document.getElementById('root')!).render(<App />);

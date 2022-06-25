import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import ColorTimer from './ColorTimer';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <StrictMode>
    <ColorTimer />
  </StrictMode>
);

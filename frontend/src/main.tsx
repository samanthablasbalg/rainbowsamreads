import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './app/provider';
import { Session } from './app/session';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <h1>Rainbow Sam Reads</h1>
      <Session />
    </AppProvider>
  </StrictMode>
);

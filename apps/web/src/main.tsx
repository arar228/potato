import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { bootstrapTelegram } from './app/telegram';
import { useSessionStore } from './app/session.store';
import './styles.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/components.css';
import './features/profile/profile.css';
import './features/games/solo.css';

const session = await bootstrapTelegram();
useSessionStore.getState().setTelegramSession(session.initData, session.sdkAvailable);

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

const root = document.getElementById('root');
if (root === null) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);

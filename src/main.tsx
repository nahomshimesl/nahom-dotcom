import {StrictMode, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import SystemBoot from './components/SystemBoot.tsx';
import './index.css';

function Root() {
  // ?showBoot=1 forces the boot screen to display even if a previous session
  // already cached `boss_booted` in sessionStorage (handy for verifying the
  // boot UI on mobile without opening a fresh tab).
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  if (typeof window !== 'undefined' && params.has('showBoot')) {
    try { window.sessionStorage.removeItem('boss_booted'); } catch {}
  }
  const skipBoot =
    typeof window !== 'undefined' &&
    !params.has('showBoot') &&
    (params.has('skipBoot') ||
      window.sessionStorage.getItem('boss_booted') === '1');
  const [booted, setBooted] = useState(skipBoot);
  return (
    <ErrorBoundary>
      {!booted && (
        <SystemBoot
          onComplete={() => {
            try { window.sessionStorage.setItem('boss_booted', '1'); } catch {}
            setBooted(true);
          }}
        />
      )}
      <App />
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

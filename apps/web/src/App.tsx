import { useEffect, useState } from 'react';
import { AppRoutes } from './routes';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    useAuthStore.getState().loadFromStorage();
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <>
      <AppRoutes />
      <Toaster position="top-right" richColors />
    </>
  );
}

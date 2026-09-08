import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistentOnboarding } from '@/components/onboarding/PersistentOnboarding';
const w = window as unknown as { entered?: string; mount: () => void; unmount: () => void };
w.mount = () => {
 const root = createRoot(document.getElementById('root')!);
 const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
 root.render(<QueryClientProvider client={client}><PersistentOnboarding onEnterTenant={id => { w.entered = id; }} /></QueryClientProvider>);
 w.unmount=()=>{ root.unmount();client.clear(); };
};
w.mount();

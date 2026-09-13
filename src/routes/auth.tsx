import { createFileRoute } from '@tanstack/react-router';
import { AuthPage } from '@/components/auth/AuthPage';

export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [
    { title: 'Acesso à plataforma — REAL ONE' },
    { name: 'robots', content: 'noindex' },
  ] }),
  component: AuthPage,
});

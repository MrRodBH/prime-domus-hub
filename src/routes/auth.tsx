import { createFileRoute } from '@tanstack/react-router';
import { AuthPage } from '@/components/auth/AuthPage';

export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [
    { title: 'Acesso à plataforma — RM Prime SaaS' },
    { name: 'robots', content: 'noindex' },
  ] }),
  component: AuthPage,
});

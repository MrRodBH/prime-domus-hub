import type { ReactNode } from "react";
const navigate = (value: unknown) => {
  (window as any).__authFixture.navigation.push(value);
  return Promise.resolve();
};
export const useNavigate = () => navigate;
export const createFileRoute = () => (options: any) => ({ options });
export const Link = ({
  to,
  children,
  ...props
}: {
  to: string;
  children: ReactNode;
  [key: string]: any;
}) => (
  <a href={to} {...props}>
    {children}
  </a>
);

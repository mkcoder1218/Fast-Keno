import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../index.css';

export const metadata: Metadata = {
  title: 'Fast Keno',
  description: 'Fast Keno sportsbook client',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

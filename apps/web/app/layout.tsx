import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VNO → KUN Nukreipimai',
  description: 'Realaus laiko skrydžių nukreipimų stebėjimas iš Vilniaus į Kauną',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lt">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'إدارة أصلي | Asly Coffee',
  description: 'لوحة إدارة طلبات أصلي للقهوة المختصة',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
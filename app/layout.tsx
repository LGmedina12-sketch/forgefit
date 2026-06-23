import type { Metadata, Viewport } from 'next';
import OwnerTab from '@/components/OwnerTab';
import ProfileGate from '@/components/ProfileGate';
import CoachProfileTab from '@/components/CoachProfileTab';
import './globals.css';

export const metadata: Metadata = {
  title: 'ForgeFit',
  description: 'Adaptive strength, conditioning, and mobility training.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#080a0f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ProfileGate />
        {children}
        <CoachProfileTab />
        <OwnerTab />
      </body>
    </html>
  );
}

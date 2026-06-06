import './globals.css';
import { SiteFooter } from './components/SiteFooter';

export const metadata = {
  title: 'AlgoStories',
  description: 'Public algorithm registry and community stories',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}

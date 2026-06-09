import './globals.css';
import { I18nProvider } from './components/I18nProvider';
import { SiteFooter } from './components/SiteFooter';

export const metadata = {
  title: 'AlgoStories',
  description: 'Public algorithm registry and community stories',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <I18nProvider>
          {children}
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}

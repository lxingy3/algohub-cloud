import './globals.css';

export const metadata = {
  title: 'AlgoHub',
  description: 'Public algorithm registry and community stories',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

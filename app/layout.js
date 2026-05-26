import '../src/index.css';

export const metadata = {
  title: 'AlgoHub',
  description: 'AlgoHub database-backed platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Pet Pooja - AI-Powered Smart Kitchen & Waste Minimizer',
  description: 'Reduce waste and increase profits with our AI-driven kitchen management system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 overflow-x-hidden`}>
        <Toaster position="top-center" />
        <main>{children}</main>
      </body>
    </html>
  );
}
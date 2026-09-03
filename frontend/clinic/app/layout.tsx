import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/clinic/Header';
import { Footer } from '@/components/clinic/Footer';

export const metadata: Metadata = {
  title: 'Phòng khám YG · Trợ lý sức khỏe thông minh',
  description:
    'Trợ lý AI hỗ trợ phân loại triệu chứng, định hướng chuyên khoa và kết nối lịch khám tại Phòng khám YG.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className="min-h-screen flex flex-col bg-paper text-ink antialiased font-sans"
        suppressHydrationWarning
      >
        <a className="skip-link" href="#main-content">
          Bỏ qua tới nội dung chính
        </a>
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

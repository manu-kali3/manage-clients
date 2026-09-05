import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { OfflineBanner, MaintenanceBanner } from "@/components/SystemStatus";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Brevan Softwares Admin",
  description: "Manage events for the Brevan Softwares website.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dbDown = !process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    <html lang="en">
      <body className={inter.variable}>
        <OfflineBanner />
        <MaintenanceBanner isDown={dbDown} />
        {children}</body>
    </html>
  );
}

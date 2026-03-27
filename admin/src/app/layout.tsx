import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "SaloonAI | Admin Dashboard",
  description: "Modern Saloon Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.variable} ${outfit.variable} font-sans bg-[#F8FAFC] text-slate-900 antialiased overflow-x-hidden`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 lg:pl-80 min-h-screen transition-all duration-300">
            <div className="p-4 md:p-8 md:pt-12 max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

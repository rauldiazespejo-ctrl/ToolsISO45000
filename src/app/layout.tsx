import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { APP_PRODUCT_NAME } from "@/lib/product-brand";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${APP_PRODUCT_NAME} | Sistema de Gestión SG-SST — ISO 45001 & DS 44`,
  description: "Automatiza la creación de documentos para el Sistema de Gestión de Seguridad y Salud en el Trabajo conforme a ISO 45001:2018 y Decreto Supremo N° 44/2024 de Chile.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className="dark">
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

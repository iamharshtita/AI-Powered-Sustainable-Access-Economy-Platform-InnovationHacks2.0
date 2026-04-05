import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Navigation from "./components/Navigation";
import ClientLeaves from "./components/ClientLeaves";
import OnboardingGuard from "./components/OnboardingGuard";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "ReEarth | AI-Powered Sustainable Access Economy",
  description:
    "Borrow, buy resale, and avoid unnecessary purchases through AI-driven recommendations and sustainability tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="bg-earth-50 text-earth antialiased min-h-screen relative overflow-x-hidden" suppressHydrationWarning>
        <ClientLeaves />
        <OnboardingGuard />
        <Navigation />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}

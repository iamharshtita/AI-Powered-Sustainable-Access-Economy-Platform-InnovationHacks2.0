import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Navigation from "./components/Navigation";
import ClientLeaves from "./components/ClientLeaves";
import OnboardingGuard from "./components/OnboardingGuard";
import AnimatedBackground from "./components/AnimatedBackground";

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
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className="bg-earth-50 dark:bg-[#060d1f] text-earth dark:text-earth-200 antialiased min-h-screen relative overflow-x-hidden transition-colors duration-500" suppressHydrationWarning>
        <AnimatedBackground />
        <ClientLeaves />
        <OnboardingGuard />
        <Navigation />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}

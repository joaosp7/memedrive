import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "MemeDrive",
  description: "Quick-reference catalog of images and audio from R2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body className="mat-grid min-h-screen bg-mat font-body text-tape antialiased">
        {children}
      </body>
    </html>
  );
}

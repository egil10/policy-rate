import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Policy Rate — Central Bank Dashboard",
  description:
    "Central bank policy rates for ~120 countries with monthly history back to 1945. Hyper-minimal, modern dashboard.",
  openGraph: {
    title: "Policy Rate — Central Bank Dashboard",
    description:
      "Central bank policy rates for ~120 countries with monthly history back to 1945.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="mesh" aria-hidden />
        {children}
      </body>
    </html>
  );
}

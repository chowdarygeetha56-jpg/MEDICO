import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { ConvexProvider } from "@/components/providers/convex-provider";
import "./globals.css";
import "./commerce.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MEDICO | Everyday care, delivered with care",
  description:
    "A simpler way to find everyday medicines and wellness essentials, built around clarity and care.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <ConvexProvider>{children}</ConvexProvider>
      </body>
    </html>
  );
}

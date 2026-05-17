import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PM Exchange",
  description: "Interview practice community for PMs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh" }}>
          {children}
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { VisualEditsMessenger } from "orchids-visual-edits";

export const metadata: Metadata = {
  title: "Alivio – CRM + ATS",
  description: "ATS and CRM for Alivio Search Partners – clients, pipeline, outreach, and recruiting in one place.",
  openGraph: {
    title: "Alivio – CRM + ATS",
    description: "ATS and CRM for Alivio Search Partners – clients, pipeline, outreach, and recruiting in one place.",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <VisualEditsMessenger />
      </body>
    </html>
  );
}

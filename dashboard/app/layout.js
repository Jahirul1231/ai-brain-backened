import "./globals.css";

export const metadata = {
  title: "Reportude AI — Founder Dashboard",
  description: "Manage tenants, tokens, and chat history",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#0f0f0f] text-white min-h-screen">{children}</body>
    </html>
  );
}

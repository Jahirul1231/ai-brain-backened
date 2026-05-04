import "./globals.css";

export const metadata = {
  title: "Reportude — AI-powered Google Sheets intelligence",
  description: "Connect your Google Sheets and let AI agents read, analyse, update, and report on your data — in plain English.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

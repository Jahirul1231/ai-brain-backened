import "./globals.css";

export const metadata = {
  title: "Reportude AI — Client Portal",
  description: "Your AI-powered data dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

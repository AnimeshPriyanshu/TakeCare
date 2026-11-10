import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: {
    default: "TakeCare — Medicine inventory & replenishment",
    template: "%s · TakeCare",
  },
  description:
    "TakeCare helps families track medicine stock with estimated depletion and connects them with registered pharmacies for confirmed replenishment.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

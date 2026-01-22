import ChatWidget from "../components/ChatWidget";
import { Wrapper } from "../Providers/Wrapper";
import "./globals.css";
import { Metadata } from "next";
import { Roboto } from "next/font/google";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "RideEx",
  description: "Your trusted food delivery platform",
  other: {
    "facebook-domain-verification": "hgo5dgli6dij5fvyhqog6fw2fatffg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          name="facebook-domain-verification"
          content="hgo5dgli6dij5fvyhqog6fw2fatffg"
        />
      </head>
      <body className={roboto.className}>
        <Wrapper>
          {children}
          <ChatWidget />
        </Wrapper>
      </body>
    </html>
  );
}

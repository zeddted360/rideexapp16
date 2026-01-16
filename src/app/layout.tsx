import ChatWidget from "../components/ChatWidget";
import { Wrapper } from "../Providers/Wrapper";
import "./globals.css";
import { Metadata } from "next";

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
    <Wrapper>
      {children}
      <ChatWidget />
    </Wrapper>
  );
}

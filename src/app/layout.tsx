import GlobalDataLoader from "@/components/GlobalDataLoader";
import ChatWidget from "../components/ChatWidget";
import { Wrapper } from "../Providers/Wrapper";
import "./globals.css";
import { Metadata } from "next";
import { Roboto } from "next/font/google";
import Offline from "@/components/Offline";
import Script from "next/script";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="facebook-domain-verification"
          content="hgo5dgli6dij5fvyhqog6fw2fatffg"
        />
      </head>
      <body className={`${roboto.className} min-h-screen flex flex-col`}>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-DXJJJXSNDK"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-DXJJJXSNDK');
          `}
        </Script>
        {/* End Google Analytics */}

        {/* Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1887849555235977');
            fbq('track', 'PageView');
          `}
        </Script>
        {/* End Meta Pixel */}

        <Wrapper>
          <GlobalDataLoader />
          {/* <Offline /> */}
          {children}
          <ChatWidget />
        </Wrapper>
      </body>
    </html>
  );
}

"use client"
import { ReactNode } from "react"
import { Toaster } from "react-hot-toast";
import { TranslationProvider } from "./TranslationProvider";
import { _ThemeProvider } from "./ThemeProvider";
import { ShowCartProvider } from "./ShowCartProvider";
import { LanguageProvider } from "../context/languageContext";
import { StoreProvider } from "../state/StoreProvider";
import { AuthProvider } from "../context/authContext";
import { PaymentProvider } from "../context/paymentContext";
import AddToCartModal from "../components/ui/AddToCartModal";
import CartDrawer from "../components/ui/CartDrawer";
import Footer from "../components/Footer";
import MobileNavigation from "../components/ui/MobileNavigation";
import Header from "../components/header";
export const Wrapper = ({ children }: { children: ReactNode }) => {
  return (
      <>
        <Toaster position="top-right" />
        <_ThemeProvider>
          <TranslationProvider>
            <LanguageProvider>
              <StoreProvider>
                <AuthProvider>
                  <PaymentProvider>
                    <ShowCartProvider>
                      <Header />
                      <main className="flex-grow mt-20">
                        <AddToCartModal/>
                        <CartDrawer />
                        {children}
                      </main>
                      <Footer/>
                      <MobileNavigation/>
                    </ShowCartProvider>
                  </PaymentProvider>
                </AuthProvider>
              </StoreProvider>
            </LanguageProvider>
          </TranslationProvider>
        </_ThemeProvider>
      </>
  );
};
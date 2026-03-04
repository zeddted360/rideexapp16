"use client";
import Link from "next/link";
import {
  Instagram,
  Facebook,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Info,
  HelpCircle,
  FileText,
  Cookie,
  Lock,
  UserPlus,
  Bike,
  Twitter,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { ChangeEvent, useState } from "react";
import { databases, validateEnv } from "@/utils/appwrite";
import { ID, Query } from "appwrite";
import toast from "react-hot-toast";
import { useAuth } from "@/context/authContext";
import { useTranslation } from "react-i18next";
import ClientOnly from "./ClientOnly";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated, role } = useAuth();
  const { t } = useTranslation();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setEmailError("");
    setLoading(true);
    try {
      const { newsLetterCollectionId, databaseId } = validateEnv();
      const response = await databases.listDocuments(
        databaseId,
        newsLetterCollectionId,
        [Query.equal("email", email)],
      );
      if (response.documents.length > 0) {
        toast.error("You are already subscribed!");
        setLoading(false);
        return;
      }
      await databases.createDocument(
        databaseId,
        newsLetterCollectionId,
        ID.unique(),
        { email },
      );
      await fetch("/api/newsletter/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      toast.success(
        "Subscribed successfully! Check your email for a welcome message.",
      );
      setEmail("");
    } catch (err) {
      toast.error("Subscription failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientOnly>
      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden pb-20 md:pb-8 text-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-red-500/10 to-pink-500/10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.02)_1px,transparent_0)] bg-[length:20px_20px]"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* ── Main grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
            {/* ── Brand ── */}
            <div className="lg:col-span-3 space-y-6">
              {/* Logo — fixed: explicit size + object-contain so image is never clipped */}
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-orange-500/30 shadow-lg shadow-orange-500/20">
                <Image
                  src="/RideEx_Logo.jpg"
                  alt="RideEx logo"
                  width={100}
                  height={100}
                  priority
                  quality={100}
                  className="w-full h-full"
                />
              </div>

              <p className="text-gray-400 text-sm leading-relaxed">
                {t("footer.brandDescription")}
              </p>

              {/* Contact */}
              <div className="space-y-3">
                {[
                  {
                    Icon: Phone,
                    href: "tel:+2347072087857",
                    text: "+234 707 208 7857",
                  },
                  {
                    Icon: Mail,
                    href: "mailto:support@rideexapp.com?subject=Support Request",
                    text: "support@rideexapp.com",
                  },
                  { Icon: MapPin, href: null, text: "Owerri, Nigeria" },
                ].map(({ Icon, href, text }) => (
                  <div
                    key={text}
                    className="flex items-center gap-3 text-gray-300 group"
                  >
                    <span
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(249,115,22,0.12)" }}
                    >
                      <Icon className="w-3.5 h-3.5 text-orange-400" />
                    </span>
                    {href ? (
                      <Link
                        href={href}
                        className="text-sm hover:text-orange-400 transition-colors duration-200"
                      >
                        {text}
                      </Link>
                    ) : (
                      <span className="text-sm">{text}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Quick Links ── */}
            <div className="lg:col-span-2 space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-orange-400">
                {t("footer.quickLinks")}
              </h3>
              <ul className="space-y-2.5">
                {[
                  {
                    href: "/about-us",
                    label: "About Us",
                    icon: <Info className="w-3.5 h-3.5" />,
                  },
                  {
                    href: "/FAQ",
                    label: "FAQ",
                    icon: <HelpCircle className="w-3.5 h-3.5" />,
                  },
                  {
                    href: "/terms",
                    label: "Terms & Conditions",
                    icon: <FileText className="w-3.5 h-3.5" />,
                  },
                  {
                    href: "/cookies",
                    label: "Cookies",
                    icon: <Cookie className="w-3.5 h-3.5" />,
                  },
                  {
                    href: "/privacy",
                    label: "Privacy Policy",
                    icon: <Lock className="w-3.5 h-3.5" />,
                  },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center gap-2.5 text-gray-400 hover:text-white transition-all duration-200 group"
                    >
                      <span className="text-orange-500/60 group-hover:text-orange-400 transition-colors">
                        {link.icon}
                      </span>
                      <span className="text-sm group-hover:translate-x-0.5 transition-transform duration-200">
                        {link.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Let's Do It Together ── */}
            <div className="lg:col-span-2 space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-orange-400">
                Join Us
              </h3>
              <ul className="space-y-4">
                {[
                  {
                    href: "/vendor/register",
                    label: "Become a Vendor",
                    icon: <UserPlus className="w-4 h-4" />,
                    desc: "Sell on RideEx",
                  },
                  {
                    href: "/become-a-rider",
                    label: "Join as a Rider",
                    icon: <Bike className="w-4 h-4" />,
                    desc: "Deliver with us",
                  },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-start gap-3 p-3 rounded-xl border border-white/5 hover:border-orange-500/30 bg-white/[0.03] hover:bg-orange-500/[0.06] transition-all duration-200 group"
                    >
                      <span
                        className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-orange-400"
                        style={{ background: "rgba(249,115,22,0.12)" }}
                      >
                        {item.icon}
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-white group-hover:text-orange-300 transition-colors">
                          {item.label}
                        </span>
                        <span className="block text-xs text-gray-500 mt-0.5">
                          {item.desc}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Newsletter + Social ── */}
            <div className="lg:col-span-5 space-y-6">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-orange-400">
                Stay Connected
              </h3>

              {/* Newsletter card */}
              <div
                className="rounded-2xl p-5 space-y-4"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div>
                  <p className="text-sm font-medium text-white">Newsletter</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Exclusive offers and updates, straight to your inbox.
                  </p>
                </div>
                <form onSubmit={handleSubscribe} className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setEmail(e.target.value);
                        setEmailError("");
                      }}
                      required
                      placeholder="your@email.com"
                      className="flex-1 h-10 bg-white/8 border-white/10 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      aria-label="Email for newsletter"
                    />
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-10 px-4 rounded-xl text-white text-sm font-medium disabled:opacity-60 flex items-center gap-2 flex-shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg, #f97316 0%, #e11d48 100%)",
                      }}
                      aria-label="Subscribe"
                    >
                      {loading ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Subscribe
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                  {emailError && (
                    <p className="text-red-400 text-xs">{emailError}</p>
                  )}
                </form>
              </div>

              {/* Social */}
              <div className="space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-widest">
                  Follow us
                </p>
                <div className="flex gap-2.5">
                  {[
                    {
                      href: "https://www.instagram.com/rideexlogisticsbackup?igsh=MTAwbzRia3BudXI4dg==",
                      Icon: Instagram,
                      label: "Instagram",
                      hoverColor: "#e1306c",
                    },
                    {
                      href: "https://www.facebook.com/share/16nYLmfi26/?mibextid=wwXIfr",
                      Icon: Facebook,
                      label: "Facebook",
                      hoverColor: "#1877f2",
                    },
                    {
                      href: "https://x.com/rideex",
                      Icon: Twitter,
                      label: "X",
                      hoverColor: "#1da1f2",
                    },
                    {
                      href: "https://youtube.com/@rideexpresslogistics?si=A3WVHwtNYG9Lqdjg",
                      Icon: Youtube,
                      label: "YouTube",
                      hoverColor: "#ff0000",
                    },
                  ].map((social) => (
                    <a
                      key={social.href}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLAnchorElement
                        ).style.background = `${social.hoverColor}22`;
                        (
                          e.currentTarget as HTMLAnchorElement
                        ).style.borderColor = `${social.hoverColor}55`;
                        (e.currentTarget as HTMLAnchorElement).style.color =
                          social.hoverColor;
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLAnchorElement
                        ).style.background = "rgba(255,255,255,0.06)";
                        (
                          e.currentTarget as HTMLAnchorElement
                        ).style.borderColor = "rgba(255,255,255,0.08)";
                        (e.currentTarget as HTMLAnchorElement).style.color = "";
                      }}
                    >
                      <social.Icon className="w-4 h-4 text-gray-400" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Divider ── */}
          <div
            className="my-10 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.08) 80%, transparent)",
            }}
          />

          {/* ── Bottom bar ── */}
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            {/* App download */}
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs text-gray-500 uppercase tracking-widest">
                Download app
              </span>
              <div className="flex gap-3">
                {[
                  { label: "Google Play", image: "/play-store.png" },
                  { label: "App Store", image: "/app-store.png" },
                ].map((store) => (
                  <button
                    key={store.label}
                    onClick={() => window.alert("App coming soon!")}
                    className="flex items-center gap-2.5 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <Image
                      src={store.image}
                      alt={store.label}
                      width={22}
                      height={22}
                      className="object-contain w-[22px] h-[22px]"
                    />
                    <div className="text-left">
                      <div className="text-[10px] text-gray-500 leading-none">
                        Download on
                      </div>
                      <div className="text-xs font-medium text-white mt-0.5">
                        {store.label}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Copyright + links */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-xs text-gray-500">
              <p>© {new Date().getFullYear()} RideEx. All rights reserved.</p>
              <div className="flex items-center gap-1">
                <span className="hidden sm:block w-1 h-1 rounded-full bg-gray-700" />
                <Link
                  href="/privacy"
                  className="px-2 hover:text-orange-400 transition-colors"
                >
                  Privacy
                </Link>
                <span className="w-1 h-1 rounded-full bg-gray-700" />
                <Link
                  href="/terms"
                  className="px-2 hover:text-orange-400 transition-colors"
                >
                  Terms
                </Link>
                {user?.isAdmin && role === "admin" && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                    <Link
                      href="/admin/newsletter"
                      className="px-2 text-orange-400 hover:text-orange-300 font-semibold transition-colors"
                    >
                      Newsletter Admin
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </ClientOnly>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useCart } from "@/components/CartProvider";
import Logo from "@/components/Logo";
import { useLang } from "@/components/LangProvider";
import { BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/Icons";
import { createClient } from "@/lib/supabase/client";

export interface HeaderUser {
  email: string | null;
  isAdmin: boolean;
}

export default function Header({ user, storeName }: { user: HeaderUser | null; storeName: string }) {
  const { t, lang, setLang } = useLang();
  const { count } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [pathname]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
    setOpen(false);
  }

  async function logout() {
    await createClient().auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const langToggle = (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "ne" : "en")}
      className="rounded-full border border-line px-3 py-1.5 text-sm font-medium hover:border-ink"
      lang={lang === "en" ? "ne" : "en"}
    >
      {t("nav.language")}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-3">
        <button
          type="button"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-sand md:hidden"
          aria-label={t("nav.menu")}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>

        <Link href="/" className="text-2xl" aria-label={storeName}>
          <Logo />
        </Link>

        <nav className="ml-6 hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Main">
          <Link href="/shop" className="hover:text-brand">
            {t("nav.shop")}
          </Link>
          {user && (
            <Link href="/orders" className="hover:text-brand">
              {t("nav.orders")}
            </Link>
          )}
          <Link href="/app" className="hover:text-brand">
            {t("nav.app")}
          </Link>
          {user?.isAdmin && (
            <Link href="/admin" className="hover:text-brand">
              {t("nav.admin")}
            </Link>
          )}
        </nav>

        <form onSubmit={onSearch} className="ml-auto hidden max-w-xs flex-1 md:block" role="search">
          <label className="sr-only" htmlFor="header-search">
            {t("nav.search")}
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" width={18} height={18} />
            <input
              id="header-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("nav.search")}
              className="input !min-h-[40px] rounded-full !pl-10"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <div className="hidden md:block">{langToggle}</div>
          {user ? (
            <Link
              href="/account"
              className="hidden h-11 w-11 items-center justify-center rounded-full hover:bg-sand md:flex"
              aria-label={t("nav.account")}
            >
              <UserIcon />
            </Link>
          ) : (
            <Link href="/login" className="hidden px-3 text-sm font-medium hover:text-brand md:block">
              {t("nav.login")}
            </Link>
          )}
          <Link
            href="/cart"
            className="relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-sand"
            aria-label={`${t("nav.cart")} (${count})`}
          >
            <BagIcon />
            {count > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-line bg-paper md:hidden">
          <div className="container-page space-y-4 py-4">
            <form onSubmit={onSearch} role="search">
              <label className="sr-only" htmlFor="mobile-search">
                {t("nav.search")}
              </label>
              <input
                id="mobile-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("shop.search_placeholder")}
                className="input rounded-full"
              />
            </form>
            <nav className="flex flex-col text-base font-medium" aria-label="Mobile">
              <Link href="/shop" className="py-3">
                {t("nav.shop")}
              </Link>
              {user && (
                <Link href="/orders" className="py-3">
                  {t("nav.orders")}
                </Link>
              )}
              {user && (
                <Link href="/account" className="py-3">
                  {t("nav.account")}
                </Link>
              )}
              <Link href="/app" className="py-3">
                {t("nav.app")}
              </Link>
              {user?.isAdmin && (
                <Link href="/admin" className="py-3">
                  {t("nav.admin")}
                </Link>
              )}
              {user ? (
                <button type="button" onClick={logout} className="py-3 text-left text-brand">
                  {t("nav.logout")}
                </button>
              ) : (
                <div className="flex gap-3 pt-2">
                  <Link href="/login" className="btn-ghost flex-1">
                    {t("nav.login")}
                  </Link>
                  <Link href="/signup" className="btn-primary flex-1">
                    {t("nav.signup")}
                  </Link>
                </div>
              )}
            </nav>
            <div>{langToggle}</div>
          </div>
        </div>
      )}
    </header>
  );
}

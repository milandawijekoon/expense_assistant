"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const LINKS = [
  { href: "/add", label: "Add Expense" },
  { href: "/transactions", label: "Transactions" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/assistant", label: "Assistant" },
];

export function Nav() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <span className="font-semibold text-brand-700">Expense Assistant</span>
        <nav aria-label="Main" className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                  active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <button type="button" onClick={signOut} className="btn-secondary">
          Log out
        </button>
      </div>
    </header>
  );
}

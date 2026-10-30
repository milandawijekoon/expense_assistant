"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Nav } from "@/components/Nav";
import { PageLoading } from "@/components/ui";
import { useAuth } from "@/lib/auth";

/** Everything under (app) requires a session; anonymous visitors are sent to /login. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { token, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !token) router.replace("/login");
  }, [ready, token, router]);

  if (!ready || !token) return <PageLoading label="Checking your session" />;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}

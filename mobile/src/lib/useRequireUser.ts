import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "@/providers/Providers";

/** Sends signed-out visitors to the login screen, then brings them back to `next`. */
export function useRequireUser(next: string) {
  const router = useRouter();
  const auth = useAuth();
  useEffect(() => {
    if (auth.ready && !auth.user) router.replace({ pathname: "/login", params: { next } });
  }, [auth.ready, auth.user, next, router]);
  return auth;
}

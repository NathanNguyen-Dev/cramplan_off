"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/"); // Redirect to homepage after logout
    } catch (error) {
      console.error("Error signing out: ", error);
      // Optionally show an error message to the user
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">🏃💨</span>
            <span className="font-bold text-xl">CramPlan</span>
          </Link>
        </div>
        <nav className="flex flex-1 items-center justify-end space-x-4">
          {loading ? (
            // Optional: Show placeholders or nothing while loading
            <div className="h-8 w-24 animate-pulse bg-muted rounded"></div>
          ) : user ? (
            // User is logged in
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.email || user.displayName || "User"}
              </span>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            // User is logged out
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
} 
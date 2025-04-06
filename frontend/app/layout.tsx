import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "CramPlan - Personalized Study Plans",
  description: "Create personalized study plans for your exams",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center">
            <div className="mr-4 flex">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-2xl">🏃💨</span>
                <span className="font-bold text-xl">CramPlan</span>
              </Link>
            </div>
            <nav className="flex flex-1 items-center justify-end space-x-4">
              <Button variant="ghost" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}



import './globals.css'
import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AuthProvider } from "@/context/AuthContext"
import Header from "@/components/layout/Header"

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
        <AuthProvider>
          <Header />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}
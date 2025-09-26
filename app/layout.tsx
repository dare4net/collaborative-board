import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Kalam } from "next/font/google"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "EduBoard - Interactive Whiteboard for Teachers",
  description: "A powerful, desktop-first whiteboard application designed for educators",
  generator: "v0.app",
}

const kalam = Kalam({ subsets: ["latin"], weight: ["300", "400", "700"], variable: "--font-kalam" })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} ${kalam.variable}`}>
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  )
}

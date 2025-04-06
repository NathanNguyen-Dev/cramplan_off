import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Upload } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-blue-100 to-white">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Ace Your Exams with Personalized Study Plans
                  </h1>
                  <p className="max-w-[600px] text-gray-500 md:text-xl">
                    Upload your course materials, take a quick assessment, and get a tailored study plan that focuses on
                    what you need to learn.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/upload">
                      Get Started <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/how-it-works">How It Works</Link>
                  </Button>
                </div>
              </div>
              <div className="mx-auto lg:mr-0">
                <div className="rounded-lg border bg-card text-card-foreground shadow-lg">
                  <div className="flex flex-col space-y-1.5 p-6">
                    <h3 className="text-2xl font-semibold leading-none tracking-tight">Your Exam Success Plan</h3>
                    <p className="text-sm text-muted-foreground">Personalized learning in just a few steps</p>
                  </div>
                  <div className="p-6 pt-0 grid gap-4">
                    <div className="flex items-center gap-4 rounded-md border p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        1
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">Upload Materials</h4>
                        <p className="text-sm text-muted-foreground">Share your course notes and past exams</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-md border p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        2
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">Take Assessment</h4>
                        <p className="text-sm text-muted-foreground">Complete a quick quiz to determine your level</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-md border p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        3
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">Follow Your Plan</h4>
                        <p className="text-sm text-muted-foreground">
                          Learn with AI assistance and daily progress tracking
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">How CramPlan Works</h2>
              <p className="max-w-[85%] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Our AI-powered platform analyzes your course materials and creates a personalized study plan focused on
                exam-relevant content.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Smart Analysis</CardTitle>
                  <CardDescription>
                    Upload your course materials and we'll identify the most exam-relevant content.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex h-20 items-center justify-center rounded-md border border-dashed">
                    <Upload className="h-10 w-10 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Personalized Plan</CardTitle>
                  <CardDescription>Get a day-by-day study schedule tailored to your knowledge level.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 w-full rounded bg-gray-100"></div>
                    <div className="h-4 w-3/4 rounded bg-gray-100"></div>
                    <div className="h-4 w-full rounded bg-gray-100"></div>
                    <div className="h-4 w-2/3 rounded bg-gray-100"></div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>AI Assistance</CardTitle>
                  <CardDescription>
                    Learn with an AI tutor that answers questions and tests your knowledge.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="h-8 w-8 rounded-full bg-gray-100"></div>
                      <div className="flex-1 rounded-lg bg-gray-100 p-2 text-sm">
                        How can I help you understand this concept?
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-gray-500 md:text-left">
            © 2025 CramPlan. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-sm text-gray-500 hover:underline">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm text-gray-500 hover:underline">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}


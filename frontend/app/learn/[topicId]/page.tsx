"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, MessageSquare, Send, BookOpen, CheckCircle } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export default function LearnPage({ params }: { params: { topicId: string } }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("learn")
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([
    {
      role: "assistant",
      content: "Hi there! I'm your AI tutor for this topic. Feel free to ask me any questions about cell biology.",
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState(0)

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return

    // Add user message
    setChatMessages([...chatMessages, { role: "user", content: inputMessage }])

    // Simulate AI response (in a real app, this would call an AI API)
    setTimeout(() => {
      let response = "I'm your AI tutor for cell biology. "

      if (inputMessage.toLowerCase().includes("membrane")) {
        response +=
          "The cell membrane is a selectively permeable barrier that controls what enters and exits the cell. It's made up of a phospholipid bilayer with embedded proteins."
      } else if (inputMessage.toLowerCase().includes("mitochondria")) {
        response +=
          "Mitochondria are often called the 'powerhouse of the cell' because they produce energy through cellular respiration. They have their own DNA and are thought to have originated from ancient bacteria."
      } else if (inputMessage.toLowerCase().includes("nucleus")) {
        response +=
          "The nucleus is the control center of the cell. It contains the cell's genetic material (DNA) and directs cellular activities like growth, metabolism, and reproduction."
      } else {
        response +=
          "Cell biology is a fascinating field that studies the structure and function of cells. What specific aspect would you like to learn more about?"
      }

      setChatMessages((prev) => [...prev, { role: "assistant", content: response }])
    }, 1000)

    // TODO: Implement actual API call to AI tutor here

    setInputMessage("")
  }

  const handleQuizAnswer = (questionIndex: number, answer: string) => {
    setQuizAnswers({
      ...quizAnswers,
      [questionIndex]: answer,
    })
  }

  const handleSubmitQuiz = () => {
    // Calculate score
    let score = 0
    // TODO: Implement quiz scoring based on fetched quiz data

    setQuizScore(score)
    setQuizSubmitted(true)
  }

  const handleRetakeQuiz = () => {
    setQuizAnswers({})
    setQuizSubmitted(false)
    setQuizScore(0)
  }

  const handleFinish = () => {
    router.push("/study-plan")
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex justify-between items-center mb-6">
        <Link href="/study-plan" className="inline-flex items-center text-sm font-medium text-primary">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Study Plan
        </Link>
        <Button onClick={handleFinish}>Mark as Complete</Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          {/* TODO: Fetch and display actual topic title */}
          <CardTitle>{/* topicData.title */} Topic Title Placeholder</CardTitle>
          {/* TODO: Fetch and display actual topic description */}
          <CardDescription>{/* Learn about the basic structure and function of cells */} Topic Description Placeholder</CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="learn">
            <BookOpen className="h-4 w-4 mr-2" /> Learn
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="h-4 w-4 mr-2" /> Ask AI Tutor
          </TabsTrigger>
          <TabsTrigger value="quiz">
            <CheckCircle className="h-4 w-4 mr-2" /> Test Yourself
          </TabsTrigger>
        </TabsList>

        <TabsContent value="learn" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="prose max-w-none">
                {/* TODO: Fetch and render actual topic content */}
                <p>Topic content will be displayed here once fetched.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle>Ask Your AI Tutor</CardTitle>
              <CardDescription>Have questions about cell biology? Ask your AI tutor for help.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {chatMessages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t p-4">
              <div className="flex w-full items-center space-x-2">
                <Textarea
                  placeholder="Type your question here..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <Button size="icon" onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="quiz" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Your Knowledge</CardTitle>
              <CardDescription>Answer these questions to check your understanding of cell biology.</CardDescription>
            </CardHeader>
            <CardContent>
              {!quizSubmitted ? (
                <div className="space-y-6">
                  {/* TODO: Fetch and render actual quiz questions */}
                  <p>Quiz questions will be displayed here once fetched.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg">
                    <div className="text-5xl font-bold mb-2">
                      {quizScore}/{/* topicData.quiz.length */} ?
                    </div>
                    <p className="text-gray-500">Correct Answers</p>

                    {/* TODO: Logic depends on fetched quiz length */}
                    {/* {quizScore === topicData.quiz.length ? (
                      <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-md">
                        Great job! You've mastered this topic.
                      </div>
                    ) : quizScore >= topicData.quiz.length / 2 ? (
                      <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded-md">
                        Good effort! Review the incorrect answers to improve your understanding.
                      </div>
                    ) : (
                      <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">
                        You might need to review this topic again before moving on.
                      </div>
                    )} */}
                     <p>Quiz result feedback will appear here.</p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Review Your Answers:</h3>
                    {/* TODO: Fetch and render actual quiz review */}
                    <p>Quiz answer review will appear here.</p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              {!quizSubmitted ? (
                <Button
                  onClick={handleSubmitQuiz}
                  // TODO: Disable based on fetched quiz data
                  // disabled={Object.keys(quizAnswers).length < topicData.quiz.length}
                  disabled={true} // Disable until data is fetched
                  className="w-full"
                >
                  Submit Answers
                </Button>
              ) : (
                <div className="flex w-full gap-4">
                  <Button variant="outline" onClick={handleRetakeQuiz} className="flex-1">
                    Retake Quiz
                  </Button>
                  <Button onClick={handleFinish} className="flex-1">
                    Continue to Next Topic
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


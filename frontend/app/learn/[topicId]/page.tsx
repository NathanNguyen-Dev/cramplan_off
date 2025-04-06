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

// Sample topic data (in a real app, this would be fetched based on the topicId)
const topicData = {
  id: "topic-1-1",
  title: "Introduction to Cell Biology",
  content: `
    # Introduction to Cell Biology
    
    Cells are the basic structural and functional units of all living organisms. They are often called the "building blocks of life." The study of cells is called cell biology.
    
    ## Cell Structure Overview
    
    All cells have certain common components:
    
    1. **Cell Membrane**: A selectively permeable barrier that separates the cell from its environment.
    2. **Cytoplasm**: A gel-like substance where cellular components are suspended.
    3. **Genetic Material**: DNA (and RNA), which contains the instructions for cell function and reproduction.
    
    ## Types of Cells
    
    There are two main types of cells:
    
    1. **Prokaryotic Cells**: Simpler cells without a nucleus or membrane-bound organelles. Examples include bacteria.
    2. **Eukaryotic Cells**: More complex cells with a nucleus and various membrane-bound organelles. Examples include plant and animal cells.
    
    ## Cell Membrane Functions
    
    The cell membrane performs several crucial functions:
    
    - Controls what enters and exits the cell
    - Maintains cell shape
    - Helps cells communicate with each other
    - Provides protection and support
    
    ## Organelles and Their Roles
    
    Eukaryotic cells contain various organelles, each with specific functions:
    
    - **Nucleus**: Contains the cell's genetic material and controls cellular activities
    - **Mitochondria**: Produces energy through cellular respiration
    - **Endoplasmic Reticulum**: Involved in protein and lipid synthesis
    - **Golgi Apparatus**: Modifies, sorts, and packages proteins for secretion
    - **Lysosomes**: Contain digestive enzymes for breaking down waste materials
    - **Ribosomes**: Sites of protein synthesis
  `,
  quiz: [
    {
      question: "What are the two main types of cells?",
      options: [
        "Plant cells and animal cells",
        "Prokaryotic cells and eukaryotic cells",
        "Simple cells and complex cells",
        "Membrane cells and non-membrane cells",
      ],
      correctAnswer: "Prokaryotic cells and eukaryotic cells",
    },
    {
      question: "Which organelle is responsible for energy production in the cell?",
      options: ["Nucleus", "Golgi apparatus", "Mitochondria", "Endoplasmic reticulum"],
      correctAnswer: "Mitochondria",
    },
    {
      question: "What is the main function of the cell membrane?",
      options: [
        "To produce energy",
        "To control what enters and exits the cell",
        "To store genetic material",
        "To synthesize proteins",
      ],
      correctAnswer: "To control what enters and exits the cell",
    },
  ],
}

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
    topicData.quiz.forEach((question, index) => {
      if (quizAnswers[index] === question.correctAnswer) {
        score++
      }
    })

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
          <CardTitle>{topicData.title}</CardTitle>
          <CardDescription>Learn about the basic structure and function of cells</CardDescription>
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
                {topicData.content.split("\n\n").map((paragraph, index) => {
                  if (paragraph.startsWith("# ")) {
                    return (
                      <h1 key={index} className="text-3xl font-bold mt-6 mb-4">
                        {paragraph.substring(2)}
                      </h1>
                    )
                  } else if (paragraph.startsWith("## ")) {
                    return (
                      <h2 key={index} className="text-2xl font-bold mt-6 mb-3">
                        {paragraph.substring(3)}
                      </h2>
                    )
                  } else if (paragraph.startsWith("- ")) {
                    return (
                      <ul key={index} className="list-disc pl-5 my-3">
                        {paragraph.split("\n- ").map((item, i) => (
                          <li key={i} className="my-1">
                            {item.replace("- ", "")}
                          </li>
                        ))}
                      </ul>
                    )
                  } else if (paragraph.includes("**")) {
                    return (
                      <p key={index} className="my-3">
                        {paragraph.split("**").map((part, i) => (i % 2 === 0 ? part : <strong key={i}>{part}</strong>))}
                      </p>
                    )
                  } else {
                    return (
                      <p key={index} className="my-3">
                        {paragraph}
                      </p>
                    )
                  }
                })}
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
                  {topicData.quiz.map((question, index) => (
                    <div key={index} className="space-y-3">
                      <h3 className="font-medium">
                        {index + 1}. {question.question}
                      </h3>
                      <RadioGroup
                        value={quizAnswers[index] || ""}
                        onValueChange={(value) => handleQuizAnswer(index, value)}
                      >
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2 rounded-md border p-3">
                            <RadioGroupItem value={option} id={`q${index}-option-${optionIndex}`} />
                            <Label htmlFor={`q${index}-option-${optionIndex}`} className="flex-1">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg">
                    <div className="text-5xl font-bold mb-2">
                      {quizScore}/{topicData.quiz.length}
                    </div>
                    <p className="text-gray-500">Correct Answers</p>

                    {quizScore === topicData.quiz.length ? (
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
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Review Your Answers:</h3>
                    {topicData.quiz.map((question, index) => {
                      const isCorrect = quizAnswers[index] === question.correctAnswer

                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border ${
                            isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                          }`}
                        >
                          <h4 className="font-medium">
                            {index + 1}. {question.question}
                          </h4>
                          <p className="mt-2">
                            Your answer:{" "}
                            <span className={isCorrect ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                              {quizAnswers[index] || "No answer provided"}
                            </span>
                          </p>
                          {!isCorrect && (
                            <p className="mt-1 text-green-600">
                              Correct answer: <span className="font-medium">{question.correctAnswer}</span>
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              {!quizSubmitted ? (
                <Button
                  onClick={handleSubmitQuiz}
                  disabled={Object.keys(quizAnswers).length < topicData.quiz.length}
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


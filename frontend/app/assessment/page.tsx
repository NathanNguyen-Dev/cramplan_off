"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

// Define the quiz question interface
interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  topic: string;
}

// Sample quiz questions as fallback
const sampleQuizQuestions: QuizQuestion[] = [
  {
    id: 1,
    question: "What is the primary function of mitochondria in a cell?",
    options: ["Protein synthesis", "Energy production", "Cell division", "Waste removal"],
    correctAnswer: "Energy production",
    topic: "Biology"
  },
  {
    id: 2,
    question: "Which of the following is a key principle of object-oriented programming?",
    options: ["Sequential execution", "Encapsulation", "Procedural design", "Linear processing"],
    correctAnswer: "Encapsulation",
    topic: "Computer Science"
  },
  {
    id: 3,
    question: "In economics, what does GDP stand for?",
    options: [
      "Global Development Plan",
      "Gross Domestic Product",
      "General Distribution Process",
      "Growth and Development Percentage",
    ],
    correctAnswer: "Gross Domestic Product",
    topic: "Economics"
  },
  {
    id: 4,
    question: "Which of the following is NOT a type of chemical bond?",
    options: ["Ionic bond", "Covalent bond", "Hydrogen bond", "Magnetic bond"],
    correctAnswer: "Magnetic bond",
    topic: "Chemistry"
  },
  {
    id: 5,
    question: "What is the correct order of operations in mathematics?",
    options: [
      "Addition, Subtraction, Multiplication, Division, Exponents, Parentheses",
      "Parentheses, Exponents, Multiplication, Division, Addition, Subtraction",
      "Parentheses, Exponents, Addition, Subtraction, Multiplication, Division",
      "Exponents, Parentheses, Multiplication, Division, Addition, Subtraction",
    ],
    correctAnswer: "Parentheses, Exponents, Multiplication, Division, Addition, Subtraction",
    topic: "Mathematics"
  },
]

export default function AssessmentPage() {
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(sampleQuizQuestions)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  
  // Load quiz data from localStorage on component mount
  useEffect(() => {
    try {
      const storedQuizData = localStorage.getItem('assessmentQuizData')
      if (storedQuizData) {
        const parsedData = JSON.parse(storedQuizData)
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          console.log('Loaded quiz data from localStorage:', parsedData)
          setQuizQuestions(parsedData)
        }
      }
    } catch (error) {
      console.error('Error loading quiz data from localStorage:', error)
      // Fall back to sample questions if there's an error
    }
  }, [])

  const handleAnswer = (answer: string) => {
    setAnswers({
      ...answers,
      [quizQuestions[currentQuestion].id]: answer,
    })
  }

  const handleNext = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setShowResults(true)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const calculateScore = () => {
    let score = 0
    Object.keys(answers).forEach((questionId) => {
      const question = quizQuestions.find((q) => q.id === Number.parseInt(questionId))
      if (question && answers[Number.parseInt(questionId)] === question.correctAnswer) {
        score++
      }
    })
    return score
  }

  const getLevel = () => {
    const score = calculateScore()
    if (score <= 2) return "Beginner"
    if (score <= 4) return "Intermediate"
    return "Advanced"
  }

  const handleFinish = () => {
    // Set loading state to true
    setIsGeneratingPlan(true);
    
    // Calculate topic understanding scores based on quiz performance
    const topicScores = quizQuestions.reduce((acc, question) => {
      const topic = question.topic;
      if (!acc[topic]) {
        acc[topic] = { total: 0, correct: 0 };
      }
      
      acc[topic].total += 1;
      
      // Check if the answer was correct
      if (answers[question.id] === question.correctAnswer) {
        acc[topic].correct += 1;
      }
      
      return acc;
    }, {} as Record<string, { total: number, correct: number }>);
    
    // Convert to percentage scores (0-100)
    const normalizedScores: Record<string, number> = {};
    Object.entries(topicScores).forEach(([topic, performance]) => {
      normalizedScores[topic] = Math.round((performance.correct / performance.total) * 100);
    });
    
    console.log('Topic understanding scores:', normalizedScores);
    
    // Get the subject from localStorage or use a default
    const storedSubject = localStorage.getItem('studySubject') || "Biology";
    
    // Prepare request payload for curate-topics
    const curateTopicsPayload = {
      request: {
        subject: storedSubject
      },
      understanding: {
        scores: normalizedScores
      }
    };
    
    console.log('Making POST request to: http://0.0.0.0:8000/curate-topics');
    console.log('Request body:', JSON.stringify(curateTopicsPayload, null, 2));
    
    // Call the curate-topics endpoint
    fetch('http://0.0.0.0:8000/curate-topics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(curateTopicsPayload),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok for curate-topics');
      }
      return response.json();
    })
    .then(data => {
      console.log('Topics curated successfully:', data);
      
      // Prepare payload for generate-content
      const generateContentPayload = {
        topics: data, // Assuming the curate-topics response has the expected format
        understanding: {
          scores: normalizedScores
        }
      };
      
      console.log('Making POST request to: http://0.0.0.0:8000/generate-content');
      console.log('Request body:', JSON.stringify(generateContentPayload, null, 2));
      
      // Call the generate-content endpoint
      return fetch('http://0.0.0.0:8000/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generateContentPayload),
      });
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok for generate-content');
      }
      return response.json();
    })
    .then(contentData => {
      console.log('Content generated successfully:', contentData);
      
      // Store the generated content data for use in the study plan page
      localStorage.setItem('studyPlanContent', JSON.stringify(contentData));
      
      // Navigate to the study plan page
      router.push("/study-plan");
    })
    .catch(error => {
      console.error('Error in API chain:', error);
      // Set loading state back to false in case of error
      setIsGeneratingPlan(false);
      // Show an error message to the user
      alert('There was an error generating your study plan. Please try again.');
    });
  }

  if (showResults) {
    const score = calculateScore()
    const level = getLevel()
    
    // Group questions by topic to show topic-based performance
    const topicPerformance = quizQuestions.reduce((acc, question) => {
      const topic = question.topic;
      if (!acc[topic]) {
        acc[topic] = { total: 0, correct: 0 };
      }
      
      acc[topic].total += 1;
      
      // Check if the answer was correct
      if (answers[question.id] === question.correctAnswer) {
        acc[topic].correct += 1;
      }
      
      return acc;
    }, {} as Record<string, { total: number, correct: number }>);

    return (
      <div className="container max-w-4xl py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Assessment Results</CardTitle>
            <CardDescription>Based on your answers, we've determined your current knowledge level.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg">
              <div className="text-5xl font-bold mb-2">
                {score}/{quizQuestions.length}
              </div>
              <p className="text-gray-500">Correct Answers</p>
            </div>

            <div className="space-y-2">
              <p className="font-medium">Your Knowledge Level:</p>
              <div className="p-4 bg-primary/10 rounded-lg flex items-center">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground mr-4">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-lg">{level}</p>
                  <p className="text-sm text-gray-500">
                    {level === "Beginner" && "We'll focus on building a strong foundation."}
                    {level === "Intermediate" && "We'll help you strengthen your knowledge."}
                    {level === "Advanced" && "We'll focus on advanced concepts and mastery."}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Topic Performance Section */}
            <div className="space-y-3">
              <p className="font-medium">Topic Performance:</p>
              <div className="space-y-2">
                {Object.entries(topicPerformance).map(([topic, performance]) => (
                  <div key={topic} className="p-3 border rounded-md">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-medium">{topic}</p>
                      <p className="text-sm">{performance.correct}/{performance.total} correct</p>
                    </div>
                    <Progress 
                      value={(performance.correct / performance.total) * 100} 
                      className="h-2" 
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-medium">What's Next?</p>
              <p className="text-gray-500">
                Based on your assessment and uploaded materials, we'll create a personalized study plan tailored to your
                knowledge level and the time you have until your exam.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleFinish} 
              className="w-full"
              disabled={isGeneratingPlan}
            >
              {isGeneratingPlan ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Your Study Plan...
                </>
              ) : (
                "Generate My Study Plan"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const question = quizQuestions[currentQuestion]
  const progress = ((currentQuestion + 1) / quizQuestions.length) * 100

  return (
    <div className="container max-w-4xl py-12">
      <Link href="/upload" className="inline-flex items-center text-sm font-medium text-primary mb-6">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Upload
      </Link>

      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Knowledge Assessment</CardTitle>
            <span className="text-sm text-gray-500">
              Question {currentQuestion + 1} of {quizQuestions.length}
            </span>
          </div>
          <CardDescription>Answer these questions to help us determine your current knowledge level.</CardDescription>
          <Progress value={progress} className="h-2 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">{question.question}</h3>
              </div>
              <RadioGroup value={answers[question.id] || ""} onValueChange={handleAnswer} className="space-y-3">
                {question.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 rounded-md border p-3">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handlePrevious} disabled={currentQuestion === 0}>
            Previous
          </Button>
          <Button onClick={handleNext} disabled={!answers[question.id]}>
            {currentQuestion < quizQuestions.length - 1 ? "Next" : "Finish"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}


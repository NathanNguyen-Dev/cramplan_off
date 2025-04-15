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
  const [generationStatus, setGenerationStatus] = useState<string | null>(null)
  
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

  const handleFinish = async () => {
    setIsGeneratingPlan(true);
    setGenerationStatus('Calculating scores...');

    // --- Keep score calculation and file ID retrieval --- 
    const topicScores = quizQuestions.reduce((acc, question) => {
      const topic = question.topic;
      if (!acc[topic]) {
        acc[topic] = { total: 0, correct: 0 };
      }
      acc[topic].total += 1;
      if (answers[question.id] === question.correctAnswer) {
        acc[topic].correct += 1;
      }
      return acc;
    }, {} as Record<string, { total: number, correct: number }>);
    const normalizedScores: Record<string, number> = {};
    Object.entries(topicScores).forEach(([topic, performance]) => {
      normalizedScores[topic] = Math.round((performance.correct / performance.total) * 100);
    });
    console.log('Topic understanding scores:', normalizedScores);
    let vectorStoreFileIds: string[] = [];
    try {
      const storedIds = localStorage.getItem('vectorStoreFileIds');
      if (storedIds) {
        vectorStoreFileIds = JSON.parse(storedIds);
        // DO NOT REMOVE FROM LOCALSTORAGE YET - needed for delete call later
      }
    } catch (error) {
      console.error('Error retrieving vectorStoreFileIds:', error);
    }
    const storedSubject = localStorage.getItem('studySubject') || "Biology";
    // --- End score calculation and file ID retrieval ---

    try {
      // --- Step 1: Curate Topics --- 
      setGenerationStatus('Curating topics...');
      const curateTopicsPayload = {
        request: { subject: storedSubject },
        understanding: { scores: normalizedScores }
      };
      console.log(`Making POST request to: ${process.env.NEXT_PUBLIC_API_BASE_URL}/curate-topics`);
      const curateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/curate-topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(curateTopicsPayload),
      });
      if (!curateResponse.ok) {
        throw new Error(`Topic curation failed: ${curateResponse.statusText}`);
      }
      const curatedData = await curateResponse.json();
      const curatedTopics = curatedData.list_of_topics;
      console.log('Topics curated successfully:', curatedTopics);

      if (!curatedTopics || curatedTopics.length === 0) {
          throw new Error("No topics were curated. Cannot generate content.");
      }

      // --- Step 2: Generate Content Topic by Topic --- 
      const allGeneratedContent: any[] = []; // To store results from each topic
      for (let i = 0; i < curatedTopics.length; i++) {
        const topicToGenerate = curatedTopics[i];
        setGenerationStatus(`Generating content for topic ${i + 1} of ${curatedTopics.length}: ${topicToGenerate.topic}...`);
        console.log(`Requesting content for topic: ${topicToGenerate.topic}`);

        const singleTopicPayload = { topic: topicToGenerate };
        const contentResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/generate-single-topic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(singleTopicPayload),
        });

        if (!contentResponse.ok) {
           const errorText = await contentResponse.text();
           throw new Error(`Content generation failed for topic "${topicToGenerate.topic}": ${contentResponse.status} - ${errorText}`);
        }
        const generatedTopicContent = await contentResponse.json();
        allGeneratedContent.push(generatedTopicContent); // Add the result (ContentMain object)
        console.log(`Content generated for topic: ${topicToGenerate.topic}`, generatedTopicContent);

        // Add a delay before the next iteration to avoid hitting rate limits
        if (i < curatedTopics.length - 1) { // Don't wait after the last topic
          const delaySeconds = 2; // Adjust delay as needed (in seconds)
          setGenerationStatus(`Waiting ${delaySeconds}s before next topic...`);
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }
      }

      // --- Step 3: Delete Vector Store Files --- 
      if (vectorStoreFileIds.length > 0) {
        setGenerationStatus('Cleaning up uploaded files...');
        console.log('Deleting vector store files:', vectorStoreFileIds);
        const deletePayload = { vector_store_file_ids: vectorStoreFileIds };
        const deleteResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/delete-vector-files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deletePayload),
        });
        if (!deleteResponse.ok) {
          // Log error but don't necessarily block the user
          console.error(`Failed to delete vector store files: ${deleteResponse.statusText}`);
        } else {
          const deleteResult = await deleteResponse.json();
          console.log('File deletion result:', deleteResult);
          // Clear IDs from localStorage only after successful deletion request
          localStorage.removeItem('vectorStoreFileIds'); 
        }
      } else {
         console.log('No vector store files to delete.');
      }

      // --- Step 4: Save Final Result and Navigate --- 
      setGenerationStatus('Finalizing study plan...');
      // Assemble the final content structure expected by the study plan page
      const finalStudyPlanContent = { topic: allGeneratedContent }; 
      localStorage.setItem('studyPlanContent', JSON.stringify(finalStudyPlanContent));
      console.log('Complete study plan content saved:', finalStudyPlanContent);
      
      router.push("/study-plan");

    } catch (error: any) {
      console.error('Error during study plan generation process:', error);
      setGenerationStatus('Error'); 
      setIsGeneratingPlan(false);
      alert(`There was an error generating the study plan: ${error.message}`);
    } 
    // No finally block needed here for setIsGeneratingPlan, handled on success/error
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
                  {generationStatus || 'Generating Your Study Plan...'}
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


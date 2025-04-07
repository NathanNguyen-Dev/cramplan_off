"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Upload, FileText, Calendar, Loader2, AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/context/AuthContext"

// Define types for the quiz data
interface QuizQuestion {
  topic: string;
  quiz_question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
}

interface QuizData {
  list_quiz_questions: QuizQuestion[];
}

interface FormattedQuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  topic: string;
}

export default function UploadPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [courseFiles, setCourseFiles] = useState<File[]>([])
  const [examFiles, setExamFiles] = useState<File[]>([])
  const [daysUntilExam, setDaysUntilExam] = useState<number>(7)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const handleCourseFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setCourseFiles(Array.from(e.target.files))
    }
  }

  const handleExamFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setExamFiles(Array.from(e.target.files))
    }
  }

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value)
    if (!isNaN(value) && value > 0) {
      setDaysUntilExam(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (authLoading) {
      setError("Authentication status is loading, please wait.");
      return;
    }

    if (!user) {
      setError("You must be logged in to upload files.");
      return;
    }

    if (courseFiles.length === 0 && examFiles.length === 0) {
       setError("Please select at least one file to upload.");
       return;
    }

    setIsProcessing(true);

    // 1. Upload Files
    const formData = new FormData();
    formData.append("user_id", user.uid);

    courseFiles.forEach((file) => {
      formData.append("course_notes", file);
    });

    examFiles.forEach((file) => {
      formData.append("past_exams", file);
    });

    let uploadSuccessful = false;
    try {
      console.log('Uploading files for user:', user.uid);
      const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/upload-files`, {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
          console.error("Upload failed:", uploadResult);
          throw new Error(uploadResult.detail || "File upload failed. Please check the server logs.");
      }
      
      console.log('Files uploaded successfully:', uploadResult);
      uploadSuccessful = true;

      // --- BEGIN Extract and Store Vector Store File IDs ---
      if (uploadResult && uploadResult.upload_details && Array.isArray(uploadResult.upload_details)) {
        const completedFileIds = uploadResult.upload_details
          .filter((detail: any) => detail.status === 'completed' && detail.vector_store_file_id)
          .map((detail: any) => detail.vector_store_file_id);
          
        if (completedFileIds.length > 0) {
          localStorage.setItem('vectorStoreFileIds', JSON.stringify(completedFileIds));
          console.log('Stored vectorStoreFileIds in localStorage:', completedFileIds);
        } else {
           console.warn('No successfully completed vector store file IDs found in upload response.');
           localStorage.removeItem('vectorStoreFileIds'); // Clear potentially old data
        }
      } else {
         console.warn('Upload response did not contain expected upload_details. Cannot store file IDs.');
         localStorage.removeItem('vectorStoreFileIds'); // Clear potentially old data
      }
      // --- END Extract and Store Vector Store File IDs ---

    } catch (err: any) {
      console.error('Error uploading files:', err);
      setError(`Upload Error: ${err.message}`);
      setIsProcessing(false);
      return;
    }

    // 2. Proceed with Topic/Quiz Generation if Upload was Successful
    if (uploadSuccessful) {
      // Create request body for generate-topics (Using a placeholder subject for now)
      const subject = "User Uploaded Topic"; 
      const generateTopicsRequestBody = {
        subject: subject
      };
      
      // Store the subject and days until exam in localStorage for later use
      localStorage.setItem('studySubject', subject);
      localStorage.setItem('daysUntilExam', daysUntilExam.toString());
      
      console.log(`Making POST request to: ${process.env.NEXT_PUBLIC_API_BASE_URL}/generate-topics`);
      console.log('Request body:', JSON.stringify(generateTopicsRequestBody, null, 2));

      try {
          // Make POST request to generate topics
          const topicsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/generate-topics`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(generateTopicsRequestBody),
          });

          if (!topicsResponse.ok) {
            const errorData = await topicsResponse.json().catch(() => ({detail: "Failed to parse topic generation error"}));
            throw new Error(errorData.detail || 'Topic generation failed');
          }
          const topicsData = await topicsResponse.json();
          console.log('Topics generated successfully:', topicsData);

          // Call the generate-quiz endpoint
          console.log(`Making POST request to: ${process.env.NEXT_PUBLIC_API_BASE_URL}/generate-quiz`);
          console.log('Request body:', JSON.stringify(topicsData, null, 2));
          
          const quizResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/generate-quiz`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(topicsData),
          });

          if (!quizResponse.ok) {
             const errorData = await quizResponse.json().catch(() => ({detail: "Failed to parse quiz generation error"}));
             throw new Error(errorData.detail || 'Quiz generation failed');
          }
          const quizData = await quizResponse.json();
          console.log('Quiz generated successfully:', quizData);
          
          // Store the formatted quiz data in localStorage
          if (quizData && quizData.list_quiz_questions) {
            const formattedQuizData = quizData.list_quiz_questions.map((q: QuizQuestion, index: number): FormattedQuizQuestion => ({
              id: index + 1,
              question: q.quiz_question,
              options: [q.choice_a, q.choice_b, q.choice_c, q.choice_d],
              correctAnswer: getCorrectAnswerText(q),
              topic: q.topic
            }));
            localStorage.setItem('assessmentQuizData', JSON.stringify(formattedQuizData));
            console.log('Quiz data stored for assessment page:', formattedQuizData);
          } else {
             console.warn("Quiz data format unexpected or empty. Skipping storage.");
          }
          
          // Navigate to assessment page
          router.push("/assessment");

      } catch (err: any) {
         console.error('Error in topic/quiz generation chain:', err);
         setError(`Processing Error: ${err.message}`);
      } finally {
         setIsProcessing(false);
      }
    }
  }

  // Helper function to convert letter answer to the actual text answer
  const getCorrectAnswerText = (question: QuizQuestion): string => {
    switch(question.correct_answer.toLowerCase()) {
      case 'a': return question.choice_a;
      case 'b': return question.choice_b;
      case 'c': return question.choice_c;
      case 'd': return question.choice_d;
      default: return '';
    }
  }

  if (authLoading) {
     return (
       <div className="flex items-center justify-center min-h-screen">
         <Loader2 className="h-12 w-12 animate-spin text-primary" />
       </div>
     ); 
  }

  return (
    <div className="container py-12 pt-6">
      <Link href="/" className="inline-flex items-center text-sm font-medium text-blue-600 mb-6">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Home
      </Link>

      <h1 className="text-2xl font-bold text-blue-700 mb-6">Upload Your Study Materials</h1>

      {!user && (
         <div className="mb-4 p-4 border border-yellow-300 bg-yellow-50 text-yellow-700 rounded-md">
            <p>Please <Link href="/login" className="font-bold underline">log in</Link> or <Link href="/signup" className="font-bold underline">sign up</Link> to upload materials.</p>
         </div>
      )}

      {error && (
        <div className="mb-4 p-4 border border-red-300 bg-red-50 text-red-700 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Course Notes Upload Box */}
          <div className="flex-1">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-blue-600 text-white p-4">
                <h2 className="text-lg font-medium">Course Notes</h2>
                <p className="text-sm text-blue-100">Upload your lecture notes, textbooks, and study guides</p>
              </div>
              <div className="p-6 bg-white">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-blue-200 rounded-lg p-8 text-center bg-blue-50">
                  <div className="mb-4">
                    <Upload className="mx-auto h-10 w-10 text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold">Upload your notes</span>
                    </p>
                    <p className="text-xs text-gray-500">PDF, DOCX, TXT (max 50MB)</p>
                  </div>
                  <Input
                    id="course-notes"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleCourseFilesChange}
                    accept=".pdf,.docx,.txt"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
                    onClick={() => document.getElementById("course-notes")?.click()}
                  >
                    Select Files
                  </Button>

                  {courseFiles.length > 0 && (
                    <div className="mt-4 w-full">
                      <p className="text-sm font-medium text-left">Selected Files ({courseFiles.length})</p>
                      <div className="max-h-32 overflow-y-auto mt-2 space-y-2">
                        {courseFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center p-2 rounded-md bg-blue-50 border border-blue-100"
                          >
                            <FileText className="h-4 w-4 mr-2 text-blue-500" />
                            <span className="text-sm truncate">{file.name}</span>
                            <span className="text-xs text-gray-500 ml-auto">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Past Exams Upload Box */}
          <div className="flex-1">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-blue-600 text-white p-4">
                <h2 className="text-lg font-medium">Past Exams</h2>
                <p className="text-sm text-blue-100">Upload previous exams, quizzes, and practice tests</p>
              </div>
              <div className="p-6 bg-white">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-blue-200 rounded-lg p-8 text-center bg-blue-50">
                  <div className="mb-4">
                    <Upload className="mx-auto h-10 w-10 text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold">Upload past exams</span>
                    </p>
                    <p className="text-xs text-gray-500">PDF, DOCX, TXT (max 50MB)</p>
                  </div>
                  <Input
                    id="past-exams"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleExamFilesChange}
                    accept=".pdf,.docx,.txt"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
                    onClick={() => document.getElementById("past-exams")?.click()}
                  >
                    Select Files
                  </Button>

                  {examFiles.length > 0 && (
                    <div className="mt-4 w-full">
                      <p className="text-sm font-medium text-left">Selected Files ({examFiles.length})</p>
                      <div className="max-h-32 overflow-y-auto mt-2 space-y-2">
                        {examFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center p-2 rounded-md bg-blue-50 border border-blue-100"
                          >
                            <FileText className="h-4 w-4 mr-2 text-blue-500" />
                            <span className="text-sm truncate">{file.name}</span>
                            <span className="text-xs text-gray-500 ml-auto">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Days Until Exam Box - Centered */}
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-blue-600 text-white p-4">
                <h2 className="text-lg font-medium">Days Until Exam</h2>
                <p className="text-sm text-blue-100">Enter how many days you have to prepare</p>
              </div>
              <div className="p-6 bg-white">
                <div className="flex items-center space-x-4">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <Input
                    id="days"
                    type="number"
                    min="1"
                    value={daysUntilExam}
                    onChange={handleDaysChange}
                    className="flex-1 border-blue-200 bg-blue-50 focus:border-blue-400"
                    placeholder="Enter number of days"
                  />
                  <span className="text-gray-500">days</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Button */}
        <div className="mt-6">
          {isProcessing ? (
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg opacity-75 cursor-not-allowed"
              disabled
            >
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg"
              disabled={!user || (courseFiles.length === 0 && examFiles.length === 0) || authLoading}
            >
              Upload and Get A Quick Assessment
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}


from fastapi import FastAPI, HTTPException, UploadFile, File, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
import asyncio
from typing import List, Dict, Optional
import logging
import io
import os

# Import specific components from the new service locations
from ...services.llm_service import (
    main_topic_outline_agent,
    open_quiz_agent,
    content_writer_agent,
    curated_topic_outline_agent,
    evaluate_quiz_understanding,
    Runner,
    ListOfTopics as LLMListOfTopics,
    ListOfQuizQuestions as LLMListOfQuizQuestions,
    ContentTopic as LLMContentTopic,
)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create an APIRouter instead of a FastAPI app instance
router = APIRouter()

class TopicRequest(BaseModel):
    subject: str

class QuizAnswer(BaseModel):
    question_index: int
    answer: str

class QuizSubmission(BaseModel):
    answers: List[QuizAnswer]

class Topic(BaseModel):
    topic: str
    description: str
    subtopics: List[str]

class TopicResponse(BaseModel):
    list_of_topics: List[Topic]

class QuizQuestion(BaseModel):
    topic: str
    quiz_question: str
    choice_a: str
    choice_b: str
    choice_c: str
    choice_d: str
    correct_answer: str

class QuizResponse(BaseModel):
    list_quiz_questions: List[QuizQuestion]

class ContentSub(BaseModel):
    sub_topic_title: str
    sub_content_text: str

class ContentMain(BaseModel):
    topic_title: str
    main_description: str
    subtopics: List[ContentSub]

class ContentResponse(BaseModel):
    topic: List[ContentMain]

class UnderstandingScore(BaseModel):
    scores: Dict[str, float]

class MarkdownContent(BaseModel):
    content: str
    title: Optional[str] = "Study Plan"

@router.post("/generate-topics", response_model=TopicResponse)
async def generate_topics(request: TopicRequest):
    try:
        logger.info(f"Generating topics for subject: {request.subject}")
        input_prompt = request.subject

        main_topic_result = await Runner.run(
            main_topic_outline_agent,
            input_prompt,
        )
        
        response_topics = [
            Topic(topic=t.topic, description=t.description, subtopics=t.subtopics)
            for t in main_topic_result.final_output.list_of_topics
        ]

        logger.info(f"Generated {len(response_topics)} topics")
        return TopicResponse(list_of_topics=response_topics)
    except Exception as e:
        logger.error(f"Error generating topics: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating topics: {str(e)}")

@router.post("/generate-quiz", response_model=QuizResponse)
async def generate_quiz(topics: TopicResponse):
    try:
        logger.info(f"Generating quiz for {len(topics.list_of_topics)} topics")
        topics_string = "\n".join(
            f"{i+1}. {topic.topic}\n   Description: {topic.description}\n   Subtopics: {', '.join(topic.subtopics)}"
            for i, topic in enumerate(topics.list_of_topics)
        )
        
        quiz_result = await Runner.run(
            open_quiz_agent,
            f"Here are the topics:\n{topics_string}"
        )
        response_questions = [
            QuizQuestion(
                topic=q.topic,
                quiz_question=q.quiz_question,
                choice_a=q.choice_a,
                choice_b=q.choice_b,
                choice_c=q.choice_c,
                choice_d=q.choice_d,
                correct_answer=q.correct_answer
            ) for q in quiz_result.final_output.list_quiz_questions
        ]

        logger.info(f"Generated {len(response_questions)} quiz questions")
        return QuizResponse(list_quiz_questions=response_questions)
    except Exception as e:
        logger.error(f"Error generating quiz: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating quiz: {str(e)}")

@router.post("/evaluate-quiz", response_model=UnderstandingScore)
async def evaluate_quiz(quiz: QuizResponse, submission: QuizSubmission):
    try:
        logger.info(f"Evaluating quiz with {len(submission.answers)} answers")
        user_answers = [{"question_index": ans.question_index, "answer": ans.answer}
                       for ans in submission.answers]
        
        llm_quiz_structure = LLMListOfQuizQuestions(list_quiz_questions=[
            q for q in quiz.list_quiz_questions
        ])

        understanding_scores = evaluate_quiz_understanding(llm_quiz_structure, user_answers)
        logger.info(f"Evaluated understanding for {len(understanding_scores)} topics")
        return UnderstandingScore(scores=understanding_scores)
    except Exception as e:
        logger.error(f"Error evaluating quiz: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error evaluating quiz: {str(e)}")

@router.post("/curate-topics", response_model=TopicResponse)
async def curate_topics(request: TopicRequest, understanding: UnderstandingScore):
    try:
        logger.info(f"Curating topics for subject: {request.subject}")
        understanding_string = "\n".join(
            f"{topic}: {score:.1f}%"
            for topic, score in understanding.scores.items()
        )
        
        curated_result = await Runner.run(
            curated_topic_outline_agent,
            f"Here is the main topic:\n{request.subject}\nHere is the understanding of the topic:\n{understanding_string}"
        )
        
        response_topics = [
            Topic(topic=t.topic, description=t.description, subtopics=t.subtopics)
            for t in curated_result.final_output.list_of_topics
        ]

        logger.info(f"Curated {len(response_topics)} topics")
        return TopicResponse(list_of_topics=response_topics)
    except Exception as e:
        logger.error(f"Error curating topics: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error curating topics: {str(e)}")

@router.post("/generate-content", response_model=ContentResponse)
async def generate_content(curated_topics: TopicResponse, title: str = "Study Plan"):
    try:
        logger.info(f"Generating content for {len(curated_topics.list_of_topics)} curated topics")
        curated_topics_string = "\n".join(
             f"{i+1}. {topic.topic}"
             for i, topic in enumerate(curated_topics.list_of_topics)
         )

        content_result = await Runner.run(
            content_writer_agent,
             f"Here are the topics to write content for:\n{curated_topics_string}\nYou need to output the main content, its description and the subtopics with the content for each subtopic."
        )

        response_content = [
            ContentMain(
                topic_title=main_topic.topic_title,
                main_description=main_topic.main_description,
                subtopics=[
                    ContentSub(sub_topic_title=sub.sub_topic_title, sub_content_text=sub.sub_content_text)
                    for sub in main_topic.subtopics
                ]
            ) for main_topic in content_result.final_output.topic
        ]

        logger.info(f"Generated content with {len(response_content)} sections")
        return ContentResponse(topic=response_content)
    except Exception as e:
        logger.error(f"Error generating content: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating content: {str(e)}")

@router.get("/health")
async def health_check():
    return {"status": "healthy"} 
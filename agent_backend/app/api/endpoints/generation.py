from fastapi import FastAPI, HTTPException, UploadFile, File, APIRouter, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from pydantic import BaseModel
import asyncio
from typing import List, Dict, Optional
import logging
import io
import os
# Add imports for OpenAI client and settings
from openai import AsyncOpenAI
from ...core.config import settings

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

# Initialize OpenAI client
client = AsyncOpenAI()

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

# Define a new request model including file IDs
class ContentGenerationRequest(BaseModel):
    curated_topics: TopicResponse
    title: Optional[str] = "Study Plan"
    vector_store_file_ids: List[str] # IDs of files to delete from vector store

# --- New Models for Chunking --- 
class SingleTopicGenerationRequest(BaseModel):
    topic: Topic # The specific topic to generate content for
    # Add other context if needed by the agent, e.g., main_subject: str

class DeleteFilesRequest(BaseModel):
    vector_store_file_ids: List[str]

class DeleteFilesResponse(BaseModel):
    deleted_count: int
    failed_count: int
    message: str

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

# --- REMOVE/COMMENT OUT Original /generate-content Endpoint ---
# @router.post("/generate-content", response_model=ContentResponse)
# async def generate_content(request: ContentGenerationRequest):
#     vector_store_id = settings.OPENAI_VECTOR_STORE_ID
#     if not vector_store_id:
#         logger.error("OPENAI_VECTOR_STORE_ID not configured. Cannot delete files.")
#         raise HTTPException(status_code=500, detail="Vector Store ID not configured.")
#
#     try:
#         logger.info(f"Generating content for {len(request.curated_topics.list_of_topics)} curated topics")
#         curated_topics_string = "\\n".join(
#              f"{i+1}. {topic.topic}"
#              for i, topic in enumerate(request.curated_topics.list_of_topics)
#          )
#
#         content_result = await Runner.run(
#              f"Here are the topics to write content for:\\n{curated_topics_string}\\nYou need to output the main content, its description and the subtopics with the content for each subtopic."
#         )
#
#         response_content = [
#             ContentMain(
#                 topic_title=main_topic.topic_title,
#                 main_description=main_topic.main_description,
#                 subtopics=[
#                     ContentSub(sub_topic_title=sub.sub_topic_title, sub_content_text=sub.sub_content_text)
#                     for sub in main_topic.subtopics
#                 ]
#             ) for main_topic in content_result.final_output.topic
#         ]
#
#         logger.info(f"Generated content with {len(response_content)} sections")
#         final_result = ContentResponse(topic=response_content)
#
#         if request.vector_store_file_ids:
#             logger.info(f"Attempting to delete {len(request.vector_store_file_ids)} files from Vector Store {vector_store_id} post-generation.")
#             success_delete = []
#             failed_delete = []
#             for vs_file_id in request.vector_store_file_ids:
#                 try:
#                     delete_status = await client.vector_stores.files.delete(
#                         vector_store_id=vector_store_id,
#                         file_id=vs_file_id
#                     )
#                     if delete_status.deleted:
#                         logger.info(f"Successfully deleted Vector Store File ID: {vs_file_id} from VS: {vector_store_id}")
#                         success_delete.append(vs_file_id)
#                     else:
#                         logger.warning(f"Deletion status 'false' for Vector Store File ID: {vs_file_id} in VS: {vector_store_id}. Already deleted?")
#                         failed_delete.append(vs_file_id)
#                 except Exception as delete_error:
#                     logger.error(f"Failed to delete Vector Store File ID: {vs_file_id} from VS: {vector_store_id}. Error: {str(delete_error)}", exc_info=True)
#                     failed_delete.append(vs_file_id)
#             logger.info(f"Vector Store File deletion summary: Success={len(success_delete)}, Failed={len(failed_delete)}")
#         else:
#             logger.info(f"Skipping vector store file deletion (no files provided).")
#
#         return final_result
#     except Exception as e:
#         logger.error(f"Error generating content: {str(e)}", exc_info=True)
#         raise HTTPException(status_code=500, detail=f"Error generating content: {str(e)}")

# --- New Endpoint for Single Topic Generation ---
@router.post("/generate-single-topic", response_model=ContentMain)
async def generate_single_topic(request: SingleTopicGenerationRequest):
    """Generates content for a single topic."""
    logger.info(f"Generating content for single topic: {request.topic.topic}")
    try:
        # Construct prompt specific to this single topic
        # Example: You might need more context than just the topic title/desc/subtopics
        # Adjust the prompt as needed for your content_writer_agent
        topic_string = f"Topic: {request.topic.topic}\nDescription: {request.topic.description}\nSubtopics: {', '.join(request.topic.subtopics)}"
        prompt = f"Write content for the following topic:\n{topic_string}\nYou need to output the main content, its description and the subtopics with the content for each subtopic."

        # Run the agent for the single topic
        content_result = await Runner.run(content_writer_agent, prompt)

        # Expecting the agent to return a list containing ONE ContentMain object for the single topic
        if not content_result.final_output.topic or len(content_result.final_output.topic) != 1:
            logger.error(f"Agent did not return exactly one ContentMain object for topic: {request.topic.topic}")
            raise HTTPException(status_code=500, detail="Content generation for topic failed internally.")

        single_topic_content = content_result.final_output.topic[0]

        # Map to response model (assuming agent output matches ContentMain structure)
        response_main = ContentMain(
            topic_title=single_topic_content.topic_title,
            main_description=single_topic_content.main_description,
            subtopics=[
                ContentSub(sub_topic_title=sub.sub_topic_title, sub_content_text=sub.sub_content_text)
                for sub in single_topic_content.subtopics
            ]
        )

        logger.info(f"Successfully generated content for topic: {request.topic.topic}")
        return response_main

    except Exception as e:
        logger.error(f"Error generating content for topic {request.topic.topic}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating content for topic: {str(e)}")

# --- New Endpoint for File Deletion ---
@router.post("/delete-vector-files", response_model=DeleteFilesResponse)
async def delete_vector_files(request: DeleteFilesRequest):
    """Deletes specified files from the OpenAI Vector Store."""
    vector_store_id = settings.OPENAI_VECTOR_STORE_ID
    if not vector_store_id:
        logger.error("OPENAI_VECTOR_STORE_ID not configured. Cannot delete files.")
        raise HTTPException(status_code=500, detail="Vector Store ID not configured.")

    if not request.vector_store_file_ids:
        logger.info("No file IDs provided for deletion.")
        return DeleteFilesResponse(deleted_count=0, failed_count=0, message="No file IDs provided.")

    logger.info(f"Attempting to delete {len(request.vector_store_file_ids)} files from Vector Store {vector_store_id}.")
    success_delete = []
    failed_delete = []
    for vs_file_id in request.vector_store_file_ids:
        try:
            delete_status = await client.vector_stores.files.delete(
                vector_store_id=vector_store_id,
                file_id=vs_file_id
            )
            if delete_status.deleted:
                logger.info(f"Successfully deleted Vector Store File ID: {vs_file_id} from VS: {vector_store_id}")
                success_delete.append(vs_file_id)
            else:
                logger.warning(f"Deletion status 'false' for Vector Store File ID: {vs_file_id} in VS: {vector_store_id}. Already deleted?")
                failed_delete.append(vs_file_id) # Count as failed for reporting?
        except Exception as delete_error:
            logger.error(f"Failed to delete Vector Store File ID: {vs_file_id} from VS: {vector_store_id}. Error: {str(delete_error)}", exc_info=True)
            failed_delete.append(vs_file_id)
    
    message = f"Deletion process completed. Success: {len(success_delete)}, Failed: {len(failed_delete)}."
    logger.info(message)
    return DeleteFilesResponse(deleted_count=len(success_delete), failed_count=len(failed_delete), message=message)

@router.get("/health")
async def health_check():
    return {"status": "healthy"} 
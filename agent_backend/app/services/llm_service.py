import os
#from agents import Agent, Runner,function_tool,trace
#from dotenv import load_dotenv
import asyncio
from pydantic import BaseModel
from openai.types.responses import (
    ResponseFunctionCallArgumentsDeltaEvent,  # tool call streaming
    ResponseCreatedEvent,  # start of new event like tool call or final answer
    ResponseTextDeltaEvent
)
from agents import Agent, Runner, function_tool, trace # Assuming 'agents' is an installed library or in PYTHONPATH

# Import settings from the new config location
from ..core.config import settings

# Ensure the API key is set for the agents library
# This depends on how the 'agents' library expects the key (e.g., environment variable, direct configuration)
# Assuming it checks the environment variable:
os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY

# Remove old environment setup import
# import env_setup

# Remove duplicate load_dotenv and environment variable setting
# since it's now handled by env_setup # This comment is outdated

# Remove duplicate load_dotenv and environment variable setting
# since it's now handled by env_setup
class Topic(BaseModel):
    topic: str
    description: str
    subtopics: list[str]

class ListOfTopics(BaseModel):
    list_of_topics: list[Topic]  # Now it's a list of strings

main_topic_outline_agent = Agent(
    name="main_topic_outline_agent",
    instructions="""
    Generate five main topics based on the user's input. 
    For each topic, provide a description and a list of 3 subtopics.
    """,
    output_type=ListOfTopics
)

curated_topic_outline_agent = Agent(
    name="curated_topic_outline_agent",
    instructions="""
    You will be given the understanding of the topic by the user after they have answered the quiz.
    You will then need to curate the topic based on the understanding of the topic.
    Return the topics based on the order of the understanding from needing to learn first to the least.
    """,
    output_type=ListOfTopics
)

class QuizQuestions(BaseModel):
     topic: str
     quiz_question: str
     choice_a: str
     choice_b: str
     choice_c: str
     choice_d: str
     correct_answer: str

class ListOfQuizQuestions(BaseModel):
     list_quiz_questions: list[QuizQuestions]


open_quiz_agent = Agent(
    name="open_quiz_agent",
    instructions="Read the given list of topics, and create 10 multiple choice quiz of a,b,c,d that covers all the topics. The correct answer should be a,b,c,d",
    output_type=ListOfQuizQuestions,
)

class ContentSub(BaseModel):
    sub_topic_title: str
    sub_content_text: str

class ContentMain(BaseModel):
    topic_title: str
    main_description: str
    subtopics: list[ContentSub]

class ContentTopic(BaseModel):
     topic: list[ContentMain] 



content_writer_agent = Agent(
    name="content_writer_agent",
    instructions="""You will be given a list of topics, for each topic, you will write a general main description for the topic. For each of the topics, you will be given a list of subtopics, you will write the subtopic title and the content for the subtopic. Focus on writing the content of the subtopics to be 1000+ words. In the content of the subtopics, try to add understanding of the key concepts, practical examples, real life applications (if applicable), summary of the subtopic and its connection to other subtopics.""",
    output_type=ContentTopic
)

def evaluate_quiz_understanding(quiz_results, user_answers):
    """
    Evaluate user's understanding of each topic based on quiz answers.
    
    Args:
        quiz_results: ListOfQuizQuestions object from AI
        user_answers: list of answers in format [{'question_index': 0, 'answer': 'a'}, ...]
    
    Returns:
        dict: Topic understanding scores {topic: percentage}
    """
    # Initialize topic understanding dictionary
    topic_understanding = {}
    topic_question_count = {}
    
    # Process each question and answer
    for i, question in enumerate(quiz_results.list_quiz_questions):
        topic = question.topic
        
        # Initialize topic if not seen before
        if topic not in topic_understanding:
            topic_understanding[topic] = 0
            topic_question_count[topic] = 0
            
        # Get user's answer for this question
        user_answer = next((ans['answer'] for ans in user_answers if ans['question_index'] == i), None)
        
        # Compare answers
        if user_answer and user_answer.lower() == question.correct_answer.lower():
            topic_understanding[topic] += 1
        topic_question_count[topic] += 1
    
    # Calculate percentages for each topic
    for topic in topic_understanding:
        if topic_question_count[topic] > 0:
            topic_understanding[topic] = (topic_understanding[topic] / topic_question_count[topic]) * 100
            
    return topic_understanding

async def main():
    # Ensure API key is available before running
    if not settings.OPENAI_API_KEY:
        print("Error: OPENAI_API_KEY not found in environment variables or .env file.")
        return

    input_prompt = input("What is the main subject of the content? ")

    with trace("Deterministic story flow"):
        # 1. Generate an outline
        main_topic_result = await Runner.run(
            main_topic_outline_agent,
            input_prompt,
        )
        print("List of topics generated")
        # Access the list of topics and format them into a string
        topics = main_topic_result.final_output.topics
        topics_string = "\n".join(f"{i+1}. {topic}" for i, topic in enumerate(topics))
        for topic in topics:
            print(f"Topic: {topic}")

        # 2. Create the first quiz question
        open_quiz_result = await Runner.run(
            open_quiz_agent,
            f"Here are the topics:\n{topics_string}",  # Pass formatted string
        )
        print("Quiz question generated")
        print(f"Quiz question: {open_quiz_result.final_output}")

        # Demo list of user answers (simulate frontend input)
        demo_user_answers = [
            {'question_index': 0, 'answer': 'a'},
            {'question_index': 1, 'answer': 'b'},
            {'question_index': 2, 'answer': 'c'},
            {'question_index': 3, 'answer': 'd'},
            {'question_index': 4, 'answer': 'a'},
            {'question_index': 5, 'answer': 'b'},
            {'question_index': 6, 'answer': 'c'},
            {'question_index': 7, 'answer': 'a'},
            {'question_index': 8, 'answer': 'b'},
            {'question_index': 9, 'answer': 'd'},
        ]
        
        # Evaluate understanding
        understanding_scores = evaluate_quiz_understanding(
            open_quiz_result.final_output,
            demo_user_answers
        )
        
        
        # Format understanding scores into a string
        understanding_summary = "\nUnderstanding by Topic:\n"
        understanding_summary += "\n".join(f"{topic}: {score:.1f}%" for topic, score in understanding_scores.items())
        print(understanding_summary)

        # 3. Curate the topics
        curated_topic_result = await Runner.run(
            curated_topic_outline_agent,
            f"Here is the main topic:\n{input_prompt}\nHere is the understanding of the topic:\n{understanding_scores}" # Pass formatted string
        )
        print("Curated topics generated")
        print(f"Curated topics: {curated_topic_result.final_output}")

        curated_topics = curated_topic_result.final_output.topics
        curated_topics_string = "\n".join(f"{i+1}. {topic}" for i, topic in enumerate(curated_topics))
        for topic in curated_topics:
            print(f"Topic: {topic}")

        # 4. Write the content for the curated_topics
        content_result = await Runner.run(
            content_writer_agent,
            f"""Here are the topics to write content for:\n{curated_topics_string}, You need to output the main content, its description and the subtopics with the content for each subtopic.
"""
            ,  # Pass formatted string
        )
        print(f"Story: {content_result.final_output}")

if __name__ == "__main__":
    asyncio.run(main())
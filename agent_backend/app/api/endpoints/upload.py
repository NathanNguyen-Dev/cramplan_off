# agent_backend/app/api/endpoints/upload.py

import logging
from typing import List, Annotated

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from openai import AsyncOpenAI # Use AsyncOpenAI for async FastAPI

from ...core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize OpenAI client
# It automatically picks up OPENAI_API_KEY from environment
client = AsyncOpenAI()

@router.post("/upload-files")
async def upload_files_to_vector_store(
    user_id: Annotated[str, Form()],
    course_notes: Annotated[List[UploadFile], File()], 
    past_exams: Annotated[List[UploadFile] | None, File()] = None
):
    """
    Receives user ID, course notes (batch), and optional past exams (batch),
    uploads them to the configured OpenAI Vector Store.
    Associates files with the provided user_id in metadata (limited support).
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required.")
    if not settings.OPENAI_VECTOR_STORE_ID:
        raise HTTPException(status_code=500, detail="Vector Store ID not configured.")

    files_to_upload = []
    if course_notes:
        files_to_upload.extend([(note, "course_note") for note in course_notes])
    if past_exams:
        files_to_upload.extend([(exam, "past_exam") for exam in past_exams])

    if not files_to_upload:
        raise HTTPException(status_code=400, detail="No files provided for upload.")

    uploaded_file_details = []
    vector_store_id = settings.OPENAI_VECTOR_STORE_ID

    logger.info(f"Uploading {len(files_to_upload)} files for user {user_id} to Vector Store {vector_store_id}")

    # NOTE: OpenAI File metadata is currently very limited and primarily for Assistants.
    # We cannot reliably add arbitrary metadata like 'user_id' or 'file_type' directly 
    # to the File object during upload in a way that's easily filterable via FileSearchTool.
    # The recommended pattern is per-user vector stores.
    # For now, we proceed with upload to the shared store.

    for file, file_type in files_to_upload:
        openai_file_obj = None # Keep track of the uploaded file object ID
        try:
            # Read file content into memory - consider streaming for large files
            file_content = await file.read()
            
            # Step 1: Upload the file generally to OpenAI
            # Pass filename for clarity in OpenAI UI if needed
            # Purpose must be 'assistants' for use with Assistants API
            openai_file_obj = await client.files.create(
                file=(file.filename, file_content), 
                purpose='assistants'
            )
            logger.info(f"Successfully uploaded {file.filename} to OpenAI Files, ID: {openai_file_obj.id}")

            # Step 2: Add the uploaded file to the specific Vector Store and poll
            # Use the create_and_poll helper for vector store files
            # This ensures the file is processed and ready in the vector store
            vs_file = await client.vector_stores.files.create_and_poll(
                vector_store_id=vector_store_id,
                file_id=openai_file_obj.id
            )
            
            logger.info(f"Added OpenAI File {openai_file_obj.id} to VS {vector_store_id}. VSFile ID: {vs_file.id}, Status: {vs_file.status}")
            
            # Check status after polling (should be completed if no exception)
            if vs_file.status == 'completed':
                uploaded_file_details.append({
                    "filename": file.filename,
                    "openai_file_id": openai_file_obj.id, # Original file ID
                    "vector_store_file_id": vs_file.id, # ID specific to the file in this VS
                    "status": vs_file.status,
                    "type": file_type
                })
            else:
                 # Should not happen if poll was successful, but handle defensively
                 logger.warning(f"File {openai_file_obj.id} added to VS {vector_store_id} but status is {vs_file.status}")
                 uploaded_file_details.append({
                     "filename": file.filename,
                     "openai_file_id": openai_file_obj.id,
                     "vector_store_file_id": vs_file.id,
                     "status": f"pending ({vs_file.status})", # Indicate non-completion
                     "type": file_type
                 })

        except Exception as e:
            logger.error(f"Failed processing {file.filename} for user {user_id}: {str(e)}", exc_info=True)
            # Store failure information
            uploaded_file_details.append({
                "filename": file.filename,
                "openai_file_id": openai_file_obj.id if openai_file_obj else None,
                "status": "failed",
                "error": str(e),
                "type": file_type
            })
        finally:
             await file.close() # Ensure file handle is closed

    successful_uploads = [f for f in uploaded_file_details if f["status"] == "completed"]
    failed_uploads = [f for f in uploaded_file_details if f["status"] == "failed"]

    if not successful_uploads:
         raise HTTPException(status_code=500, detail="Failed to upload any files.", headers={"X-Upload-Errors": str(failed_uploads)}) 

    return {
        "message": f"Processed {len(files_to_upload)} files. {len(successful_uploads)} successful, {len(failed_uploads)} failed.",
        "vector_store_id": vector_store_id,
        "user_id": user_id,
        "upload_details": uploaded_file_details
    } 
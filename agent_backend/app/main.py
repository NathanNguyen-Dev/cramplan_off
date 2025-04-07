import uvicorn
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import the configuration object (ensure it loads .env)
from .core.config import settings
# Import the API router
from .api.endpoints import generation
from .api.endpoints import upload # Import the new upload router

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Check if the essential config is loaded
if not settings.OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY not found. Ensure .env file is present and configured.")
    # Depending on the app's requirements, you might want to raise an exception here
    # raise RuntimeError("OPENAI_API_KEY not configured.")

# Create FastAPI app instance
app = FastAPI(
    title="CramPlan API",
    description="API for generating learning content and study plans.",
    version="0.1.0"
)

# --- CORS Configuration --- 
# Define allowed origins
origins = [
    "http://localhost:3000",  # Local frontend development
    "https://cramplan-off-front-end.vercel.app", # Production frontend
    # Add any other origins if needed (e.g., preview deployment URLs)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # List of allowed origins
    allow_credentials=True, # Allow cookies/auth headers
    allow_methods=["*"],    # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],    # Allow all headers
)
# --- End CORS Configuration ---

# Include the generation API router without the prefix
app.include_router(generation.router, tags=["Generation"])
# Include the upload API router 
app.include_router(upload.router, tags=["Upload"]) # No prefix here either to match frontend

# Simple root endpoint
@app.get("/")
async def read_root():
    return {"message": "Welcome to the CramPlan API"}

# Run the app with uvicorn
if __name__ == "__main__":
    logger.info("Starting CramPlan API server on http://0.0.0.0:8000")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) # Use reload for development 
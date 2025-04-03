# CramPlan Agent Backend

This directory contains the FastAPI backend for the CramPlan agent, responsible for generating study topics, quizzes, and content using AI.

## Project Structure

```
agent_backend/
├── app/
│   ├── api/
│   │   ├── endpoints/            # API endpoint definitions (routers)
│   │   │   └── generation.py
│   │   └── __init__.py
│   ├── core/                   # Core components like configuration
│   │   ├── config.py
│   │   └── __init__.py
│   ├── services/               # Business logic (LLM interaction)
│   │   ├── llm_service.py
│   │   └── __init__.py
│   ├── __init__.py
│   └── main.py                 # FastAPI application setup
├── docs/
├── scripts/
├── .env.example                # Example environment variables
├── README.md                   # This file
└── requirements.txt            # Python dependencies
```

## Setup

1.  **Install Dependencies:**
    It's recommended to use a virtual environment.
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    pip install -r requirements.txt
    ```
    *Note: Update `requirements.txt` based on the project's imports (e.g., `fastapi`, `uvicorn`, `pydantic`, `pydantic-settings`, `openai`, `agents`). Dependencies like `weasyprint` and `markdown` are no longer needed.* Create/update it if necessary:
    ```bash
    pip freeze > requirements.txt
    ```

2.  **Configure Environment Variables:**
    Copy the example `.env.example` file to `.env` in the `agent_backend` directory:
    ```bash
    cp .env.example .env
    ```
    Edit the `.env` file and add your actual `OPENAI_API_KEY`.
    ```dotenv
    # .env
    OPENAI_API_KEY=sk-your-real-openai-api-key-here
    ```

## Running the API Server

Navigate to the `agent_backend` directory and run the FastAPI application using Uvicorn:

```bash
cd agent_backend
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000` (or `http://0.0.0.0:8000`). You can access the interactive API documentation (Swagger UI) at `http://127.0.0.1:8000/docs`.

## Dockerization

A `Dockerfile` is provided to containerize the application.

**Prerequisites:**
*   Docker installed and running.
*   Ensure the `.env` file exists in the `agent_backend` directory (it contains your `OPENAI_API_KEY`). The Dockerfile copies this file into the image. Alternatively, you can remove the `COPY .env .` line from the Dockerfile and provide the `OPENAI_API_KEY` as an environment variable when running the container.

**Building the Image:**
Navigate to the `agent_backend` directory in your terminal and run:
```bash
docker build -t cramplan-agent-backend .
```
Replace `cramplan-agent-backend` with your desired image name.

**Running the Container:**
```bash
docker run -d -p 8000:8000 --name cramplan-agent cramplan-agent-backend
```
*   `-d`: Run the container in detached mode (in the background).
*   `-p 8000:8000`: Map port 8000 on your host machine to port 8000 in the container.
*   `--name cramplan-agent`: Assign a name to the running container for easier management.
*   `cramplan-agent-backend`: The name of the image you built.

If you chose not to copy `.env` into the image, you need to provide the API key via an environment variable:
```bash
docker run -d -p 8000:8000 --name cramplan-agent -e OPENAI_API_KEY="your-actual-api-key" cramplan-agent-backend
```

The API inside the container will be accessible at `http://localhost:8000`.

**Stopping the Container:**
```bash
docker stop cramplan-agent
```

**Removing the Container:**
```bash
docker rm cramplan-agent
```

## Using Docker Compose (Recommended)

A `docker-compose.yml` file is provided in the workspace root (`../`) to simplify building and running the container.

**Prerequisites:**
*   Docker and Docker Compose installed and running.
*   Ensure the `.env` file exists in the `agent_backend` directory.

**Building and Running:**
Navigate to the workspace root directory (`/Users/namnguyen/Desktop/Peachme/EduTech/cramplan_off/`) in your terminal and run:
```bash
docker-compose up --build
```
*   `--build`: Forces Docker Compose to rebuild the image if it has changed (or for the first time).
*   To run in the background, add the `-d` flag: `docker-compose up --build -d`

The API will be accessible at `http://localhost:8000`.

**Development Note:** The `docker-compose.yml` includes a commented-out volume mount (`./agent_backend/app:/code/app`) and a command override. Uncomment these lines if you want changes made to your local `app/` directory to be reflected immediately inside the running container (useful for development with Uvicorn's `--reload` feature, which is enabled by default in the compose file's command override).

**Stopping the Service:**
Press `Ctrl+C` in the terminal where `docker-compose up` is running, or if running in detached mode (`-d`), use:
```bash
docker-compose down
```
This stops and removes the containers, networks, etc., defined in the compose file.
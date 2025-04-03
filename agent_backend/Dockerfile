# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /code

# Install system dependencies if needed (e.g., for specific libraries)
# RUN apt-get update && apt-get install -y --no-install-recommends some-package && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
# Using --no-cache-dir makes the image smaller
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
# This assumes your application code is in an 'app' directory
COPY ./app ./app

# Copy the .env file - Ensure this file exists in the build context (agent_backend/)
# Alternatively, provide environment variables at runtime
COPY .env .

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Define environment variable (optional, can be set at runtime)
# ENV MODULE_NAME="app.main"
# ENV VARIABLE_NAME="app"

# Run uvicorn when the container launches
# Use 0.0.0.0 to allow connections from outside the container
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 
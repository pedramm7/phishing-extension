# Use an official Python runtime as a parent image
FROM python3.9

# Set the working directory in the container
WORKDIR app

# Copy all files to the container
COPY . app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port FastAPI runs on
EXPOSE 8000

# Command to run the app
CMD [uvicorn, appapp, --host, 0.0.0.0, --port, 8000]

FROM python3.11-slim

# Set the working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the script
COPY server.py ./

# Define environment variables
ENV BROKER="mosquitto"
ENV DB_HOST="mysql"
ENV DB_USER="root"
ENV DB_PASS="admin"
ENV DB_NAME="sustainable_consumption"

# Command to run the script
CMD ["python", "server.py"]
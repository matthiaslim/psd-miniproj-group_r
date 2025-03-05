# Use a lightweight Python image
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Copy the script
COPY server.py ./

# Install dependencies
RUN pip install paho-mqtt pymysql cryptography

# Define environment variables
ENV BROKER="mosquitto"
ENV DB_HOST="mysql"
ENV DB_USER="root"
ENV DB_PASS="admin"
ENV DB_NAME="sensor_data"

# Command to run the script
CMD ["python", "server.py"]

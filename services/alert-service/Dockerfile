# Use a lightweight Python image
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Copy the script
COPY alert.py ./
# Install dependencies
RUN pip install paho-mqtt pymysql cryptography numpy

# Define environment variables
ENV BROKER="mosquitto"
ENV DB_HOST="mysql"
ENV DB_USER="user"
ENV DB_PASS="password"
ENV DB_NAME="sensor_data"
ENV DB_PORT="3306"

# Command to run the script
CMD ["python", "alert.py"]

FROM python:3.11-slim

WORKDIR /app

COPY test.py ./

RUN pip install paho-mqtt pymysql cryptography

CMD ["python", "test.py"]
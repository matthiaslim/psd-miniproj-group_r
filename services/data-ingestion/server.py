import paho.mqtt.client as mqtt
import pymysql
from datetime import datetime
import cryptography
import os
import time
import sys
import json

DB_HOST = os.getenv("DB_HOST", "mysql")
DB_USER = os.getenv("DB_USER", "user")
DB_PASS = os.getenv("DB_PASS", "password")
DB_NAME = os.getenv("DB_NAME", "sensor_data")
DB_PORT = int(os.getenv("DB_PORT", "3306"))

BROKER = os.getenv("BROKER", "mosquitto")
TOPIC_ELEC = "sensor/electricity"
TOPIC_WATER = "sensor/water"
TOPIC_WASTE = "sensor/waste"

print(f"Starting data ingestion service...")
print(f"Database: {DB_HOST}:{DB_PORT}, User: {DB_USER}")
print(f"MQTT Broker: {BROKER}")

max_retries = 30
retry_count = 0
conn = None
while conn is None and retry_count < max_retries:
    try:
        print(f"Attempting to connect to MySQL (attempt {retry_count + 1}/{max_retries})...")
        conn = pymysql.connect(
            host=DB_HOST, 
            user=DB_USER, 
            password=DB_PASS, 
            database=DB_NAME, 
            port=DB_PORT,
            connect_timeout=10
        )
        print("Successfully connected to MySQL!")
    except Exception as e:
        retry_count += 1
        wait_time = 5
        print(f"Failed to connect to MySQL: {e}")
        print(f"Retrying in {wait_time} seconds...")
        time.sleep(wait_time)

if conn is None:
    print("Failed to connect to MySQL after maximum retries. Exiting.")
    sys.exit(1)

# Create cursor
cursor = conn.cursor()

def on_message(client, userdata, msg):
    try:
        # Parse JSON payload
        payload = json.loads(msg.payload.decode())
        timestamp = payload.get('timestamp')
        value = payload.get('value')
        
        column_map = {
            TOPIC_ELEC: "electricity",  
            TOPIC_WATER: "water",
            TOPIC_WASTE: "waste",
        }

        column = column_map.get(msg.topic)
        if column:
            sql = f"""
                INSERT INTO consumption (timestamp, {column}) 
                VALUES (%s, %s) 
                ON DUPLICATE KEY UPDATE {column} = VALUES({column})
            """
            cursor.execute(sql, (timestamp, value))
            conn.commit()
            print(f"Stored in MySQL -> {timestamp}: {msg.topic} -> {value}")
        else:
            print(f"Unknown topic: {msg.topic}")
    except Exception as e:
        print(f"Error processing message: {e}")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_message = on_message
client.connect(BROKER, 1883, 60)

client.subscribe(TOPIC_ELEC)
client.subscribe(TOPIC_WATER)
client.subscribe(TOPIC_WASTE)  

client.loop_forever()

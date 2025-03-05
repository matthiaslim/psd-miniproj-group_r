import paho.mqtt.client as mqtt
import pymysql
from datetime import datetime
import cryptography
import os

DB_HOST = os.getenv("DB_HOST", "mysql")
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "admin")
DB_NAME = os.getenv("DB_NAME", "sensor_data")

BROKER = os.getenv("BROKER", "mosquitto")
TOPIC_ELEC = "sensor/electricity"
TOPIC_WATER = "sensor/water"

conn = pymysql.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME)
cursor = conn.cursor()

def on_message(client, userdata, msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    value = float(msg.payload.decode())

    if msg.topic == TOPIC_ELEC:
        cursor.execute("""
            INSERT INTO consumption (timestamp, electricity, water) 
            VALUES (%s, %s, NULL) 
            ON DUPLICATE KEY UPDATE electricity = VALUES(electricity)
        """, (timestamp, value))

    elif msg.topic == TOPIC_WATER:
        cursor.execute("""
            INSERT INTO consumption (timestamp, electricity, water) 
            VALUES (%s, NULL, %s) 
            ON DUPLICATE KEY UPDATE water = VALUES(water)
        """, (timestamp, value))
        conn.commit()
        print(f"Stored in MySQL -> {timestamp}: {msg.topic} -> {value}")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_message = on_message
client.connect(BROKER, 1883, 60)

client.subscribe(TOPIC_ELEC)
client.subscribe(TOPIC_WATER)

client.loop_forever()

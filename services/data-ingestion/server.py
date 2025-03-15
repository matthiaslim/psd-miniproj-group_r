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
TOPIC_WASTE = "sensor/waste"
TOPIC_PETROL = "sensor/petrol"

conn = pymysql.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME)
cursor = conn.cursor()

def on_message(client, userdata, msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    value = float(msg.payload.decode())

    column_map = {
        TOPIC_ELEC: "electricity",
        TOPIC_WATER: "water",
        TOPIC_WASTE: "waste",
        TOPIC_PETROL: "petroleum"
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

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_message = on_message
client.connect(BROKER, 1883, 60)

client.subscribe(TOPIC_ELEC)
client.subscribe(TOPIC_WATER)
client.subscribe(TOPIC_WASTE)  
client.subscribe(TOPIC_PETROL) 

client.loop_forever()

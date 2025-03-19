import paho.mqtt.client as mqtt
import pymysql
import numpy as np
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
ALERT_TOPIC = "alerts" 

print(f"Starting alert service...")
print(f"Database: {DB_HOST}:{DB_PORT}, User: {DB_USER}")
print(f"MQTT Broker: {BROKER}")

# Connect to MySQL
conn = None
while conn is None:
    try:
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
        print(f"Failed to connect to MySQL: {e}")
        time.sleep(5)

cursor = conn.cursor()

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

def calculate_z_score(column, value):
    """ Fetch recent data, compute Z-score, and check for anomalies """
    cursor.execute(f"SELECT {column} FROM consumption ORDER BY id DESC LIMIT 50")
    data = [float(row[0]) for row in cursor.fetchall()]
    print(f"Latest data: {data[:10]}")  # Print the first 10 values

    if len(data) >= 50:
        mean = np.mean(data)
        std_dev = np.std(data)
        
        if std_dev == 0:  
            return None
    
        z_score = (value - mean) / std_dev
        
        return z_score
    return None

def on_message(client, userdata, msg):
    """ Handle incoming MQTT messages """
    try:
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
            z_score = calculate_z_score(column, value)
            print(f"Z-score: {z_score}")
            if z_score is not None and abs(z_score) > 3:  
                print(f"🚨 Anomaly detected in {column}! Z-score: {z_score}")
                alert_message = json.dumps({"timestamp": timestamp, "column": column, "value": value})
                client.publish(ALERT_TOPIC, alert_message)
        else:
            print(f"Unknown topic: {msg.topic}")
    except Exception as e:
        print(f"Error processing message: {e}")

client.on_message = on_message
client.connect(BROKER, 1883, 60)

client.subscribe(TOPIC_ELEC)
client.subscribe(TOPIC_WATER)
client.subscribe(TOPIC_WASTE)

client.loop_forever()

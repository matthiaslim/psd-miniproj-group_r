import paho.mqtt.client as mqtt
import pandas as pd
import json  # Needed for JSON parsing
from datetime import datetime

# MQTT Broker and Topics
BROKER = "localhost"
TOPIC_ELEC = "sensor/electricity"
TOPIC_WATER = "sensor/water"
TOPIC_WASTE = "sensor/waste"

# Store incoming values
incoming_data = {"timestamp": None, "energy_usage_kWh": None, "water_usage_liters": None, "material_waste_kg": None}

# Callback function to process received messages
def on_message(client, userdata, msg):
    global incoming_data

    try:
        # Parse JSON payload
        payload = json.loads(msg.payload.decode("utf-8"))

        # Extract timestamp and value
        timestamp = payload["timestamp"]
        value = payload["value"]

        # Assign data based on topic
        if msg.topic == TOPIC_ELEC:
            incoming_data["energy_usage_kWh"] = value
        elif msg.topic == TOPIC_WATER:
            incoming_data["water_usage_liters"] = value
        elif msg.topic == TOPIC_WASTE:
            incoming_data["material_waste_kg"] = value

        # Assign timestamp if it's the first data in a batch
        if incoming_data["timestamp"] is None:
            incoming_data["timestamp"] = timestamp

        # If all three values are received, save to CSV
        if None not in incoming_data.values():
            save_data(incoming_data)
            incoming_data["timestamp"] = None  # Reset timestamp for next batch

    except json.JSONDecodeError:
        print(f"Error decoding JSON message: {msg.payload}")

    except KeyError:
        print(f"Invalid JSON format: {msg.payload}")

# Function to append new data to CSV
def save_data(data):
    try:
        # Convert dictionary to DataFrame
        df = pd.DataFrame([data])
        
        # Append to CSV (creating file if needed)
        df.to_csv("mock_consumption_data.csv", mode='a', header=not pd.io.common.file_exists("mock_consumption_data.csv"), index=False)
        
        print(f"Saved Data: {data}")

    except Exception as e:
        print(f"Error saving data: {e}")

# Set up MQTT client
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_message = on_message
client.connect(BROKER, 1883, 60)

# Subscribe to topics
client.subscribe(TOPIC_ELEC)
client.subscribe(TOPIC_WATER)
client.subscribe(TOPIC_WASTE)

# Start MQTT loop
client.loop_forever()

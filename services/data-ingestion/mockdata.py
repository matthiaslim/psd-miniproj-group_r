import paho.mqtt.client as mqtt
import time
import numpy as np
import json
from datetime import datetime
import random

BROKER = "mosquitto"
TOPIC_ELEC = "sensor/electricity"
TOPIC_WATER = "sensor/water"
TOPIC_WASTE = "sensor/waste"

# Initialize MQTT client
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.connect(BROKER, 1883, 60)

def generate_reading(normal_range, anomaly_range, anomaly_chance=0.05):
    """Generates a normal sensor reading with a small chance of an anomaly."""
    if random.random() < anomaly_chance:
        return round(random.uniform(*anomaly_range), 2)  
    return round(random.uniform(*normal_range), 2)  

try:
    while True:
        # Generate timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")

        electricity_usage = generate_reading(
            normal_range=(0.5, 10.0), 
            anomaly_range=(-50, 500),  
            anomaly_chance=0.05
        )

        water_usage = generate_reading(
            normal_range=(10, 100), 
            anomaly_range=(0, 10000), 
            anomaly_chance=0.05
        )
        
        waste_usage = generate_reading(
            normal_range=(10, 1000), 
            anomaly_range=(0, 10000), 
            anomaly_chance=0.05
        )

        # Format as JSON before publishing
        energy_payload = json.dumps({"timestamp": timestamp, "value": electricity_usage})
        water_payload = json.dumps({"timestamp": timestamp, "value": water_usage})
        waste_payload = json.dumps({"timestamp": timestamp, "value": waste_usage})

        # Publish each value to the respective MQTT topic
        client.publish(TOPIC_ELEC, energy_payload)
        client.publish(TOPIC_WATER, water_payload)
        client.publish(TOPIC_WASTE, waste_payload)

        print(f"Sent -> Electricity: {electricity_usage:.2f} kWh | Water: {water_usage:.2f} L | Waste: {waste_usage:.2f} KG")
        
        # Change the timing as needed (currently 10 seconds)
        time.sleep(10)

except KeyboardInterrupt:
    print("Stopping mock data sender.")
    client.disconnect()

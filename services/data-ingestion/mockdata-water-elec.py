import paho.mqtt.client as mqtt
import random
import time
import os

BROKER = os.getenv("BROKER", "localhost")

TOPIC_ELEC = "sensor/electricity"
TOPIC_WATER = "sensor/water"


client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.connect(BROKER, 1883, 200)

def generate_reading(normal_range, anomaly_range, anomaly_chance=0.05):
    """Generates a normal sensor reading with a small chance of an anomaly."""
    if random.random() < anomaly_chance:
        return round(random.uniform(*anomaly_range), 2)  
    return round(random.uniform(*normal_range), 2)  

try:
    while True:
        current_time = time.time()

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

        client.publish(TOPIC_ELEC, electricity_usage)
        client.publish(TOPIC_WATER, water_usage)
        print(f"Sent -> Electricity: {electricity_usage} kWh | Water: {water_usage} L")

        time.sleep(10) 

except KeyboardInterrupt:
    print("Stopping mock data sender.")
    client.disconnect()

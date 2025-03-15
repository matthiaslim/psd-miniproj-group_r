import paho.mqtt.client as mqtt
import random
import time
import os

BROKER = os.getenv("BROKER", "localhost")

TOPIC_WASTE = "sensor/waste"
TOPIC_PETROL = "sensor/petrol"

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.connect(BROKER, 1883, 200)

def generate_reading(normal_range, anomaly_range, anomaly_chance=0.05):
    """Generates a normal sensor reading with a small chance of an anomaly."""
    if random.random() < anomaly_chance:
        return round(random.uniform(*anomaly_range), 2)  
    return round(random.uniform(*normal_range), 2)  


while True:
    user_choice = input("Choose which data to generate (waste/petrol): ").strip().lower()
    if user_choice in ["waste", "petrol"]:
        break
    print("Invalid choice! Please enter 'waste' or 'petrol'.")

try:

    if user_choice == "waste":
        waste_usage = generate_reading(
            normal_range=(10, 1000), 
            anomaly_range=(0, 10000), 
            anomaly_chance=0.05
        )
        client.publish(TOPIC_WASTE, waste_usage)
        print(f"Sent -> Waste: {waste_usage} kg")

    elif user_choice == "petrol":
        petrol_usage = generate_reading(
            normal_range=(10, 100), 
            anomaly_range=(0, 10000), 
            anomaly_chance=0.05
        )
        client.publish(TOPIC_PETROL, petrol_usage)
        print(f"Sent -> Petrol: {petrol_usage} L")
        
except KeyboardInterrupt:
    print(f"Stopping {user_choice} generator.")
    client.disconnect()

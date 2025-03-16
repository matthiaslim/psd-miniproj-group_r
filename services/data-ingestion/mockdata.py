import paho.mqtt.client as mqtt
import time
import numpy as np
import json
from datetime import datetime

BROKER = "localhost"
TOPIC_ELEC = "sensor/electricity"
TOPIC_WATER = "sensor/water"
TOPIC_WASTE = "sensor/waste"

# Initialize MQTT client
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.connect(BROKER, 1883, 60)

try:
    while True:
        # Generate timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")

        # Generate random sensor values
        electricity_usage = np.random.uniform(50, 100)  # Single value
        water_usage = np.random.uniform(1000, 1500)  # Single value
        waste_usage = np.random.uniform(25, 50)  # Single value

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

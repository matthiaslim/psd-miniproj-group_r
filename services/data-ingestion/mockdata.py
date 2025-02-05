import paho.mqtt.client as mqtt
import random
import time

BROKER = "localhost"  
TOPIC_ELEC = "sensor/electricity"
TOPIC_WATER = "sensor/water"

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.connect(BROKER, 1883, 60)

try:
    while True:
        # Generate Random Values for both elec and water <- (Assuming using sensor/mqtt)
        electricity_usage = round(random.uniform(0.5, 10.0), 2)

        water_usage = round(random.uniform(10, 100), 2)

        client.publish(TOPIC_ELEC, electricity_usage)
        client.publish(TOPIC_WATER, water_usage)

        print(f"Sent -> Electricity: {electricity_usage} kWh | Water: {water_usage} L")
        
        #change the timing as needed, now 10 seconds
        time.sleep(10)  

except KeyboardInterrupt:
    print("Stopping mock data sender.")
    client.disconnect()

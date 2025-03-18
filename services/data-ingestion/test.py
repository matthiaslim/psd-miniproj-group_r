import sys
print("Python version:", sys.version)
print("Hello from test script")

# Try importing required modules
try:
    import paho.mqtt.client as mqtt
    print("Successfully imported paho-mqtt")
except Exception as e:
    print("Error importing paho-mqtt:", e)

try:
    import pymysql
    print("Successfully imported pymysql")
except Exception as e:
    print("Error importing pymysql:", e)

try:
    import cryptography
    print("Successfully imported cryptography")
except Exception as e:
    print("Error importing cryptography:", e)

# Exit with success
print("Test completed successfully")
import os
import sys
import time

print("Starting minimal server test...")

# Print environment variables
print("Environment variables:")
print(f"DB_HOST: {os.environ.get('DB_HOST', 'not set')}")
print(f"DB_USER: {os.environ.get('DB_USER', 'not set')}")
print(f"DB_PASS: {os.environ.get('DB_PASS', 'not set')}")
print(f"DB_NAME: {os.environ.get('DB_NAME', 'not set')}")
print(f"DB_PORT: {os.environ.get('DB_PORT', 'not set')}")
print(f"BROKER: {os.environ.get('BROKER', 'not set')}")

# Try importing modules one by one
try:
    print("Importing pymysql...")
    import pymysql
    print("Successfully imported pymysql")
except Exception as e:
    print(f"Error importing pymysql: {e}")
    sys.exit(1)

try:
    print("Importing paho.mqtt.client...")
    import paho.mqtt.client as mqtt
    print("Successfully imported paho.mqtt.client")
except Exception as e:
    print(f"Error importing paho.mqtt.client: {e}")
    sys.exit(1)

print("All imports successful")
print("Sleeping for 60 seconds to keep container alive...")
time.sleep(60)
print("Minimal server test completed")
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Generate timestamps for the last 30 days
start_date = datetime.now() - timedelta(days=365)
timestamps = [start_date + timedelta(hours=i) for i in range(365 * 24)]  # 30 days of hourly data

# Generate mock data for energy, water, and material consumption
data = {
    "timestamp": timestamps,
    # "department": np.random.choice(["Manufacturing", "IT", "HR", "Operations"], len(timestamps)),
    "energy_usage_kWh": np.random.uniform(50, 100, len(timestamps)),  # Simulating energy use
    "water_usage_liters": np.random.uniform(1000, 1500, len(timestamps)),  # Simulating water use
    "material_waste_kg": np.random.uniform(25, 50, len(timestamps)),  # Simulating material waste
}

df = pd.DataFrame(data)
df.to_csv("mock_consumption_data.csv", index=False)

print("Mock data generated and saved as CSV!")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from prophet import Prophet
from sklearn.ensemble import IsolationForest
import uvicorn
from datetime import datetime
import threading
import time


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load mock data
df = pd.read_csv("mock_consumption_data.csv")
df["timestamp"] = pd.to_datetime(df["timestamp"])

# Function to train forecasting model for a specific column
def train_forecast_model(column_name):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
    print(f"Model training: {column_name} time:{timestamp}")
    df_prophet = df[["timestamp", column_name]].rename(columns={"timestamp": "ds", column_name: "y"})
    model = Prophet()
    model.fit(df_prophet)
    return model

# Train separate forecasting models
energy_model = train_forecast_model("energy_usage_kWh")
water_model = train_forecast_model("water_usage_liters")
material_model = train_forecast_model("material_waste_kg")

from fastapi import Query

@app.get("/forecast")
def get_forecast(hours: int = Query(24, description="Number of hours to predict into the future")):
    """
    Forecasts future energy, water, and material consumption dynamically based on user input.
    
    Parameters:
        hours (int): Number of hours to predict into the future (default is 24).
    
    Returns:
        dict: Forecasted values for energy, water, and material consumption.
    """
    if hours <= 0:
        return {"error": "Prediction hours must be greater than zero."}

    future = pd.DataFrame({"ds": pd.date_range(start=df["timestamp"].max(), periods=hours, freq="h")})

    def format_datetime(value):
        return datetime.strftime(value, "%b %d, %Y - %I:%M %p")  # Example: "Mar 15, 2025 - 02:15 AM"

    return {
        "energy": energy_model.predict(future)[["ds", "yhat"]]
                   .assign(ds=lambda x: x["ds"].apply(format_datetime))
                   .sort_values("ds")
                   .to_dict(orient="records"),
        "water": water_model.predict(future)[["ds", "yhat"]]
                  .assign(ds=lambda x: x["ds"].apply(format_datetime))
                  .sort_values("ds")
                  .to_dict(orient="records"),
        "material": material_model.predict(future)[["ds", "yhat"]]
                     .assign(ds=lambda x: x["ds"].apply(format_datetime))
                     .sort_values("ds")
                     .to_dict(orient="records"),
    }

# Train IsolationForest model for anomaly detection
def train_anomaly_model():
    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(df[["energy_usage_kWh", "water_usage_liters", "material_waste_kg"]])
    return model

anomaly_model = train_anomaly_model()

@app.get("/anomalies")
def detect_anomalies():
    df["anomaly"] = anomaly_model.predict(df[["energy_usage_kWh", "water_usage_liters", "material_waste_kg"]])
    anomalies = df[df["anomaly"] == -1]

    mean_values = df[["energy_usage_kWh", "water_usage_liters", "material_waste_kg"]].mean()
    anomalies["energy_deviation"] = anomalies["energy_usage_kWh"] - mean_values["energy_usage_kWh"]
    anomalies["water_deviation"] = anomalies["water_usage_liters"] - mean_values["water_usage_liters"]
    anomalies["material_deviation"] = anomalies["material_waste_kg"] - mean_values["material_waste_kg"]

    anomalies["anomaly_reason"] = anomalies.apply(lambda row: "High Usage" if row["energy_deviation"] > 100 else "Sudden Drop", axis=1)

    return anomalies[["timestamp", "energy_usage_kWh", "water_usage_liters", "material_waste_kg", "energy_deviation", "water_deviation", "material_deviation", "anomaly_reason"]].to_dict(orient="records")

# Model retraining
def retrain_models():
    global energy_model, water_model, material_model
    while True:
        time.sleep(600)  #delay for model retraining
        print("Retraining models...")

        energy_model = train_forecast_model("energy_usage_kWh")
        water_model = train_forecast_model("water_usage_liters")
        material_model = train_forecast_model("material_waste_kg")

# Start retraining in a separate thread
threading.Thread(target=retrain_models, daemon=True).start()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3002)

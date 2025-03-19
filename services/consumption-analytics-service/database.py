from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
import os
from datetime import datetime
from typing import List

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "mysql"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASS", "admin"),
        database=os.getenv("DB_NAME", "sustainable_consumption"),
    )

@app.get("/api/consumption-analytics/{column}", response_model=List[dict])
async def get_analytics(column: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = f"SELECT timestamp, {column} FROM consumption"
        cursor.execute(query)
        data = cursor.fetchall()

        cursor.close()
        conn.close()

        # Return the data as a JSON response
        return data

    except Exception as e:
        # If an error occurs, raise an HTTP exception
        raise HTTPException(status_code=500, detail=str(e))

# Run the FastAPI app with Uvicorn (optional if you're running via docker or a server)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3003)

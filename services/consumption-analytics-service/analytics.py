from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
import os
from datetime import datetime, timedelta
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

@app.get("/{column}", response_model=List[dict])
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

@app.get("/{range}/{column}", response_model=List[dict])
async def get_analytics_range(range: str, column: str):
    now = datetime.now()
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        if range == "daily":
            query = f"""
                SELECT timestamp, {column} 
                FROM consumption 
                WHERE timestamp >= '{now.strftime('%Y-%m-%d')} 00:00:00' 
                AND timestamp <= '{now.strftime('%Y-%m-%d')} 23:59:59'
            """
        elif range == "weekly":
            week_start = now - timedelta(days=now.weekday())  
            week_end = week_start + timedelta(days=7) - timedelta(seconds=1)
            query = f"""
                SELECT DATE(timestamp) as timestamp, SUM({column}) as {column} 
                FROM consumption 
                WHERE timestamp >= '{week_start.strftime('%Y-%m-%d')}'
                AND timestamp <= '{week_end.strftime('%Y-%m-%d')} '
                GROUP BY DATE(timestamp)
            """
        elif range == "monthly":
            month_start = now.replace(day=1)
            month_end = now.replace(day=1, month=now.month+1) - timedelta(seconds=1)
            query = f"""
                SELECT DATE(timestamp) as timestamp, SUM({column}) as {column}  
                FROM consumption 
                WHERE timestamp >= '{month_start.strftime('%Y-%m-%d')}'
                AND timestamp <= '{month_end.strftime('%Y-%m-%d')}'
                GROUP BY DATE(timestamp)
            """
        else:
            raise HTTPException(status_code=400, detail="Invalid range parameter. Valid values are 'daily', 'weekly', 'monthly'.")

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

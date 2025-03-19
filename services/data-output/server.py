from flask import Flask, jsonify
from flask_cors import CORS
import pymysql
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

PORT = os.getenv('PORT', 3001)
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'mysql'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASS', 'admin'),
    'db': os.getenv('DB_NAME', 'sustainable_consumption'),
    'port': int(os.getenv('DB_PORT', 3306))
}

def get_db_connection():
    return pymysql.connect(
        host=DB_CONFIG['host'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        database=DB_CONFIG['db'],
        port=DB_CONFIG['port'],
        cursorclass=pymysql.cursors.DictCursor
    )

@app.route('/latest', methods=['GET'])
def get_latest_consumption():
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT * FROM consumption 
                ORDER BY timestamp DESC 
                LIMIT 1
            """)
            result = cursor.fetchone()
            conn.close()

            if result:
                return jsonify({
                    'timestamp': result['timestamp'].isoformat(),
                    'electricity': float(result['electricity']) if result['electricity'] else None,
                    'water': float(result['water']) if result['water'] else None,
                    'waste': float(result['waste']) if result['waste'] else None
                })
            return jsonify(None)
    except Exception as e:
        print(f"Error fetching latest consumption: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/history', methods=['GET'])
def get_consumption_history():
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT * FROM consumption 
                WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
                ORDER BY timestamp DESC 
                LIMIT 20
            """)
            results = cursor.fetchall()
            conn.close()

            return jsonify([{
                'timestamp': row['timestamp'].isoformat(),
                'electricity': float(row['electricity']) if row['electricity'] else None,
                'water': float(row['water']) if row['water'] else None,
                'waste': float(row['waste']) if row['waste'] else None
            } for row in results])
    except Exception as e:
        print(f"Error fetching consumption history: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/by-type/<type>', methods=['GET'])
def get_consumption_by_type(type):
    valid_types = ['electricity', 'water', 'waste']
    if type not in valid_types:
        return jsonify({'error': 'Invalid type'}), 400

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(f"""
                SELECT timestamp, {type} as value
                FROM consumption 
                WHERE {type} IS NOT NULL
                ORDER BY timestamp DESC 
                LIMIT 20
            """)
            results = cursor.fetchall()
            conn.close()

            return jsonify([{
                'timestamp': row['timestamp'].isoformat(),
                'value': float(row['value'])
            } for row in results])
    except Exception as e:
        print(f"Error fetching {type} consumption: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT)
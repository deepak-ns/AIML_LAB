import sys
import json
import psycopg2
import numpy as np
import time # Added for the continuous loop and sleep function
from datetime import datetime, timedelta

# Note: psycopg2, numpy, and python-dateutil (via datetime) must be installed.
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="backend/.env") 

# --- Configuration ---
DB_PARAMS = {
    "host": os.getenv("DB_HOST"),
    "database": os.getenv("DB_DATABASE"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD")
}

SENSORS = ["ps1", "vs1", "se", "ce", "cp", "ts1", "fs1", "eps1"]

RAW_TABLES = {
    "ps1":"ps1_data", "vs1": "vs1_data", "se": "se_data", "ce": "ce_data",
    "cp": "cp_data", "ts1": "ts_data", "fs1":"fs1_data", "eps1":"eps1_data"
}

VALUE_COLUMN = {
    "ps1": "value", "ts1": "ts1", "vs1": "value", "se": "value",
    "ce": "value", "cp": "value", "fs1":"value", "eps1":"value"
}
# --- End Configuration ---

def get_db_connection():
    """Establishes and returns a database connection."""
    try:
        return psycopg2.connect(**DB_PARAMS)
    except psycopg2.Error as e:
        # Changed ConnectionError to a standard Exception for simplicity
        raise Exception(f"Error connecting to database: {e}") 

def simulate_and_insert_raw_data(conn, machine_id, cycle_id, points_per_cycle=60):
    """
    Generates synthetic sensor data for one cycle across all sensors
    and inserts it into the raw data tables.
    """
    cur = conn.cursor()
    # Use the current time as the "arrival time" for the cycle data
    start_time = datetime.now()

    # Simple base ranges for simulation
    sensor_ranges = {
        "ps1": (160, 175, 1.5), "vs1": (0.0, 1.5, 0.1), "se": (5, 8, 0.5),
        "ce": (50, 65, 2.0), "cp": (8, 12, 1.0), "ts1": (35, 45, 1.0),
        "fs1": (5, 7, 0.5), "eps1": (1, 5, 0.5)
    }

    # Define a time resolution: 1.0s interval for 60 points = 60-second cycle
    SAMPLE_INTERVAL = timedelta(seconds=1.0)

    for sensor in SENSORS:
        table = RAW_TABLES[sensor]
        value_col = VALUE_COLUMN[sensor]
        min_v, max_v, std_d = sensor_ranges[sensor]

        # Simulate noisy data around the mean
        mean_v = (min_v + max_v) / 2
        data = np.random.normal(mean_v, std_d, points_per_cycle)
        data = np.clip(data, min_v, max_v)

        for i, value in enumerate(data):
            # Calculate the specific timestamp for this reading
            current_timestamp = start_time + (SAMPLE_INTERVAL * i)
            
            cur.execute(
                f"""
                INSERT INTO {table} (machine_id, cycle_id, time, {value_col})
                VALUES (%s, %s, %s, %s)
                """,
                # Pass the datetime object, which psycopg2 handles correctly for 'timestamp with time zone'
                (machine_id, cycle_id, current_timestamp, float(value))
            )
            
    conn.commit() # Commit once after all sensor data for the cycle is prepared
    cur.close()
    return start_time

def main():
    """Reads arguments and runs the simulator continuously."""
    
    # 1. Argument Validation
    if len(sys.argv) != 3:
        print("Usage: python data_simulator.py <machine_id> <starting_cycle_id>", file=sys.stderr)
        sys.exit(1)
    
    try:
        machine_id = int(sys.argv[1])
        cycle_id = int(sys.argv[2]) # This will be the starting cycle ID
    except ValueError:
        print("Error: machine_id and starting_cycle_id must be integers.", file=sys.stderr)
        sys.exit(1)

    # 2. Continuous Loop
    while True:
        conn = None
        try:
            # 2a. Get DB Connection
            print(f"--- Attempting to insert data for Cycle ID: {cycle_id} ---")
            conn = get_db_connection()
            
            # 2b. Simulate and Insert
            start_time = simulate_and_insert_raw_data(conn, machine_id, cycle_id)

            print(f"✅ Successfully simulated and inserted raw data for Machine ID: {machine_id}, Cycle ID: {cycle_id}. Cycle started at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")

        except Exception as e:
            print(f"❌ Simulation failed for Cycle ID {cycle_id}: {e}", file=sys.stderr)
            # Log error and continue to the next iteration (try again later)
            
        finally:
            # 2c. Close Connection
            if conn:
                conn.close()
                
        # 2d. Increment Cycle ID and Wait
        cycle_id += 1
        
        # Wait for 60 seconds (1 minute) before the next cycle
        WAIT_TIME_SECONDS = 60 
        print(f"🕒 Waiting for {WAIT_TIME_SECONDS} seconds before starting Cycle ID: {cycle_id}...")
        time.sleep(WAIT_TIME_SECONDS) 

if __name__ == "__main__":
    main()
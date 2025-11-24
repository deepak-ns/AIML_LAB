import sys
import json
import psycopg2
import pandas as pd
import numpy as np
import joblib
from scipy.stats import skew, kurtosis
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

DB_PARAMS = {
    "host": os.getenv("DB_HOST"),
    "database": os.getenv("DB_DATABASE"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD")
}
# 8 Sensors
SENSORS = ["ps1", "vs1", "se", "ce", "cp", "ts1", "fs1", "eps1"]

RAW_TABLES = {
    "ps1":"ps1_data", "vs1": "vs1_data", "se": "se_data", "ce": "ce_data", 
    "cp": "cp_data", "ts1": "ts_data", "fs1":"fs1_data", "eps1":"eps1_data"
}

FEATURE_TABLES = {
    "ps1":"ps1_features", "ts1": "ts1_features", "vs1": "vs1_features", 
    "se": "se_features", "ce": "ce_features", "cp": "cp_features", 
    "fs1":"fs1_features", "eps1":"eps1_features"
}

# The column name in the raw data table that holds the sensor reading
VALUE_COLUMN = {
    "ps1": "value", "ts1": "ts1", "vs1": "value", "se": "value", 
    "ce": "value", "cp": "value", "fs1":"value", "eps1":"value"
}

# --- ML Model Initialization (Using Dummy Fallback) ---
# NOTE: The script assumes your ML models are saved in a 'models/' directory.
# Since the actual models are not available, a dummy prediction is used if loading fails.
models = None
try:
    # Note on UserWarning: If you are seeing a version warning from XGBoost, 
    # it means your joblib files were saved with an older version of the library.
    # It's recommended to retrain and resave your models with your current XGBoost version.
    models = {
        "cooler": joblib.load("models/cooler.joblib"),
        "valve": joblib.load("models/valve.joblib"),
        "pump": joblib.load("models/pump.joblib"),
        "accumulator": joblib.load("models/accumulator.joblib")
    }
except FileNotFoundError:
    print("Warning: ML models not found. Using dummy prediction logic.", file=sys.stderr)
    
def dummy_predict(features):
    """Provides placeholder predictions when joblib models are missing."""
    # Use different features for variation in dummy output
    f_ps1_mean = features[0] 
    f_vs1_std = features[12]
    f_ce_mean = features[33]
    f_fs1_max = features[66]

    # Simple scaling logic to keep outputs between 0 and 1
    return {
        "cooler_condition": max(0.0, min(1.0, 1.0 - (f_ps1_mean / 200))), 
        "valve_condition": max(0.0, min(1.0, f_vs1_std * 5)),
        "internal_leakage": max(0.0, min(1.0, 1.0 - (f_ce_mean / 70))),
        "hydraulic_accumulator": max(0.0, min(1.0, f_fs1_max / 10)),
    }

# ---------------------------------------------------
# Feature Calculation Functions
# ---------------------------------------------------

def extract_11_features(values):
    """Calculates the 11 required features for a series of sensor values."""
    if len(values) < 2:
        diff = np.array([0.0])
        values = np.append(values, values[0] if values.size > 0 else 0)
    else:
        diff = np.diff(values)
        
    if values.size == 0:
        values = np.array([0.0])

    return [
        np.mean(values),
        np.std(values),
        np.min(values),
        np.max(values),
        np.percentile(values, 25),
        np.percentile(values, 50),
        np.percentile(values, 75),
        skew(values),
        kurtosis(values),
        np.mean(diff),
        np.std(diff),
    ]

def get_db_connection():
    """Establishes and returns a database connection."""
    try:
        return psycopg2.connect(**DB_PARAMS)
    except psycopg2.Error as e:
        raise ConnectionError(f"Error connecting to database: {e}")

# NEW HELPER FUNCTION: Get the cycle's true start time from raw data
def get_cycle_start_time(conn, machine_id, cycle_id):
    """Retrieves the earliest timestamp (start_time) for the given cycle from the raw data."""
    cur = conn.cursor()
    query = """
        SELECT MIN(time) FROM ps1_data
        WHERE machine_id = %s AND cycle_id = %s
    """
    cur.execute(query, (machine_id, cycle_id))
    
    row = cur.fetchone()
    cur.close()

    if row and row[0] is not None:
        return row[0]
    else:
        # Raise an exception if no valid start time is found. 
        raise ValueError(f"CRITICAL: No raw data found to determine start_time for Machine {machine_id}, Cycle {cycle_id}.")


# ---------------------------------------------------
# STEP 1: Extract and Upload Features
# ---------------------------------------------------
def extract_and_upload_features(conn, machine_id, cycle_id):
    """
    Extracts features for the specified machine_id and cycle_id across 
    all raw tables and uploads them to the respective feature tables.
    """
    cur = conn.cursor()
    
    for sensor in SENSORS:
        raw_table = RAW_TABLES[sensor]
        feature_table = FEATURE_TABLES[sensor]
        value_col = VALUE_COLUMN[sensor]
        
        # 1. Load specific cycle data
        query = f"""
            SELECT {value_col} FROM {raw_table} 
            WHERE machine_id = %s AND cycle_id = %s 
            ORDER BY time
        """
        cur.execute(query, (machine_id, cycle_id))
        rows = cur.fetchall()
        
        if not rows:
            raise ValueError(f"No raw data found for sensor {sensor} (Table: {raw_table}) for cycle {cycle_id}")
            
        values = np.array([row[0] for row in rows], dtype=np.float64)
        
        # 2. Extract features
        temp_feats = extract_11_features(values)
        
        # Convert all NumPy floats to standard Python floats for psycopg2
        feats = [float(f) for f in temp_feats]
        
        # 3. Procedural UPSERT (Update or Insert) to avoid ON CONFLICT error
        feature_cols = [f"f{i+1}" for i in range(11)]
        update_set_parts = [f"{col} = %s" for col in feature_cols]
        
        # Values for update: feats + machine_id + cycle_id
        update_vals = feats + [machine_id, cycle_id] 
        
        # 3a. Attempt UPDATE
        update_query = f"""
            UPDATE {feature_table}
            SET {', '.join(update_set_parts)}
            WHERE machine_id = %s AND cycle_id = %s
        """
        cur.execute(update_query, update_vals)
        
        if cur.rowcount == 0:
            # 3b. If no rows were updated, INSERT (this means the record is new)
            all_cols = ["machine_id", "cycle_id"] + feature_cols
            placeholders = ', '.join(["%s"] * len(all_cols))
            insert_vals = [machine_id, cycle_id] + feats

            insert_query = f"""
                INSERT INTO {feature_table} ({', '.join(all_cols)})
                VALUES ({placeholders})
            """
            cur.execute(insert_query, insert_vals)
    
    conn.commit()
    cur.close()

# ---------------------------------------------------
# STEP 2 & 3: Predict and Upload Output
# ---------------------------------------------------
def predict_and_upload_output(conn, machine_id, cycle_id, cycle_start_time):
    """
    Loads features, runs prediction, and uploads results to model_outputs, 
    using the cycle_start_time for the timestamp.
    """
    cur = conn.cursor()
    all_features = []
    feature_cols = [f"f{i+1}" for i in range(11)]
    
    # 1. Aggregate 88 Features (11 features * 8 sensors)
    for table in FEATURE_TABLES.values():
        query = f"""
            SELECT {', '.join(feature_cols)} FROM {table} 
            WHERE machine_id = %s AND cycle_id = %s
        """
        cur.execute(query, (machine_id, cycle_id))
        row = cur.fetchone()

        if row:
            # Ensure features are converted to standard float
            all_features.extend([float(f) for f in list(row)])
        else:
            raise ValueError(f"Missing feature data in {table} for cycle {cycle_id}")

    if len(all_features) != 88:
        raise ValueError(f"Feature length mismatch: expected 88, got {len(all_features)}")

    # 2. Predict
    if models:
        # Use real models
        X = np.array(all_features).reshape(1, -1)
        results = {
            "cooler_condition": float(models["cooler"].predict(X)[0]),
            "valve_condition": float(models["valve"].predict(X)[0]),
            "internal_leakage": float(models["pump"].predict(X)[0]),
            "hydraulic_accumulator": float(models["accumulator"].predict(X)[0]),
        }
    else:
        # Use dummy prediction logic
        results = dummy_predict(all_features)

    # 3. Procedural UPSERT (Update or Insert) for model_outputs
    output_cols = ["output1", "output2", "output3", "output4", "start_time"]
    update_set_parts = [f"{col} = %s" for col in output_cols]
    
    update_vals = [
        results["cooler_condition"],
        results["valve_condition"],
        results["internal_leakage"],
        results["hydraulic_accumulator"],
        cycle_start_time, # PostgreSQL datetime object
        machine_id,
        cycle_id
    ]

    # 3a. Attempt UPDATE
    cur.execute(f"""
        UPDATE model_outputs
        SET {', '.join(update_set_parts)}
        WHERE machine_id = %s AND cycle_id = %s;
    """, update_vals)

    if cur.rowcount == 0:
        # 3b. If no rows were updated, INSERT
        cur.execute("""
            INSERT INTO model_outputs (machine_id, cycle_id, start_time, output1, output2, output3, output4)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            machine_id,
            cycle_id,
            cycle_start_time,
            results["cooler_condition"],
            results["valve_condition"],
            results["internal_leakage"],
            results["hydraulic_accumulator"]
        ))
    
    conn.commit()
    cur.close()
    
    # 4. Prepare JSON output for Node.js server capture
    output = {
        "status": "success",
        "machine_id": machine_id,
        "cycle_id": cycle_id,
        "start_time": cycle_start_time.isoformat(),
        "output1": results["cooler_condition"],
        "output2": results["valve_condition"],
        "output3": results["internal_leakage"],
        "output4": results["hydraulic_accumulator"],
    }
    return output

# ---------------------------------------------------
# Main Execution Function
# ---------------------------------------------------

def main():
    """Reads arguments and runs the feature extraction and prediction pipeline."""
    if len(sys.argv) != 3:
        error_msg = "Expected two command-line arguments: machine_id and cycle_id."
        print(json.dumps({"status": "error", "error": error_msg}), file=sys.stderr)
        sys.exit(1)

    try:
        machine_id = int(sys.argv[1])
        cycle_id = int(sys.argv[2])
    except ValueError:
        error_msg = "machine_id and cycle_id must be integers."
        print(json.dumps({"status": "error", "error": error_msg}), file=sys.stderr)
        sys.exit(1)

    conn = None
    try:
        conn = get_db_connection()
        
        cycle_start_time = get_cycle_start_time(conn, machine_id, cycle_id)
        
        # STEP 1: Extract and Upload Features
        extract_and_upload_features(conn, machine_id, cycle_id)

        # STEP 2 & 3: Predict, Upload Output, and get JSON result
        output_data = predict_and_upload_output(conn, machine_id, cycle_id, cycle_start_time)

        # Final output to stdout for Node.js server to capture
        # CRITICAL FIX: Add flush=True to ensure the output is immediately sent to the parent process.
        print(json.dumps(output_data), flush=True)
        
    except Exception as e:
        error_msg = f"Pipeline failed for Machine {machine_id}, Cycle {cycle_id}: {e}"
        print(error_msg, file=sys.stderr) 
        # Ensure error JSON is also flushed
        print(json.dumps({"status": "error", "error": error_msg}), flush=True)
        
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main()
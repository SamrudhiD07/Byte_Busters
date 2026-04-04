import os
import math
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from dotenv import load_dotenv

# --- 1. INITIALIZE FLASK APP ---
# This MUST come before any @app.route commands!
app = Flask(__name__)
CORS(app)

# --- 2. LOAD ENVIRONMENT VARIABLES ---
load_dotenv()

# --- 3. AI CONFIGURATION ---
# Securely fetch the API key from your local .env file
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("⚠️ WARNING: GEMINI_API_KEY not found in .env file!")
    
client = genai.Client(api_key=api_key)

# --- 4. DRONE FLEET & DISTANCE LOGIC ---
DRONE_FLEET = [
    {"id": "Alpha-1", "lat": 18.4575, "lng": 73.8508, "status": "AVAILABLE"},
    {"id": "Beta-2", "lat": 18.4529, "lng": 73.8587, "status": "AVAILABLE"},
    {"id": "Gamma-3", "lat": 18.5204, "lng": 73.8567, "status": "AVAILABLE"}
]

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def dispatch_drone():
    user_lat, user_lng = 18.5204, 73.8567 # Mocking Pune center
    min_dist, best_drone = float('inf'), None
    for drone in DRONE_FLEET:
        if drone['status'] == 'AVAILABLE':
            dist = calculate_distance(user_lat, user_lng, drone['lat'], drone['lng'])
            if dist < min_dist:
                min_dist, best_drone = dist, drone
    return best_drone, min_dist

# --- 5. ENDPOINT A: UI MANUAL TEXT TRIGGER ---
@app.route('/sos_trigger', methods=['POST'])
def handle_trigger():
    data = request.json
    user = data.get('user', 'Unknown')
    incident_type = data.get('type', 'General')
    details = data.get('details', [])
    manual_note = data.get('manual', '')

    print("\n" + "="*50)
    print(f"🚨 MANUAL UI SOS: {incident_type} reported by {user}")
    print(f"Tags: {details}")
    
    # Analyze the manual text note using Gemini
    severity = 50 # Default severity
    if manual_note and api_key:
        print("🧠 Analyzing manual details with Gemini...")
        try:
            prompt = f"Analyze this emergency description: '{manual_note}'. Return ONLY a number between 0 and 100 representing severity."
            response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
            severity = int(response.text.strip())
            print(f"AI Calculated Text Severity: {severity}/100")
        except Exception as e:
            print(f"Text Analysis Failed: {e}")

    best_drone, dist = dispatch_drone()
    drone_id = best_drone['id'] if best_drone else "NO DRONES AVAILABLE"
    print(f"🚁 Dispatched: {drone_id}")
    print("="*50 + "\n")

    return jsonify({"status": "SUCCESS", "drone_dispatched": drone_id})

# --- 6. ENDPOINT B: EDGE AI VIDEO TRIGGER ---
@app.route('/report_evidence', methods=['POST'])
def handle_evidence():
    report_data = request.json
    print("\n" + "="*50)
    print(f"📹 EDGE AI MEDIA ALERT RECEIVED!")
    print(f"Priority Level: {report_data.get('priority')}")
    print(f"Severity Score: {report_data.get('severity')}/100")
    print(f"AI Summary: {report_data.get('description')}")
    
    best_drone, dist = dispatch_drone()
    print(f"🚁 Confirming Dispatch: {best_drone['id'] if best_drone else 'None'}")
    print("="*50 + "\n")
    
    return jsonify({"status": "Command Center Received Media Report"}), 200

# --- 7. START SERVER ---
if __name__ == '__main__':
    print("📡 Guardian AI Command Center Booting Up...")
    # Running on 0.0.0.0 allows your phone to connect over Wi-Fi
    app.run(host='0.0.0.0', port=5001, debug=True, use_reloader=False)
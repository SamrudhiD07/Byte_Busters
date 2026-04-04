import os
import math
import random
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
from google import genai
from dotenv import load_dotenv

# --- 1. INITIALIZE FLASK APP ---
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# --- 2. LOAD ENVIRONMENT VARIABLES ---
load_dotenv()

# --- 3. AI CONFIGURATION ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("⚠️ WARNING: GEMINI_API_KEY not found in .env file!")
    
client = genai.Client(api_key=api_key) if api_key else None

# --- 5. DRONE FLEET & DISTANCE LOGIC ---
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

def dispatch_drone(user_lat, user_lng):
    min_dist, best_drone = float('inf'), None
    for drone in DRONE_FLEET:
        if drone['status'] == 'AVAILABLE':
            dist = calculate_distance(user_lat, user_lng, drone['lat'], drone['lng'])
            if dist < min_dist:
                min_dist, best_drone = dist, drone
    return best_drone, min_dist

# --- WebSocket Events (Optional but good for debugging) ---
@socketio.on('connect')
def handle_connect():
    print("✅ Dashboard connected to Python SocketIO!")

@socketio.on('disconnect')
def handle_disconnect():
    print("❌ Dashboard disconnected")

# --- 6. ENDPOINT A: UI MANUAL TEXT TRIGGER ---
@app.route('/sos_trigger', methods=['POST'])
def handle_trigger():
    data = request.json
    user = data.get('user', 'Unknown')
    incident_type = data.get('type', 'General')
    details = data.get('details', [])
    manual_note = data.get('manual', '')

    # Random offset for demo variation (within ~500m of Pune center)
    user_lat = 18.5204 + random.uniform(-0.004, 0.004)
    user_lng = 73.8567 + random.uniform(-0.004, 0.004)

    print("\n" + "="*50)
    print(f"🚨 MANUAL UI SOS: {incident_type} reported by {user}")
    print(f"📍 GPS: [{user_lat:.4f}, {user_lng:.4f}]")
    print(f"Tags: {details}")
    
    # Analyze the manual text note using Gemini
    severity = 50 # Default severity
    if manual_note and client:
        print("🧠 Analyzing manual details with Gemini...")
        try:
            prompt = f"Analyze this emergency description: '{manual_note}'. Return ONLY a number between 0 and 100 representing severity."
            response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
            severity = int(response.text.strip())
            print(f"AI Calculated Text Severity: {severity}/100")
        except Exception as e:
            print(f"Text Analysis Failed: {e}")

    best_drone, dist = dispatch_drone(user_lat, user_lng)
    drone_id = best_drone['id'] if best_drone else "NO DRONES AVAILABLE"
    print(f"🚁 Dispatched: {drone_id} ({dist:.2f} km away)")

    # ── EMIT DIRECTLY TO DASHBOARD OVER SOCKETIO ──
    try:
        # 1. Tell Map to blink at incident location
        socketio.emit('ui_pulse_location', {
            "lat": user_lat,
            "lng": user_lng,
            "type": incident_type,
            "user": user,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
        
        # 2. Open the Deploy Modal with drone info
        socketio.emit('trigger_deploy_prompt', {
            "droneId": drone_id,
            "distance": round(dist, 2),
            "lat": user_lat,
            "lng": user_lng,
            "type": incident_type,
            "user": user
        })
        
        # 3. Push to Active Service Calls panel
        socketio.emit('cctv_anomaly', {
            "id": f"SOS-{int(datetime.utcnow().timestamp())}",
            "label": f"SOS: {incident_type}",
            "confidence": 0.99,
            "location": [user_lat, user_lng],
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
        print("📡 Successfully emitted UI alerts to dashboard!")
    except Exception as e:
        print(f"⚠️ Socket Emission failed: {e}")

    print("="*50 + "\n")

    return jsonify({
        "status": "SUCCESS", 
        "drone_dispatched": drone_id,
        "location": [user_lat, user_lng],
        "severity": severity
    })

# --- 7. ENDPOINT B: EDGE AI VIDEO TRIGGER ---
@app.route('/report_evidence', methods=['POST'])
def handle_evidence():
    report_data = request.json
    print("\n" + "="*50)
    print(f"📹 EDGE AI MEDIA ALERT RECEIVED!")
    print(f"Priority Level: {report_data.get('priority')}")
    print(f"Severity Score: {report_data.get('severity')}/100")
    print(f"AI Summary: {report_data.get('description')}")
    
    best_drone, dist = dispatch_drone(18.5204, 73.8567)
    print(f"🚁 Confirming Dispatch: {best_drone['id'] if best_drone else 'None'}")

    # ── EMIT DIRECTLY TO DASHBOARD OVER SOCKETIO ──
    try:
        socketio.emit('update_intel_brief', {
            "report": {
                "severity": report_data.get('severity', 50),
                "priority": report_data.get('priority', 'HIGH'),
                "description": report_data.get('description', 'Evidence received from field.'),
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        })
        print("📡 Intel Brief emitted to dashboard!")
    except Exception as e:
        print(f"⚠️ Socket Emission failed: {e}")

    print("="*50 + "\n")
    
    return jsonify({"status": "Command Center Received Media Report"}), 200

# --- 8. UPLOAD VIDEO ENDPOINT (MOVED TO AI_ENGINE:5002) ---
# The video upload endpoint and disk writing logic has been relocated 
# to AI_Engine/api.py so it can be handled directly by the AI inference layer.

# --- 9. START SERVER ---
if __name__ == '__main__':
    print("\n" + "╔" + "═"*48 + "╗")
    print("║  📡 GUARDIAN AI COMMAND CENTER — PORT 5001      ║")
    print("║  Flask API + SocketIO + Gemini AI Active        ║")
    print("╚" + "═"*48 + "╝\n")
    socketio.run(app, host='0.0.0.0', port=5001, debug=True, use_reloader=False)
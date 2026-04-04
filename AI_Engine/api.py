import os
import cv2
import uuid
import shutil
import requests
import time
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SkyNetra AI Engine", description="Video Analysis using YOLO & OpenCV")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VIDEO_UPLOAD_FOLDER = os.path.join(BASE_DIR, 'video_input')
os.makedirs(VIDEO_UPLOAD_FOLDER, exist_ok=True)

# URL to Command Center to forward alerts to the UI
COMMAND_CENTER_URL = "http://127.0.0.1:5001/report_evidence"

# --- AI CONFIGURATION ---
try:
    from ultralytics import YOLO
    
    # Keeping YOLOv8n as requested by the user
    print("⏳ Loading YOLOv8n Object Detection model...")
    model_detect = YOLO('yolov8n.pt') 
    
    print("⏳ Loading YOLOv8n Pose Estimation model...")
    model_pose = YOLO('yolov8n-pose.pt')
    
    crash_model_path = os.path.join(BASE_DIR, 'custom_crash_model.pt')
    model_crash = YOLO(crash_model_path) if os.path.exists(crash_model_path) else None
except ImportError:
    print("⚠️ Ultralytics not found. Please run pip install ultralytics.")

# --- ALERT RELAY LOGIC ---
def generate_alert(incident_type: str, confidence: float, frame_number: int, video_name: str):
    """
    Relays a high-confidence incident to the dashboard immediately.
    """
    print(f"🚨 [NEW INCIDENT] {incident_type} (Conf: {confidence:.2f}) at Frame {frame_number}")
    
    payload = {
        "severity": 85 if confidence > 0.8 else 50,
        "priority": "CRITICAL" if confidence > 0.9 else "HIGH",
        "description": f"URGENT: {incident_type} identified in video stream '{video_name}' (First detection at {frame_number}).",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    
    try:
        requests.post(COMMAND_CENTER_URL, json=payload)
    except Exception as e:
        print(f"⚠️ Relay error: {e}")

def send_final_report(summary: dict, video_name: str):
    """
    Sends a final summary of all unique incidents found in the video.
    """
    found_str = ", ".join(summary.keys()) if summary else "No threats detected"
    print(f"📊 [FINAL REPORT] {video_name}: Found {found_str}")
    
    payload = {
        "severity": 100 if any(conf > 0.9 for conf in summary.values()) else 70,
        "priority": "FINAL_SUMMARY",
        "description": f"MISSION COMPLETE: Analysis for {video_name} is finished. Total findings: [{found_str}]. Drones on standby.",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    
    try:
        requests.post(COMMAND_CENTER_URL, json=payload)
    except Exception as e:
        print(f"⚠️ Final relay error: {e}")

def process_video(video_path: str):
    video_name = os.path.basename(video_path)
    print(f"▶️ [SCAN START] Analyzing: {video_name}")
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened(): return

    # De-spam trackers
    sent_incidents = set()
    incident_summary = {} # Tracks best confidence per type
    
    frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
        frame_count += 1
        if frame_count % 3 != 0: continue
            
        try:
            # --- 1. FALLEN PERSON DETECTION ---
            results_pose = model_pose(frame, verbose=False, conf=0.6)
            for r in results_pose:
                if r.keypoints and len(r.keypoints.xy[0]) > 16:
                    points = r.keypoints.xy[0]
                    nose_y, ankle_y = points[0][1], min(points[15][1], points[16][1])
                    box = r.boxes[0]
                    p_conf = float(box.conf[0])
                    x1, y1, x2, y2 = box.xyxy[0]
                    
                    if (ankle_y - nose_y) < (y2 - y1) * 0.4 or (x2 - x1) > (y2 - y1) * 1.5:
                        label = 'Fallen Individual'
                        incident_summary[label] = max(incident_summary.get(label, 0), p_conf)
                        if label not in sent_incidents:
                            generate_alert(label, p_conf, frame_count, video_name)
                            sent_incidents.add(label)
            
            # --- 2. CROWD SURGE DETECTION ---
            results_detect = model_detect.track(frame, persist=True, tracker="bytetrack.yaml", verbose=False, conf=0.6)
            if results_detect[0].boxes.id is not None:
                if len(results_detect[0].boxes.id) >= 15:
                    label = 'Crowd Surge Risk'
                    incident_summary[label] = max(incident_summary.get(label, 0), 0.9)
                    if label not in sent_incidents:
                        generate_alert(label, 0.9, frame_count, video_name)
                        sent_incidents.add(label)
            
            # --- 3. TRAFFIC CRASH DETECTION ---
            if model_crash:
                res_crash = model_crash(frame, verbose=False, conf=0.7)
                if len(res_crash[0].boxes) > 0:
                    label = 'Traffic Collision'
                    p_conf = float(res_crash[0].boxes.conf[0])
                    incident_summary[label] = max(incident_summary.get(label, 0), p_conf)
                    if label not in sent_incidents:
                        generate_alert(label, p_conf, frame_count, video_name)
                        sent_incidents.add(label)

        except Exception:
            continue
            
    cap.release()
    send_final_report(incident_summary, video_name)
    print(f"✅ [SCAN COMPLETE] Detections logged for {video_name}")

@app.post("/upload_video")
async def analyze_video(
    background_tasks: BackgroundTasks, 
    video: UploadFile = File(...),
    camera_id: str = Form("UNKNOWN_CAM")
):
    if not video.filename:
        return JSONResponse(status_code=400, content={"message": "No file uploaded"})
        
    ext = os.path.splitext(video.filename)[1]
    unique_filename = f"{camera_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(VIDEO_UPLOAD_FOLDER, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
        
    background_tasks.add_task(process_video, file_path)
    
    return JSONResponse(status_code=200, content={
        "status": "SUCCESS",
        "message": f"Video successfully received from {camera_id}. AI Analysis started.",
        "filename": unique_filename,
        "filepath": file_path
    })

if __name__ == '__main__':
    import uvicorn
    print("\n" + "╔" + "═"*48 + "╗")
    print("║  🚀 AI INFERENCE ENGINE — FASTAPI (PORT 5002)   ║")
    print("║  OpenCV + PyTorch + Ultralytics Pipeline Active ║")
    print("╚" + "═"*48 + "╝\n")
    uvicorn.run("api:app", host="0.0.0.0", port=5002, reload=True)

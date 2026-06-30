"""
color_detect.py
───────────────
Advanced computer vision pipeline for Rubik's Cube scanning.
Uses OpenCV edge contours, perspective warping, and a trained
PyTorch CNN Classifier to recognize sticker colors with confidence levels.
"""

import os
import cv2
import numpy as np
import base64
import torch
from sticker_model import StickerCNN, CLASSES

# Load Model
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sticker_cnn.pth")
model = None

def init_model():
    global model
    if model is not None:
        return
        
    model = StickerCNN()
    if not os.path.exists(MODEL_PATH):
        print("[*] sticker_cnn.pth not found! Auto-triggering model training...")
        from train_classifier import train_model
        train_model()
        
    # Load weights
    model.load_state_dict(torch.load(MODEL_PATH, map_location=torch.device('cpu')))
    model.eval()
    print("[*] StickerCNN PyTorch Model loaded successfully.")

# Bootstrap model load on import
init_model()

def adjust_white_balance(img: np.ndarray) -> np.ndarray:
    """Apply Gray World white balance to mitigate lighting casts."""
    b, g, r = cv2.split(img)
    avg_b = b.mean()
    avg_g = g.mean()
    avg_r = r.mean()
    if avg_b == 0 or avg_g == 0 or avg_r == 0:
        return img
    avg = (avg_b + avg_g + avg_r) / 3.0
    
    b = np.clip(b * (avg / avg_b), 0, 255).astype(np.uint8)
    g = np.clip(g * (avg / avg_g), 0, 255).astype(np.uint8)
    r = np.clip(r * (avg / avg_r), 0, 255).astype(np.uint8)
    return cv2.merge([b, g, r])

def detect_cube_face(img: np.ndarray) -> dict:
    """
    Detects the cube face, warps it using perspective transform,
    runs sticker patches through StickerCNN, and returns metrics.
    """
    h_orig, w_orig = img.shape[:2]
    
    # 1. Image preprocessing
    balanced = adjust_white_balance(img)
    gray = cv2.cvtColor(balanced, cv2.COLOR_BGR2GRAY)
    
    # Sharpness check
    sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
    is_blurry = sharpness < 32.0
    
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 11, 2
    )
    
    # Dilate lines to merge small gaps
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated = cv2.dilate(thresh, kernel, iterations=1)
    
    # 2. Find contours
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    best_poly = None
    max_area = 0
    img_area = h_orig * w_orig
    
    for c in contours:
        area = cv2.contourArea(c)
        if area < (img_area * 0.04):  # Ignore too small shapes
            continue
            
        perimeter = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.03 * perimeter, True)
        
        # We look for a convex 4-sided polygon (quadrilateral)
        if len(approx) == 4 and cv2.isContourConvex(approx):
            _, _, w_box, h_box = cv2.boundingRect(approx)
            aspect_ratio = float(w_box) / h_box
            if 0.75 <= aspect_ratio <= 1.35:
                if area > max_area:
                    max_area = area
                    best_poly = approx

    warped = None
    boundaries = []
    has_detection = False
    
    # 3. Perspective Warp if found, else fallback to center crop
    if best_poly is not None:
        pts = best_poly.reshape(4, 2)
        rect = np.zeros((4, 2), dtype="float32")
        
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]
        rect[2] = pts[np.argmax(s)]
        
        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]
        rect[3] = pts[np.argmax(diff)]
        
        dst = np.array([
            [0, 0],
            [270 - 1, 0],
            [270 - 1, 270 - 1],
            [0, 270 - 1]
        ], dtype="float32")
        
        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(balanced, M, (270, 270))
        
        for pt in pts:
            boundaries.append([float(pt[0]), float(pt[1])])
            
        has_detection = True
    else:
        size = int(min(h_orig, w_orig) * 0.45)
        cx, cy = w_orig // 2, h_orig // 2
        x0, y0 = cx - size // 2, cy - size // 2
        crop = balanced[y0:y0+size, x0:x0+size]
        if crop.size > 0:
            warped = cv2.resize(crop, (270, 270))
        else:
            warped = np.zeros((270, 270, 3), dtype=np.uint8)
        
        boundaries = [
            [float(x0), float(y0)],
            [float(x0 + size), float(y0)],
            [float(x0 + size), float(y0 + size)],
            [float(x0), float(y0 + size)]
        ]
        
    # 4. Segment and run predictions through StickerCNN model
    colors_list = []
    confidences = []
    
    for row in range(3):
        for col in range(3):
            cx_cell = col * 90 + 45
            cy_cell = row * 90 + 45
            
            # Crop 40x40 patch to capture enough colors
            patch = warped[cy_cell-20:cy_cell+20, cx_cell-20:cx_cell+20]
            resized = cv2.resize(patch, (32, 32))
            
            # Preprocess: float32, scaling to [0,1], convert BGR to RGB, transpose to (C, H, W)
            tensor_img = resized.astype(np.float32) / 255.0
            tensor_img = cv2.cvtColor(tensor_img, cv2.COLOR_BGR2RGB)
            tensor_img = np.transpose(tensor_img, (2, 0, 1))
            
            # Convert to PyTorch FloatTensor and add batch dimension
            torch_img = torch.tensor(tensor_img, dtype=torch.float32).unsqueeze(0)
            
            # Forward pass
            with torch.no_grad():
                outputs = model(torch_img)
                probs = torch.softmax(outputs, dim=1)
                val, idx = torch.max(probs, dim=1)
                
            colors_list.append(CLASSES[idx.item()])
            confidences.append(val.item() * 100.0)

    # 5. Compute overall confidence and status
    avg_confidence = int(np.mean(confidences))
    if not has_detection:
        avg_confidence = min(60, avg_confidence)
        status_msg = "Move Closer" if max_area == 0 else "Rotate Cube"
    elif is_blurry:
        avg_confidence = min(75, avg_confidence)
        status_msg = "Scanning... Hold Still"
    elif avg_confidence < 90:
        # If classification confidence is below 90%, prompt to rescan
        status_msg = "Rescan (Low Confidence)"
    else:
        status_msg = "Good Lighting"
        
    # Draw tracking boxes on the warped image for visual feedback
    feedback_img = warped.copy()
    for row in range(3):
        for col in range(3):
            x = col * 90
            y = row * 90
            cv2.rectangle(feedback_img, (x+5, y+5), (x+85, y+85), (0, 255, 0), 2)
            cv2.putText(
                feedback_img, colors_list[row*3+col], (x+38, y+52), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2
            )
            
    _, encoded = cv2.imencode('.jpg', feedback_img)
    preview_b64 = "data:image/jpeg;base64," + base64.b64encode(encoded).decode('utf-8')
    
    return {
        "detected": has_detection,
        "colors": colors_list,
        "boundaries": boundaries,
        "confidence": avg_confidence,
        "status": status_msg,
        "sharpness": round(sharpness, 1),
        "preview": preview_b64
    }

def detect_face_from_image(image_bytes: bytes) -> list[str]:
    """Backward compatibility fallback wrapper."""
    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        return ["W"] * 9
    res = detect_cube_face(img)
    return res["colors"]

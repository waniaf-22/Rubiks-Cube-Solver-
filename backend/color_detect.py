"""
color_detect.py
───────────────
Advanced computer vision pipeline for Rubik's Cube scanning.
Uses OpenCV, White Balance normalization, Adaptive Thresholding,
Contour approximation, Perspective Warp, and HSV classification.
"""

import cv2
import numpy as np
import base64

# Standard HSV References for classification
# OpenCV HSV: H in [0, 180], S in [0, 255], V in [0, 255]
HSV_REFS = {
    "R": 0,    # Red (also near 180)
    "O": 10,   # Orange
    "Y": 25,   # Yellow
    "G": 62,   # Green
    "B": 112,  # Blue
}

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

def classify_hsv(h: float, s: float, v: float) -> str:
    """Classify a single sticker using HSV colour space."""
    # White check: very low saturation, high value
    if s < 60 and v > 110:
        return "W"
    
    # Distance in Hue space (wrapping at 180)
    best_key = "R"
    best_dist = 999.0
    
    for key, ref_h in HSV_REFS.items():
        # Hue is circular [0, 180]
        dist = min(abs(h - ref_h), 180 - abs(h - ref_h))
        if dist < best_dist:
            best_dist = dist
            best_key = key
            
    return best_key

def detect_cube_face(img: np.ndarray) -> dict:
    """
    Detects the cube face, waps it using perspective transform,
    samples the 9 stickers in HSV space, and returns coordinates,
    colors, sharpness, confidence, and user status feedback.
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
            # Check aspect ratio
            _, _, w_box, h_box = cv2.boundingRect(approx)
            aspect_ratio = float(w_box) / h_box
            if 0.75 <= aspect_ratio <= 1.35:
                if area > max_area:
                    max_area = area
                    best_poly = approx

    warped = None
    boundaries = []
    
    # 3. Perspective Warp if found, else fallback to center crop
    if best_poly is not None:
        # Sort poly points: top-left, top-right, bottom-right, bottom-left
        pts = best_poly.reshape(4, 2)
        rect = np.zeros((4, 2), dtype="float32")
        
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]
        rect[2] = pts[np.argmax(s)]
        
        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]
        rect[3] = pts[np.argmax(diff)]
        
        # Warp to a standard 270x270 square
        dst = np.array([
            [0, 0],
            [270 - 1, 0],
            [270 - 1, 270 - 1],
            [0, 270 - 1]
        ], dtype="float32")
        
        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(balanced, M, (270, 270))
        
        # Calculate boundaries relative to original image coordinates for overlay
        # We also scale coordinates to percentages (0-100) for frontend styling
        for pt in pts:
            boundaries.append([float(pt[0]), float(pt[1])])
            
        has_detection = True
    else:
        # Fallback center crop (90x90 to 270x270 size)
        size = int(min(h_orig, w_orig) * 0.45)
        cx, cy = w_orig // 2, h_orig // 2
        x0, y0 = cx - size // 2, cy - size // 2
        crop = balanced[y0:y0+size, x0:x0+size]
        if crop.size > 0:
            warped = cv2.resize(crop, (270, 270))
        else:
            warped = np.zeros((270, 270, 3), dtype=np.uint8)
        
        # Boundaries represent the center box
        boundaries = [
            [float(x0), float(y0)],
            [float(x0 + size), float(y0)],
            [float(x0 + size), float(y0 + size)],
            [float(x0), float(y0 + size)]
        ]
        has_detection = False
        
    # 4. Segment and classify the 9 stickers
    colors_list = []
    hsv_warped = cv2.cvtColor(warped, cv2.COLOR_BGR2HSV)
    
    # We will sample 30x30 patches at the center of each of the 3x3 grids (size 90x90)
    for row in range(3):
        for col in range(3):
            # Center of the 90x90 cell
            cx_cell = col * 90 + 45
            cy_cell = row * 90 + 45
            
            # Extract 30x30 patch
            patch = hsv_warped[cy_cell-15:cy_cell+15, cx_cell-15:cx_cell+15]
            avg_hsv = patch.mean(axis=(0, 1))
            
            col_key = classify_hsv(avg_hsv[0], avg_hsv[1], avg_hsv[2])
            colors_list.append(col_key)

    # 5. Compute confidence and user feedback status
    confidence = 98 if has_detection else 60
    if is_blurry:
        confidence -= 20
        
    if not has_detection:
        status_msg = "Move Closer" if max_area == 0 else "Rotate Cube"
    elif is_blurry:
        status_msg = "Scanning... Hold Still"
    else:
        status_msg = "Good Lighting"
        
    # Draw tracking boxes on the warped image for a cool visual feedback
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
            
    # Encode feedback image to base64
    _, encoded = cv2.imencode('.jpg', feedback_img)
    preview_b64 = "data:image/jpeg;base64," + base64.b64encode(encoded).decode('utf-8')
    
    return {
        "detected": has_detection,
        "colors": colors_list,
        "boundaries": boundaries,
        "confidence": max(10, min(100, confidence)),
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

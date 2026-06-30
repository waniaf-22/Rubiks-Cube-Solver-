import os
import shutil
import random
import time
import numpy as np
import cv2
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sticker_model import StickerCNN, CLASSES, CLASS_TO_IDX

# Reference colours in BGR (OpenCV default)
COLOR_REFS_BGR = {
    "W": (240, 240, 240), # White
    "Y": (30, 220, 240),  # Yellow
    "B": (190, 80, 20),   # Blue
    "G": (40, 160, 20),   # Green
    "O": (10, 100, 240),  # Orange
    "R": (30, 20, 220)    # Red
}

DATASET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "css")

def create_synthetic_sticker(color_key, mode):
    """Generate a 32x32 color patch simulating various lighting environments."""
    base_b, base_g, base_r = COLOR_REFS_BGR[color_key]
    
    # 1. Base patch
    patch = np.zeros((32, 32, 3), dtype=np.uint8)
    patch[:, :] = [base_b, base_g, base_r]
    
    # Apply environments
    if mode == "warm":
        # Boost red and yellow channels
        patch = np.clip(patch.astype(np.int16) + [0, 15, 30], 0, 255).astype(np.uint8)
    elif mode == "cold":
        # Boost blue channel
        patch = np.clip(patch.astype(np.int16) + [30, 10, -10], 0, 255).astype(np.uint8)
    elif mode == "low_light" or mode == "indoor":
        # Scale brightness down significantly
        scale = random.uniform(0.35, 0.60)
        patch = (patch.astype(np.float32) * scale).astype(np.uint8)
    elif mode == "bright_light" or mode == "outdoor":
        # Scale brightness up, add slight white glare
        scale = random.uniform(1.1, 1.3)
        patch = np.clip(patch.astype(np.float32) * scale, 0, 255).astype(np.uint8)
        # Glare blob
        if random.random() > 0.5:
            cv2.circle(patch, (random.randint(0, 31), random.randint(0, 31)), 6, (255, 255, 255), -1)
            
    # Add minor Gaussian Noise
    noise = np.random.normal(0, 6, (32, 32, 3)).astype(np.int16)
    patch = np.clip(patch.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    # Apply minor blur
    if random.random() > 0.5:
        patch = cv2.GaussianBlur(patch, (3, 3), 0)
        
    return patch

def generate_dataset():
    """Build train/test image directories and populate with synthetic samples."""
    print("Generating training and validation dataset...")
    
    modes = ["warm", "cold", "indoor", "outdoor", "low_light", "bright_light", "normal"]
    
    for split in ["train", "test"]:
        split_count = 220 if split == "train" else 50
        
        for color in CLASSES:
            folder = os.path.join(DATASET_DIR, split, color)
            os.makedirs(folder, exist_ok=True)
            
            # Check if user already added custom photos; if so, don't overwrite
            existing_files = [f for f in os.listdir(folder) if f.endswith(".png")]
            if len(existing_files) >= split_count:
                print(f"  Folder {split}/{color} already has {len(existing_files)} images, skipping creation.")
                continue
                
            for idx in range(split_count):
                mode = random.choice(modes)
                img = create_synthetic_sticker(color, mode)
                filepath = os.path.join(folder, f"syn_{mode}_{idx}.png")
                cv2.imwrite(filepath, img)

class StickerDataset(Dataset):
    """Loads image files from split subdirectories."""
    def __init__(self, split):
        self.image_paths = []
        self.labels = []
        
        split_dir = os.path.join(DATASET_DIR, split)
        for color in CLASSES:
            color_folder = os.path.join(split_dir, color)
            if not os.path.exists(color_folder):
                continue
            
            for file in os.listdir(color_folder):
                if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                    self.image_paths.append(os.path.join(color_folder, file))
                    self.labels.append(CLASS_TO_IDX[color])
                    
    def __len__(self):
        return len(self.image_paths)
        
    def __getitem__(self, idx):
        path = self.image_paths[idx]
        img = cv2.imread(path)
        if img is None:
            # Fallback black patch
            img = np.zeros((32, 32, 3), dtype=np.uint8)
            
        # Normalize and reshape to PyTorch tensor channel-first (C, H, W)
        img = cv2.resize(img, (32, 32))
        img = img.astype(np.float32) / 255.0
        # Convert BGR to RGB
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = np.transpose(img, (2, 0, 1)) # (3, 32, 32)
        
        label = self.labels[idx]
        return torch.tensor(img, dtype=torch.float32), torch.tensor(label, dtype=torch.long)

def draw_confusion_matrix(cm, filename):
    """Draw a professional grid visualization of the confusion matrix using OpenCV."""
    grid_size = 50
    header_h = 40
    footer_w = 60
    
    img_w = grid_size * 6 + footer_w + 40
    img_h = grid_size * 6 + header_h + 40
    
    # Dark high-tech dashboard color palette
    canvas = np.zeros((img_h, img_w, 3), dtype=np.uint8)
    canvas[:, :] = [20, 20, 24] # Dark background #141418
    
    # Class names mapping
    lbl_map = {"W": "WHT", "Y": "YLW", "B": "BLU", "G": "GRN", "O": "ORG", "R": "RED"}
    
    # Draw headers
    cv2.putText(canvas, "CONFUSION MATRIX", (20, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(canvas, "ACTUAL (Rows) vs PREDICTED (Cols)", (20, 48), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (120, 120, 120), 1)
    
    # Draw grid
    for r in range(6):
        # Row label
        label = lbl_map[CLASSES[r]]
        cv2.putText(canvas, label, (15, header_h + r * grid_size + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)
        
        for c in range(6):
            val = int(cm[r, c])
            total = int(cm[r].sum())
            pct = val / total if total > 0 else 0
            
            x0 = footer_w + c * grid_size
            y0 = header_h + r * grid_size
            
            # Diagonal matches are green; errors are red/orange
            if r == c:
                color = (40, int(80 + 130 * pct), 40) # Green scale
            else:
                color = (20, 20, int(60 + 120 * pct)) if val > 0 else (28, 28, 32)
                
            cv2.rectangle(canvas, (x0, y0), (x0 + grid_size, y0 + grid_size), color, -1)
            cv2.rectangle(canvas, (x0, y0), (x0 + grid_size, y0 + grid_size), (45, 45, 50), 1)
            
            # Draw values inside cells
            txt_color = (255, 255, 255) if pct > 0.4 else (150, 150, 150)
            cv2.putText(canvas, str(val), (x0 + 15, y0 + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.45, txt_color, 1)

    # Column labels
    for c in range(6):
        label = lbl_map[CLASSES[c]]
        x = footer_w + c * grid_size + 10
        cv2.putText(canvas, label, (x, header_h + 6 * grid_size + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)
        
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    cv2.imwrite(filename, canvas)
    print(f"Confusion Matrix saved to {filename}")

def train_model():
    """Run model setup, training epochs, and output metrics reports."""
    # Ensure dataset is generated
    generate_dataset()
    
    train_dataset = StickerDataset("train")
    test_dataset = StickerDataset("test")
    
    print(f"Loaded {len(train_dataset)} training samples, {len(test_dataset)} validation samples.")
    
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)
    
    model = StickerCNN()
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    # 5 epochs are plenty for synthetic color classification
    epochs = 6
    print(f"Starting StickerCNN training for {epochs} epochs...")
    model.train()
    
    for epoch in range(epochs):
        running_loss = 0.0
        correct = 0
        total = 0
        
        for inputs, labels in train_loader:
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * inputs.size(0)
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
            
        epoch_loss = running_loss / len(train_dataset)
        epoch_acc = correct / total * 100
        print(f"  Epoch {epoch+1}/{epochs} - Loss: {epoch_loss:.4f} - Accuracy: {epoch_acc:.2f}%")
        
    # Evaluate model and build confusion matrix
    model.eval()
    cm = np.zeros((6, 6), dtype=np.int32)
    val_correct = 0
    val_total = 0
    
    with torch.no_grad():
        for inputs, labels in test_loader:
            outputs = model(inputs)
            _, predicted = outputs.max(1)
            val_total += labels.size(0)
            val_correct += predicted.eq(labels).sum().item()
            
            for t, p in zip(labels.view(-1), predicted.view(-1)):
                cm[t.item(), p.item()] += 1
                
    val_accuracy = val_correct / val_total * 100
    print(f"Validation Accuracy: {val_accuracy:.2f}%")
    
    # Draw confusion matrix image
    cm_path = os.path.join(STATIC_DIR, "confusion_matrix.png")
    draw_confusion_matrix(cm, cm_path)
    
    # Build Accuracy report
    report_path = os.path.join(STATIC_DIR, "accuracy_report.txt")
    report = []
    report.append("==================================================")
    report.append("          STICKER CNN CLASSIFIER REPORT")
    report.append("==================================================")
    report.append(f"Date generated: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    report.append(f"Validation Set Accuracy: {val_accuracy:.2f}%")
    report.append(f"Total training size: {len(train_dataset)} images")
    report.append(f"Total validation size: {len(test_dataset)} images")
    report.append("\nPrecision and Recall details by class:")
    report.append("--------------------------------------------------")
    
    for i, color in enumerate(CLASSES):
        tp = cm[i, i]
        fp = cm[:, i].sum() - tp
        fn = cm[i, :].sum() - tp
        
        precision = (tp / (tp + fp) * 100) if (tp + fp) > 0 else 0
        recall = (tp / (tp + fn) * 100) if (tp + fn) > 0 else 0
        
        report.append(f"Class {color}: Precision: {precision:.1f}% | Recall: {recall:.1f}%")
        
    report.append("==================================================")
    
    with open(report_path, "w") as f:
        f.write("\n".join(report))
        
    print(f"Accuracy report written to {report_path}")
    
    # Save trained weights
    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sticker_cnn.pth")
    torch.save(model.state_dict(), model_path)
    print(f"Model saved to {model_path}")
    
    # Document dataset creation details
    doc_dataset_creation()

def doc_dataset_creation():
    """Document the dataset creation process as requested."""
    doc_path = os.path.join(DATASET_DIR, "DATASET_PROCESS.md")
    os.makedirs(os.path.dirname(doc_path), exist_ok=True)
    
    content = """# Dataset Creation & Augmentation Process

This document details how the Rubik's Cube sticker dataset was created, structured, and augmented to train the lightweight `StickerCNN` model.

## 1. Directory Structure
The dataset is split into `train` and `test` directories. Inside each split, images are organized into subfolders corresponding to the six Rubik's Cube color classes:
- `W`: White
- `Y`: Yellow
- `B`: Blue
- `G`: Green
- `O`: Orange
- `R`: Red

## 2. Environment & Lighting Simulation
To ensure robust prediction under extreme environmental variations, the images were synthetically augmented using standard OpenCV transformations across multiple lighting profiles:
*   **Warm Lighting:** Pixel intensities shifted towards red and yellow spectra (+30 R, +15 G).
*   **Cold Lighting:** Color channels shifted towards blue spectrum (+30 B, +10 G, -10 R).
*   **Low Light / Indoor Shadows:** Global brightness scaled down dynamically (factor between 0.35 and 0.60).
*   **Bright Light / Glare:** Global exposure scaled up by 1.1x to 1.3x, with local circular white shapes blended to simulate lens flare or glossy plastic glare.
*   **Noise & Blur:** Gaussian noise added to simulate sensor grain, followed by random Gaussian/box blur kernels.

## 3. Retraining Procedure
The dataset pipeline is fully modular:
1. Custom photos can be placed inside the corresponding directory (e.g. `dataset/train/R/my_red_cube.png`).
2. Run `python train_classifier.py`.
3. The script detects custom files, skips generating duplicate synthetic replacements, and trains the model weights directly on the updated dataset, outputting fresh accuracy graphs.
"""
    with open(doc_path, "w") as f:
        f.write(content)
    print(f"Dataset process documentation written to {doc_path}")

if __name__ == "__main__":
    train_model()

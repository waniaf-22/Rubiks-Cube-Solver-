import torch
import torch.nn as nn
import torch.nn.functional as F

# Class mapping: index to Rubik's Cube color code
CLASSES = ["W", "Y", "B", "G", "O", "R"]
CLASS_TO_IDX = {c: i for i, c in enumerate(CLASSES)}

class StickerCNN(nn.Module):
    """
    Lightweight CNN classifier for Rubik's Cube sticker color recognition.
    Input size: 3x32x32 (RGB)
    Output size: 6 classes (W, Y, B, G, O, R)
    """
    def __init__(self):
        super(StickerCNN, self).__init__()
        
        # Block 1: Conv -> ReLU -> MaxPool (32x32 -> 16x16)
        self.conv1 = nn.Conv2d(3, 16, kernel_size=3, padding=1)
        self.pool1 = nn.MaxPool2d(2, 2)
        
        # Block 2: Conv -> ReLU -> MaxPool (16x16 -> 8x8)
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        self.pool2 = nn.MaxPool2d(2, 2)
        
        # Fully Connected Layers
        self.fc1 = nn.Linear(32 * 8 * 8, 64)
        self.dropout = nn.Dropout(0.25)
        self.fc2 = nn.Linear(64, 6)

    def forward(self, x):
        x = self.pool1(F.relu(self.conv1(x)))
        x = self.pool2(F.relu(self.conv2(x)))
        
        # Flatten
        x = x.view(-1, 32 * 8 * 8)
        
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        x = self.fc2(x)
        return x

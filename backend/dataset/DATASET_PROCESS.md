# Dataset Creation & Augmentation Process

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

#!/usr/bin/env python3
"""
Experimental card cropping script for workout exercise images.
Extracts individual exercise cards from photos of card collections.
"""

import cv2
import numpy as np
import os
import json
from pathlib import Path
import re

# Configuration
INPUT_IMAGES = [
    '../workout-cards-1.jpg',  # Bodyweight cards (yellow headers)
    '../workout-cards-2.jpg'   # Strength cards (gray headers)  
]
OUTPUT_DIR = '../images/exercises/cropped'
EXERCISES_FILE = '../data/exercises.json'

def load_exercises():
    """Load our exercise database"""
    with open(EXERCISES_FILE, 'r') as f:
        data = json.load(f)
    return {ex['id']: ex for ex in data['exercises']}

def normalize_exercise_name(name):
    """Normalize exercise name for matching"""
    return re.sub(r'[^a-z0-9]', '', name.lower().replace('&', 'and'))

def find_cards_in_image(image_path):
    """
    Detect individual exercise cards in an image using computer vision.
    Returns list of bounding boxes for detected cards.
    """
    print(f"Processing {image_path}...")
    
    # Read image
    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: Could not load {image_path}")
        return []
    
    height, width = img.shape[:2]
    print(f"Image size: {width}x{height}")
    
    # Convert to grayscale for processing
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Use adaptive thresholding to handle varying lighting
    thresh = cv2.adaptiveThreshold(blurred, 255, 
                                   cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                   cv2.THRESH_BINARY, 11, 2)
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Filter contours for card-like rectangles
    cards = []
    min_area = (width * height) * 0.005  # Min 0.5% of image area
    max_area = (width * height) * 0.25   # Max 25% of image area
    
    for contour in contours:
        area = cv2.contourArea(contour)
        if min_area < area < max_area:
            # Approximate the contour
            epsilon = 0.02 * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True)
            
            # Look for rectangles (4 corners)
            if len(approx) == 4:
                # Get bounding rectangle
                x, y, w, h = cv2.boundingRect(approx)
                
                # Filter by aspect ratio (cards should be roughly rectangular)
                aspect_ratio = w / h
                if 0.5 < aspect_ratio < 2.0:  # Reasonable card proportions
                    cards.append((x, y, w, h))
    
    print(f"Found {len(cards)} potential cards")
    return cards

def extract_card_roi(image_path, bbox, output_path):
    """Extract and save a region of interest (card) from the image"""
    img = cv2.imread(image_path)
    x, y, w, h = bbox
    
    # Extract the card region with a small margin
    margin = 10
    x = max(0, x - margin)
    y = max(0, y - margin) 
    w = min(img.shape[1] - x, w + 2*margin)
    h = min(img.shape[0] - y, h + 2*margin)
    
    card = img[y:y+h, x:x+w]
    
    # Resize to standard dimensions for consistency
    standard_height = 300
    aspect_ratio = w / h
    standard_width = int(standard_height * aspect_ratio)
    
    resized = cv2.resize(card, (standard_width, standard_height))
    
    # Save the card
    cv2.imwrite(output_path, resized)
    return output_path

def process_cards_experimental():
    """
    Experimental approach to card detection and extraction.
    This is a proof-of-concept to see what's possible.
    """
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Load our exercises for matching
    exercises = load_exercises()
    
    results = {
        'processed_images': [],
        'extracted_cards': [],
        'matching_potential': []
    }
    
    for i, image_path in enumerate(INPUT_IMAGES):
        if not os.path.exists(image_path):
            print(f"Warning: {image_path} not found, skipping...")
            continue
            
        # Detect cards in the image
        card_boxes = find_cards_in_image(image_path)
        
        image_results = {
            'image': image_path,
            'cards_detected': len(card_boxes),
            'extracted_files': []
        }
        
        # Extract each detected card
        for j, bbox in enumerate(card_boxes):
            output_filename = f"card_{i+1}_{j+1:02d}.jpg"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            
            try:
                extracted_path = extract_card_roi(image_path, bbox, output_path)
                image_results['extracted_files'].append({
                    'filename': output_filename,
                    'bbox': bbox,
                    'path': extracted_path
                })
                print(f"Extracted card: {output_filename}")
                
            except Exception as e:
                print(f"Failed to extract card {j+1} from {image_path}: {e}")
        
        results['processed_images'].append(image_results)
        results['extracted_cards'].extend(image_results['extracted_files'])
    
    # Save results summary
    with open(os.path.join(OUTPUT_DIR, 'extraction_results.json'), 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📊 EXTRACTION SUMMARY:")
    print(f"Images processed: {len(results['processed_images'])}")
    print(f"Cards extracted: {len(results['extracted_cards'])}")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Results saved to: {OUTPUT_DIR}/extraction_results.json")
    
    if len(results['extracted_cards']) > 0:
        print(f"\n✅ SUCCESS: Extracted {len(results['extracted_cards'])} cards")
        print("Next steps:")
        print("1. Manually review extracted cards")
        print("2. Match card names to exercise database")  
        print("3. Rename files to match exercise IDs")
        print("4. Update exercises.json with new imageUrl paths")
    else:
        print("\n❌ NO CARDS EXTRACTED")
        print("The automatic detection didn't find clear card boundaries.")
        print("Consider:")
        print("- Manual cropping of a few sample cards")
        print("- Adjusting detection parameters")
        print("- Using different image processing techniques")

if __name__ == "__main__":
    process_cards_experimental()
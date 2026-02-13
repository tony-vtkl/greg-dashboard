#!/usr/bin/env python3
"""
Simple grid-based card cropping for workout exercise images.
Uses estimated grid positions instead of computer vision detection.
"""

import cv2
import os
import json

def crop_cards_grid_based():
    """
    Simple grid-based approach to extract a few sample cards.
    This is faster and more predictable than computer vision detection.
    """
    
    # Create output directory
    output_dir = '../images/exercises/cropped'
    os.makedirs(output_dir, exist_ok=True)
    
    print("🔪 SIMPLE CARD CROPPING EXPERIMENT")
    print("=" * 50)
    
    # Try cropping a few cards from known positions
    results = []
    
    # Image 1: Bodyweight cards (yellow headers)
    img1_path = '/Users/greg/.openclaw/workspace/workout-cards-1.jpg'
    if os.path.exists(img1_path):
        print(f"Processing {img1_path}...")
        img1 = cv2.imread(img1_path)
        h1, w1 = img1.shape[:2]
        print(f"Image 1 size: {w1}x{h1}")
        
        # Estimate grid positions for first few cards (rough approximation)
        # Based on visual inspection: ~7 cards per row, 4-5 rows
        card_width = w1 // 7
        card_height = h1 // 5
        
        # Extract first few cards as samples
        sample_positions = [
            (0, 0, "arm-circles"),      # Top-left
            (1, 0, "dive-bomb-push-up"), # Top row, second card  
            (4, 0, "plank-jack"),       # Top row, fifth card
            (5, 0, "bird-dog"),         # Top row, sixth card
            (0, 3, "butt-lift"),        # Fourth row, first card
            (1, 3, "squat-hold"),       # Fourth row, second card
        ]
        
        for col, row, name in sample_positions:
            x = col * card_width + 10  # Small margin
            y = row * card_height + 10
            w = card_width - 20        # Account for margins
            h = card_height - 20
            
            # Make sure we don't go out of bounds
            if x + w <= w1 and y + h <= h1:
                card = img1[y:y+h, x:x+w]
                output_path = os.path.join(output_dir, f"sample_{name}.jpg")
                cv2.imwrite(output_path, card)
                results.append({
                    'name': name,
                    'source': 'workout-cards-1.jpg',
                    'file': f"sample_{name}.jpg",
                    'position': [col, row],
                    'success': True
                })
                print(f"✅ Extracted: {name}")
            else:
                results.append({
                    'name': name,
                    'success': False,
                    'error': 'Out of bounds'
                })
                print(f"❌ Failed: {name} (out of bounds)")
    
    # Image 2: Strength cards (gray headers) 
    img2_path = '/Users/greg/.openclaw/workspace/workout-cards-2.jpg'
    if os.path.exists(img2_path):
        print(f"\nProcessing {img2_path}...")
        img2 = cv2.imread(img2_path)
        h2, w2 = img2.shape[:2]
        print(f"Image 2 size: {w2}x{h2}")
        
        # This image has more cards in a denser grid
        # Rough estimate: ~10-15 cards per row, 6 rows
        card_width = w2 // 12  
        card_height = h2 // 6
        
        # Extract a few samples from known exercise positions
        sample_positions_2 = [
            (1, 0, "farmers-walk"),
            (3, 0, "romanian-deadlift"),
            (1, 1, "deadlift"),
            (2, 1, "calf-raises"),
            (4, 1, "lunge"),
            (5, 2, "bent-over-row"),
        ]
        
        for col, row, name in sample_positions_2:
            x = col * card_width + 10
            y = row * card_height + 10  
            w = card_width - 20
            h = card_height - 20
            
            if x + w <= w2 and y + h <= h2:
                card = img2[y:y+h, x:x+w]
                output_path = os.path.join(output_dir, f"sample_{name}.jpg")
                cv2.imwrite(output_path, card)
                results.append({
                    'name': name,
                    'source': 'workout-cards-2.jpg', 
                    'file': f"sample_{name}.jpg",
                    'position': [col, row],
                    'success': True
                })
                print(f"✅ Extracted: {name}")
            else:
                results.append({
                    'name': name,
                    'success': False,
                    'error': 'Out of bounds'
                })
                print(f"❌ Failed: {name} (out of bounds)")
    
    # Save results
    with open(os.path.join(output_dir, 'simple_crop_results.json'), 'w') as f:
        json.dump(results, f, indent=2)
    
    successful = [r for r in results if r.get('success')]
    print(f"\n📊 SIMPLE CROP RESULTS:")
    print(f"Cards extracted: {len(successful)}")
    print(f"Output directory: {output_dir}")
    
    if successful:
        print(f"\n✅ SUCCESS: Extracted {len(successful)} sample cards")
        print("These are rough grid-based extractions.")
        print("Review them to assess:")
        print("1. Card boundary detection accuracy")
        print("2. Exercise name visibility") 
        print("3. Illustration quality")
        print("4. Potential for automation improvements")
    else:
        print("\n❌ NO CARDS EXTRACTED")
        print("Grid estimation failed. Manual cropping may be needed.")

if __name__ == "__main__":
    crop_cards_grid_based()
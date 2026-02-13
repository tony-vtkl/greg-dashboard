#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load our exercises and cropping results
const exercisesData = JSON.parse(fs.readFileSync('../data/exercises.json', 'utf8'));
const croppedResults = JSON.parse(fs.readFileSync('../images/exercises/cropped/simple_crop_results.json', 'utf8'));

// Function to normalize names for matching
function normalizeName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Manual mapping for known cases
const nameMapping = {
    'arm-circles': 'arm circles',
    'dive-bomb-push-up': 'hero push-up', // Similar exercise
    'plank-jack': 'plank jack',
    'bird-dog': 'bird dog',
    'butt-lift': 'butt lift',
    'squat-hold': 'squat hold',
    'farmers-walk': 'farmers walk',
    'romanian-deadlift': 'romanian deadlift',
    'deadlift': 'deadlift',
    'calf-raises': 'calf raises',
    'lunge': 'lunge',
    'bent-over-row': 'bent over row'
};

function findMatchingExercise(cardName) {
    const normalizedCardName = nameMapping[cardName] || cardName.replace(/-/g, ' ');
    const cardNorm = normalizeName(normalizedCardName);
    
    // Try exact match first
    for (const exercise of exercisesData.exercises) {
        const exerciseNorm = normalizeName(exercise.name);
        if (exerciseNorm === cardNorm) {
            return exercise;
        }
    }
    
    // Try partial match
    for (const exercise of exercisesData.exercises) {
        const exerciseNorm = normalizeName(exercise.name);
        if (exerciseNorm.includes(cardNorm) || cardNorm.includes(exerciseNorm)) {
            return exercise;
        }
    }
    
    return null;
}

function updateExercisesWithCroppedImages() {
    console.log('🔄 MATCHING CROPPED CARDS TO EXERCISE DATABASE');
    console.log('=' * 55);
    
    const successful = croppedResults.filter(r => r.success);
    const matches = [];
    const misses = [];
    let updatedCount = 0;
    
    for (const croppedCard of successful) {
        const exercise = findMatchingExercise(croppedCard.name);
        
        if (exercise) {
            // Only update if exercise doesn't already have an image
            if (!exercise.imageUrl) {
                const croppedPath = `images/exercises/cropped/${croppedCard.file}`;
                exercise.imageUrl = croppedPath;
                updatedCount++;
                
                matches.push({
                    exerciseId: exercise.id,
                    exerciseName: exercise.name,
                    cardName: croppedCard.name,
                    imageUrl: croppedPath,
                    source: 'card_crop'
                });
                
                console.log(`✅ ${exercise.name} -> ${croppedCard.file}`);
            } else {
                console.log(`⚠️  ${exercise.name} already has image (${exercise.imageUrl})`);
                matches.push({
                    exerciseId: exercise.id,
                    exerciseName: exercise.name,
                    cardName: croppedCard.name,
                    imageUrl: exercise.imageUrl,
                    source: 'existing',
                    note: 'Already had image'
                });
            }
        } else {
            misses.push({
                cardName: croppedCard.name,
                file: croppedCard.file
            });
            console.log(`❌ No match for: ${croppedCard.name}`);
        }
    }
    
    // Write updated exercises.json
    if (updatedCount > 0) {
        fs.writeFileSync('../data/exercises.json', JSON.stringify(exercisesData, null, 2));
        console.log(`\n📝 Updated exercises.json with ${updatedCount} new images`);
    }
    
    // Write summary report
    const summary = {
        cropped_cards_processed: successful.length,
        matches_found: matches.length,
        new_images_added: updatedCount,
        exercises_without_matches: misses,
        all_matches: matches
    };
    
    fs.writeFileSync('../scripts/card-matching-results.json', JSON.stringify(summary, null, 2));
    
    // Calculate new coverage stats
    const totalExercises = exercisesData.exercises.length;
    const exercisesWithImages = exercisesData.exercises.filter(e => e.imageUrl).length;
    const coveragePercent = Math.round((exercisesWithImages / totalExercises) * 100);
    
    console.log('\\n📊 UPDATED COVERAGE STATS:');
    console.log(`Total exercises: ${totalExercises}`);
    console.log(`Exercises with images: ${exercisesWithImages}`);
    console.log(`Coverage: ${coveragePercent}%`);
    
    if (coveragePercent >= 50) {
        console.log('🎉 SUCCESS: Target 50%+ coverage achieved!');
    } else {
        const needed = Math.ceil(totalExercises * 0.5) - exercisesWithImages;
        console.log(`⚡ Need ${needed} more images to reach 50% target`);
    }
    
    console.log('\\nMatching results saved to: scripts/card-matching-results.json');
}

updateExercisesWithCroppedImages();
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load our exercises
const exercisesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/exercises.json'), 'utf8'));
const outputDir = path.join(__dirname, '../images/exercises');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Normalize exercise names for matching
function normalizeExerciseName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
}

// Create a slug from exercise name for filename
function createSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// Download image from URL
function downloadImage(url, filename) {
    return new Promise((resolve, reject) => {
        const fullUrl = url.startsWith('http') ? url : `https://wger.de${url}`;
        const file = fs.createWriteStream(filename);
        
        https.get(fullUrl, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(filename);
            });
        }).on('error', (err) => {
            fs.unlink(filename, () => {}); // Delete the file on error
            reject(err);
        });
    });
}

// Fetch all Wger exercises
async function fetchWgerExercises() {
    const exercises = [];
    let nextUrl = 'https://wger.de/api/v2/exerciseinfo/?language=2&limit=100';
    
    while (nextUrl) {
        console.log(`Fetching: ${nextUrl}`);
        
        const response = await fetch(nextUrl);
        const data = await response.json();
        
        exercises.push(...data.results);
        nextUrl = data.next;
        
        // Add delay to be respectful to API
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`Fetched ${exercises.length} exercises from Wger`);
    return exercises;
}

// Common exercise name mappings
const nameMap = {
    'chest press': 'bench press',
    'bent over row': 'barbell row',
    'sumo squat': 'sumo deadlift squat',
    'farmer\'s walk': 'farmers walk',
    'bear crawl': 'bear walk',
    'crab walk': 'crab crawl',
    'russian twist': 'russian twists',
    'turkish get up': 'turkish get-up',
    'wood chop': 'wood chopper',
    't push up': 't pushup',
    'leg raise': 'leg raises',
    'side leg lift': 'side leg raise',
    'butt lift': 'glute bridge',
    'hip raise': 'hip bridge',
    'calf raises': 'calf raise',
    'donkey kicks': 'donkey kick',
    'step up': 'step-up',
    'leg lift': 'leg raise'
};

// Match our exercises with Wger exercises
function findMatchingWgerExercise(ourExercise, wgerExercises) {
    const ourName = normalizeExerciseName(ourExercise.name);
    const mappedName = nameMap[ourName.toLowerCase()] || ourName;
    const normalizedMapped = normalizeExerciseName(mappedName);
    
    // Try exact match first
    for (const wgerEx of wgerExercises) {
        const englishTranslation = wgerEx.translations.find(t => t.language === 2);
        if (!englishTranslation || !wgerEx.images.length) continue;
        
        const wgerName = normalizeExerciseName(englishTranslation.name);
        
        if (wgerName === normalizedMapped || wgerName === ourName) {
            return { wgerExercise: wgerEx, matchType: 'exact' };
        }
    }
    
    // Try fuzzy match (contains)
    for (const wgerEx of wgerExercises) {
        const englishTranslation = wgerEx.translations.find(t => t.language === 2);
        if (!englishTranslation || !wgerEx.images.length) continue;
        
        const wgerName = normalizeExerciseName(englishTranslation.name);
        
        // Check if either contains the other
        if (wgerName.includes(normalizedMapped) || normalizedMapped.includes(wgerName)) {
            return { wgerExercise: wgerEx, matchType: 'fuzzy' };
        }
    }
    
    return null;
}

async function main() {
    console.log('Starting Wger exercise mapping...');
    
    // Fetch all Wger exercises
    const wgerExercises = await fetchWgerExercises();
    
    const matches = [];
    const misses = [];
    const updatedExercises = [...exercisesData.exercises];
    
    // Process each of our exercises
    for (const exercise of updatedExercises) {
        const match = findMatchingWgerExercise(exercise, wgerExercises);
        
        if (match) {
            const { wgerExercise, matchType } = match;
            const englishName = wgerExercise.translations.find(t => t.language === 2).name;
            
            // Get the main image
            const mainImage = wgerExercise.images.find(img => img.is_main) || wgerExercise.images[0];
            
            if (mainImage) {
                try {
                    const slug = createSlug(exercise.name);
                    const filename = `${exercise.id}-${slug}.png`;
                    const filepath = path.join(outputDir, filename);
                    
                    await downloadImage(mainImage.image, filepath);
                    
                    // Update exercise with image URL
                    exercise.imageUrl = `images/exercises/${filename}`;
                    
                    matches.push({
                        id: exercise.id,
                        ourName: exercise.name,
                        wgerName: englishName,
                        matchType,
                        imageUrl: exercise.imageUrl
                    });
                    
                    console.log(`✅ ${exercise.name} -> ${englishName} (${matchType})`);
                } catch (error) {
                    console.error(`❌ Failed to download image for ${exercise.name}: ${error.message}`);
                }
            }
        } else {
            misses.push({
                id: exercise.id,
                name: exercise.name
            });
            console.log(`❌ No match for: ${exercise.name}`);
        }
    }
    
    // Update exercises.json with imageUrl fields
    const updatedData = {
        ...exercisesData,
        exercises: updatedExercises
    };
    
    fs.writeFileSync(
        path.join(__dirname, '../data/exercises.json'),
        JSON.stringify(updatedData, null, 2)
    );
    
    // Write summary reports
    fs.writeFileSync(
        path.join(__dirname, 'wger-matches.json'),
        JSON.stringify({ matches, misses }, null, 2)
    );
    
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Matched: ${matches.length}/${exercisesData.exercises.length} exercises (${Math.round(matches.length / exercisesData.exercises.length * 100)}%)`);
    console.log(`❌ Unmatched: ${misses.length}`);
    console.log(`🎯 Target: 50%+ coverage (${Math.ceil(exercisesData.exercises.length * 0.5)} exercises)`);
    
    if (matches.length >= Math.ceil(exercisesData.exercises.length * 0.5)) {
        console.log('🎉 SUCCESS: Target coverage achieved!');
    } else {
        console.log(`⚠️  Need ${Math.ceil(exercisesData.exercises.length * 0.5) - matches.length} more matches to hit target`);
    }
    
    console.log('\nMatches written to: scripts/wger-matches.json');
    console.log('Updated exercises.json with imageUrl fields');
}

main().catch(console.error);
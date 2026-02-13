#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Load exercises data
const exercisesData = JSON.parse(fs.readFileSync('./data/exercises.json', 'utf8'));
const exercises = exercisesData.exercises;

// Wger API endpoints
const WGER_BASE = 'https://wger.de/api/v2';
const EXERCISE_INFO_ENDPOINT = `${WGER_BASE}/exerciseinfo/?limit=999`;
const IMAGE_ENDPOINT = `${WGER_BASE}/exerciseimage/?limit=999`;

// Normalize exercise names for matching
function normalizeExerciseName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
}

// Create exercise name mappings for better matching
const EXERCISE_MAPPINGS = {
    'chest press': 'bench press',
    'bent over row': 'barbell row',
    'lat pullover': 'pullover',
    'one arm row': 'dumbbell row',
    'grip curl': 'hammer curl',
    'seesaw row': 'single arm row',
    'incline chest fly': 'incline fly',
    'chest fly': 'dumbbell fly',
    'side raise': 'lateral raise',
    'front raise': 'dumbbell front raise',
    'reverse fly': 'reverse fly',
    'tricep kickback': 'triceps kickback',
    'shoulder press': 'overhead press',
    'upright row': 'upright row',
    'butt lift': 'hip thrust',
    'leg raise on track': 'leg raise',
    'side leg lift': 'side lying leg raise',
    'donkey kicks': 'glute kickback',
    'hip raise': 'hip thrust',
    'calf raises': 'calf raise',
    't push up': 't pushup',
    'renegade row': 'pushup row',
    'russian twist': 'russian twist',
    'wood chop': 'woodchop',
    'turkish get up': 'turkish get-up',
    'farmer\'s walk': 'farmers walk',
    'bear crawl': 'bear walk',
    'bird dog': 'bird dog',
    'crab walk': 'crab walk',
    'plank jack': 'jumping jack plank',
    'side v crunch': 'side crunch',
    'butterfly sit-up': 'butterfly crunch',
    'arm circles': 'arm circle',
    'squat hold': 'wall sit',
    'sumo squat': 'sumo squat',
    'curtsy lunge': 'curtsy lunge',
    'side lunge': 'lateral lunge'
};

async function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https:') ? https : http;
        client.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https:') ? https : http;
        const file = fs.createWriteStream(filepath);
        
        client.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                return;
            }
            
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {}); // Delete partial file
            reject(err);
        });
        
        file.on('error', (err) => {
            fs.unlink(filepath, () => {}); // Delete partial file  
            reject(err);
        });
    });
}

function createSlug(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

async function main() {
    console.log('🚀 Starting exercise image download...');
    console.log(`📊 Processing ${exercises.length} exercises`);
    
    // Fetch Wger exercises and images
    console.log('🔍 Fetching Wger exercise data...');
    const [wgerExerciseInfo, wgerImages] = await Promise.all([
        fetchJson(EXERCISE_INFO_ENDPOINT),
        fetchJson(IMAGE_ENDPOINT)
    ]);
    
    console.log(`📋 Found ${wgerExerciseInfo.results.length} Wger exercises`);
    console.log(`🖼️  Found ${wgerImages.results.length} Wger images`);
    
    // Create exercise to image mapping
    const exerciseImageMap = {};
    wgerImages.results.forEach(img => {
        if (!exerciseImageMap[img.exercise]) {
            exerciseImageMap[img.exercise] = [];
        }
        exerciseImageMap[img.exercise].push(img.image);
    });
    
    // Process Wger exercises to extract English names
    const wgerExercisesWithNames = [];
    wgerExerciseInfo.results.forEach(ex => {
        // Find English translation (language: 2)
        const englishTranslation = ex.translations.find(t => t.language === 2);
        if (englishTranslation) {
            wgerExercisesWithNames.push({
                id: ex.id,
                name: englishTranslation.name,
                category: ex.category?.name || ''
            });
        }
    });
    
    console.log(`📝 Processed ${wgerExercisesWithNames.length} exercises with English names`);
    
    let matches = 0;
    let downloads = 0;
    const updatedExercises = [];
    
    for (const exercise of exercises) {
        console.log(`\n🎯 Processing: ${exercise.name}`);
        
        const normalizedName = normalizeExerciseName(exercise.name);
        const mappedName = EXERCISE_MAPPINGS[normalizedName] || normalizedName;
        
        // Find matching Wger exercise
        let wgerExercise = wgerExercisesWithNames.find(we => {
            const wgerName = normalizeExerciseName(we.name);
            if (!wgerName) return false;
            return wgerName === mappedName || 
                   wgerName.includes(mappedName) ||
                   mappedName.includes(wgerName);
        });
        
        // Try fuzzy matching if exact match fails
        if (!wgerExercise) {
            const keywords = mappedName.split(' ').filter(w => w.length > 2);
            wgerExercise = wgerExercisesWithNames.find(we => {
                const wgerName = normalizeExerciseName(we.name);
                if (!wgerName) return false;
                return keywords.some(keyword => wgerName.includes(keyword));
            });
        }
        
        let imageUrl = null;
        
        if (wgerExercise && exerciseImageMap[wgerExercise.id]) {
            console.log(`  ✅ Match found: ${wgerExercise.name}`);
            matches++;
            
            const imageUrlWger = exerciseImageMap[wgerExercise.id][0];
            const slug = createSlug(exercise.name);
            const filename = `${exercise.id}-${slug}.png`;
            const filepath = path.join('./images/exercises', filename);
            
            try {
                await downloadImage(imageUrlWger, filepath);
                imageUrl = `images/exercises/${filename}`;
                downloads++;
                console.log(`  📥 Downloaded: ${filename}`);
            } catch (error) {
                console.log(`  ❌ Download failed: ${error.message}`);
            }
        } else if (wgerExercise && !exerciseImageMap[wgerExercise.id]) {
            console.log(`  🔍 Match found but no image: ${wgerExercise.name}`);
        } else {
            console.log(`  ❓ No match found`);
        }
        
        // Add exercise with imageUrl field
        updatedExercises.push({
            ...exercise,
            imageUrl
        });
    }
    
    // Update exercises.json
    const updatedData = {
        ...exercisesData,
        exercises: updatedExercises
    };
    
    fs.writeFileSync('./data/exercises.json', JSON.stringify(updatedData, null, 2));
    
    console.log('\n🎉 Summary:');
    console.log(`✅ Matches found: ${matches}/${exercises.length} (${Math.round(matches/exercises.length*100)}%)`);
    console.log(`📥 Images downloaded: ${downloads}`);
    console.log(`📄 Updated exercises.json with imageUrl fields`);
    
    if (matches >= Math.ceil(exercises.length * 0.5)) {
        console.log('🎯 SUCCESS: Target of 50%+ coverage achieved!');
    } else {
        console.log('⚠️  Target of 50%+ coverage not achieved, but proceeding...');
    }
}

main().catch(console.error);
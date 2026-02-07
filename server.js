const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const DEFAULT_BUDGET = 600;

// Scrooge image config
const SCROOGE_IMAGE_URL = 'https://static.wikia.nocookie.net/scroogemcduck/images/e/e8/Scrooge_1987.webp/revision/latest?cb=20240215123632';
const SCROOGE_IMAGE_PATH = path.join(__dirname, 'public', 'scrooge.webp');

// Helper: Fetch and cache Scrooge image
async function cacheScrooeImage() {
  if (fs.existsSync(SCROOGE_IMAGE_PATH)) {
    console.log('Scrooge image already cached');
    return;
  }

  console.log('Fetching Scrooge image...');
  
  return new Promise((resolve, reject) => {
    const fetchUrl = (url) => {
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          console.log('Following redirect to:', response.headers.location);
          fetchUrl(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          console.error('Failed to fetch image, status:', response.statusCode);
          resolve(); // Don't reject, app should still work without image
          return;
        }

        const fileStream = fs.createWriteStream(SCROOGE_IMAGE_PATH);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          console.log('Scrooge image cached successfully');
          resolve();
        });

        fileStream.on('error', (err) => {
          fs.unlink(SCROOGE_IMAGE_PATH, () => {});
          console.error('Error saving image:', err);
          resolve();
        });
      }).on('error', (err) => {
        console.error('Error fetching image:', err);
        resolve();
      });
    };

    fetchUrl(SCROOGE_IMAGE_URL);
  });
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Helper: Calculate remaining shopping trips (Wednesdays and Saturdays)
function calculateRemainingTrips() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const hour = now.getHours();
  const todayDayOfWeek = now.getDay();
  
  // Get last day of current month
  const lastDay = new Date(year, month + 1, 0);
  
  let trips = 0;
  const current = new Date(now);
  current.setHours(0, 0, 0, 0);
  
  // If it's after 17:00 on a shopping day, skip today (already shopped)
  const isShoppingDay = (todayDayOfWeek === 3 || todayDayOfWeek === 6);
  if (isShoppingDay && hour >= 17) {
    current.setDate(current.getDate() + 1);
  }
  
  while (current <= lastDay) {
    const dayOfWeek = current.getDay();
    // 3 = Wednesday, 6 = Saturday
    if (dayOfWeek === 3 || dayOfWeek === 6) {
      trips++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return trips;
}

// Helper: Load data from file
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading data:', err);
  }
  
  // Default data
  return {
    remainingBudget: DEFAULT_BUDGET,
    lastUpdated: new Date().toISOString()
  };
}

// Helper: Save data to file
function saveData(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET /api/budget - Get current budget info
app.get('/api/budget', (req, res) => {
  const data = loadData();
  const remainingTrips = calculateRemainingTrips();
  const perTrip = remainingTrips > 0 
    ? Math.floor((data.remainingBudget / remainingTrips) * 100) / 100 
    : data.remainingBudget;
  
  res.json({
    remainingBudget: data.remainingBudget,
    remainingTrips: remainingTrips,
    perTrip: perTrip,
    lastUpdated: data.lastUpdated
  });
});

// PUT /api/budget - Update remaining budget
app.put('/api/budget', (req, res) => {
  const { remainingBudget } = req.body;
  
  if (typeof remainingBudget !== 'number' || remainingBudget < 0) {
    return res.status(400).json({ error: 'Invalid budget value' });
  }
  
  const data = loadData();
  data.remainingBudget = remainingBudget;
  saveData(data);
  
  const remainingTrips = calculateRemainingTrips();
  const perTrip = remainingTrips > 0 
    ? Math.floor((data.remainingBudget / remainingTrips) * 100) / 100 
    : data.remainingBudget;
  
  res.json({
    remainingBudget: data.remainingBudget,
    remainingTrips: remainingTrips,
    perTrip: perTrip,
    lastUpdated: data.lastUpdated
  });
});

// POST /api/reset - Reset budget to default
app.post('/api/reset', (req, res) => {
  const data = {
    remainingBudget: DEFAULT_BUDGET,
    lastUpdated: new Date().toISOString()
  };
  saveData(data);
  
  const remainingTrips = calculateRemainingTrips();
  const perTrip = remainingTrips > 0 
    ? Math.floor((DEFAULT_BUDGET / remainingTrips) * 100) / 100 
    : DEFAULT_BUDGET;
  
  res.json({
    remainingBudget: DEFAULT_BUDGET,
    remainingTrips: remainingTrips,
    perTrip: perTrip,
    lastUpdated: data.lastUpdated
  });
});

// Start server after caching image
cacheScrooeImage().then(() => {
  app.listen(PORT, () => {
    console.log(`Scrooge budget tracker running at http://localhost:${PORT}`);
  });
});

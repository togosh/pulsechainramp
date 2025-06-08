const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- START: MODIFICATION ---
// Configure Helmet with an updated Content Security Policy
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "https://cdnjs.cloudflare.com"], // Allow scripts from our domain and the jQuery CDN
            "frame-src": ["'self'", "https://app.rampnow.io"],      // <-- ADD THIS LINE: Allow iframes from our domain and Rampnow
        },
    })
);
// --- END: MODIFICATION ---


// Rate Limiting to prevent brute-force attacks
if (process.env.NODE_ENV === 'production') {
    console.log("Production mode detected. Applying rate limiting.");
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 200, // Limit each IP to 100 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false,
        message: 'Too many requests from this IP, please try again after 15 minutes',
    });
    app.use(limiter);
} else {
    console.log("Development mode detected. Rate limiting is disabled.");
}

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to provide the Rampnow API key to the frontend securely
app.get('/api/config', (req, res) => {
    res.json({ apiKey: process.env.RAMPNOW_API_KEY });
});

// Route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all route for other pages
app.get('*', (req, res) => {
    const requestedFile = req.path.endsWith('.html') ? req.path : `${req.path}.html`;
    const filePath = path.join(__dirname, 'public', requestedFile);
    
    if (filePath.indexOf(path.join(__dirname, 'public')) !== 0) {
        return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }

    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        }
    });
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Read config for HTTPS and other settings
let CONFIG = {};
try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        
        // Ensure CONFIG.debug has a default if not present in the file
        if (typeof CONFIG.debug === 'undefined') {
            console.warn("Warning: The 'debug' key is missing in config.json. Defaulting to true (debug mode).");
            CONFIG.debug = true;
        }

        // Ensure CONFIG.hostname has a default if not present and might be needed
        if (typeof CONFIG.hostname === 'undefined') {
            if (CONFIG.debug) {
                CONFIG.hostname = 'localhost'; // Will be overridden by HOSTNAME logic anyway
            } else {
                CONFIG.hostname = 'your_domain.com'; // Default production hostname
                console.warn(`Warning: The 'hostname' key is missing in config.json. Defaulting to '${CONFIG.hostname}'. Please set it for production if not using HOSTNAME env var.`);
            }
        }
    } else {
        console.error("Error: config.json not found. Defaulting to debug mode with localhost.");
        CONFIG.debug = true;
        CONFIG.hostname = 'localhost';
    }
} catch (e) {
    console.error("Error reading or parsing config.json. Defaulting to debug mode with localhost.", e);
    CONFIG.debug = true;
    CONFIG.hostname = 'localhost';
}

const DEBUG = process.env.NODE_ENV !== 'production' && CONFIG.debug;

// HOSTNAME selection: If CONFIG.debug (from config.json) is true, use 'localhost'.
// Otherwise, use environment variable HOSTNAME, then config.json's hostname.
const HOSTNAME = CONFIG.debug 
    ? 'localhost' 
    : (process.env.HOSTNAME || CONFIG.hostname);

const HTTP_PORT = process.env.PORT || CONFIG.http_port || 80; // Standard HTTP port
const HTTPS_PORT = process.env.HTTPS_PORT || CONFIG.https_port || 443; // Standard HTTPS port

let httpsOptions = undefined;
if (!DEBUG) {
    try {
        httpsOptions = {
            key: fs.readFileSync(path.resolve(__dirname, CONFIG.https.key)),
            cert: fs.readFileSync(path.resolve(__dirname, CONFIG.https.cert)),
        };
        if (CONFIG.https.ca && CONFIG.https.ca !== "") {
            httpsOptions.ca = fs.readFileSync(path.resolve(__dirname, CONFIG.https.ca));
        }
        console.log("HTTPS options loaded for production.");
    } catch (e) {
        console.error("Error loading SSL certificates. Ensure paths in config.json are correct.", e);
        console.log("Proceeding without HTTPS due to certificate loading error.");
    }
} else {
    console.log("Running in debug mode. HTTPS will not be enabled by default.");
}

// Configure Helmet with an updated Content Security Policy
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "https://cdnjs.cloudflare.com"], // Allow scripts from our domain and the jQuery CDN
            "frame-src": ["'self'", "https://app.rampnow.io"],      // Allow iframes from our domain and Rampnow
        },
    })
);

// Rate Limiting to prevent brute-force attacks
if (process.env.NODE_ENV === 'production') {
    console.log("Production mode detected. Applying rate limiting.");
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 200, // Limit each IP to requests per windowMs
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

// Create HTTP and HTTPS servers
const httpServer = http.createServer(app);
let httpsServer = undefined;

if (!DEBUG && httpsOptions) {
    httpsServer = https.createServer(httpsOptions, app);
    // Redirect HTTP to HTTPS in production
    app.use((req, res, next) => {
        if (req.secure) {
            next();
        } else {
            // Construct the HTTPS URL, ensuring www is handled if present in HOSTNAME
            const targetHost = req.headers.host.startsWith('www.') && !HOSTNAME.startsWith('www.') ? `www.${HOSTNAME}` : HOSTNAME;
            const httpsUrl = `https://${targetHost}:${HTTPS_PORT}${req.url}`;
            console.log(`Redirecting HTTP to HTTPS: ${httpsUrl}`);
            res.redirect(301, httpsUrl);
        }
    });
} else if (!DEBUG && !httpsOptions) {
    console.warn("Production mode detected, but HTTPS options are not available. HTTPS server not started.");
}

// Modify app.listen to use the created servers
httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP Server running on http://${HOSTNAME}:${HTTP_PORT}`);
    if (DEBUG || !httpsOptions) { // If debug or HTTPS failed, this is the primary server
        console.log(`Server is running on http://${HOSTNAME}:${HTTP_PORT}`);
    }
});

if (httpsServer) {
    httpsServer.listen(HTTPS_PORT, () => {
        console.log(`HTTPS Server running on https://${HOSTNAME}:${HTTPS_PORT}`);
        console.log(`Server is running on https://${HOSTNAME}:${HTTPS_PORT}`);
    });
}
/**
 * Helmet Security Headers Configuration
 * 
 * These settings provide production-ready security headers
 * while allowing necessary functionality for the application
 */

const helmetConfig = {
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:3001", "https://api.subscription-simulator.com"],
            mediaSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: []
        }
    },

    // Prevent clickjacking
    frameguard: {
        action: 'deny'
    },

    // HSTS (HTTP Strict Transport Security)
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },

    // X-Content-Type-Options
    noSniff: true,

    // X-XSS-Protection (legacy browsers)
    xssFilter: true,

    // Referrer Policy
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    },

    // Permissions Policy (formerly Feature Policy)
    permissionsPolicy: {
        features: {
            camera: ["'none'"],
            microphone: ["'none'"],
            geolocation: ["'none'"],
            payment: ["'none'"],
            usb: ["'none'"],
            vr: ["'none'"],
            accelerometer: ["'none'"],
            gyroscope: ["'none'"],
            magnetometer: ["'none'"]
        }
    },

    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: { policy: 'cross-origin' },

    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: { policy: 'same-origin' },

    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: { policy: 'require-corp' },

    // DNS Prefetch Control
    dnsPrefetchControl: {
        allow: false
    },

    // Hide X-Powered-By header
    hidePoweredBy: true,

    // IE No Open (prevent IE from executing downloads)
    ieNoOpen: true,

    // Origin Agent Cluster
    originAgentCluster: true
};

/**
 * Development configuration (less strict)
 */
const helmetConfigDev = {
    ...helmetConfig,
    contentSecurityPolicy: false, // Disable CSP in dev for easier debugging
    hsts: false // Disable HSTS in dev
};

module.exports = {
    helmetConfig,
    helmetConfigDev
};

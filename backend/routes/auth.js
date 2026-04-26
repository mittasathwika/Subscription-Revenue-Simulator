const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUserByEmail, createUser, getOrCreateSocialUser, updateUser } = require('../models/dynamodb');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { authValidation } = require('../middleware/validator');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// In-memory OTP store (use Redis in production)
const otpStore = new Map();

// Helper: Build user response with name fields
function buildUserResponse(user) {
    return {
        id: user.email,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        auth_provider: user.auth_provider || 'local'
    };
}

// POST /api/auth/signup - Enhanced with first_name, last_name, phone
router.post('/signup', authValidation.signup, async (req, res) => {
    try {
        const { first_name, last_name, phone, email, password } = req.body;
        
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }
        
        const passwordHash = bcrypt.hashSync(password, 10);
        await createUser({ 
            first_name, 
            last_name, 
            phone, 
            email, 
            password: passwordHash,
            auth_provider: 'local'
        });
        
        const token = generateToken(email, email, first_name, last_name);
        const refreshToken = generateRefreshToken(email);
        
        res.status(201).json({
            success: true,
            token,
            refreshToken,
            user: { id: email, email, first_name, last_name, phone },
            message: 'Account created successfully'
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/login
router.post('/login', authValidation.login, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await getUserByEmail(email);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Social auth users don't have local password
        if (!user.password && user.auth_provider !== 'local') {
            return res.status(401).json({ 
                error: `Please login with ${user.auth_provider}`,
                auth_provider: user.auth_provider
            });
        }
        
        const validPassword = bcrypt.compareSync(password, user.password || user.password_hash || '');
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = generateToken(user.email, user.email, user.first_name, user.last_name);
        const refreshToken = generateRefreshToken(user.email);
        
        res.json({
            success: true,
            token,
            refreshToken,
            user: buildUserResponse(user),
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/google - Google OAuth callback
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        
        if (!credential) {
            return res.status(400).json({ error: 'Google credential token is required' });
        }
        
        // Decode Google ID token payload (base64url)
        const base64Url = credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
        const googleUser = JSON.parse(jsonPayload);
        
        const { sub: googleId, email, given_name: firstName, family_name: lastName, name } = googleUser;
        
        if (!email) {
            return res.status(400).json({ error: 'Email not available from Google' });
        }
        
        const user = await getOrCreateSocialUser(
            'google', 
            googleId, 
            email, 
            firstName || (name ? name.split(' ')[0] : ''), 
            lastName || (name ? name.split(' ').slice(1).join(' ') : '')
        );
        
        if (!user) {
            return res.status(500).json({ error: 'Failed to create or find user' });
        }
        
        const token = generateToken(email, email, user.first_name, user.last_name);
        const refreshToken = generateRefreshToken(email);
        
        res.json({
            success: true,
            token,
            refreshToken,
            user: buildUserResponse(user),
            message: 'Google login successful'
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/facebook - Facebook OAuth callback
router.post('/facebook', async (req, res) => {
    try {
        const { accessToken, userID } = req.body;
        
        if (!accessToken || !userID) {
            return res.status(400).json({ error: 'Facebook access token and user ID are required' });
        }
        
        // Fetch user info from Facebook Graph API
        const https = require('https');
        const graphUrl = `https://graph.facebook.com/v18.0/${userID}?fields=email,first_name,last_name,name&access_token=${accessToken}`;
        
        const fbData = await new Promise((resolve, reject) => {
            https.get(graphUrl, (resp) => {
                let data = '';
                resp.on('data', (chunk) => data += chunk);
                resp.on('end', () => {
                    try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
                });
            }).on('error', reject);
        });
        
        if (fbData.error) {
            return res.status(400).json({ error: 'Facebook token validation failed: ' + fbData.error.message });
        }
        
        const { email, first_name: firstName, last_name: lastName, name, id: facebookId } = fbData;
        
        if (!email) {
            return res.status(400).json({ error: 'Email not available from Facebook' });
        }
        
        const user = await getOrCreateSocialUser(
            'facebook',
            facebookId || userID,
            email,
            firstName || (name ? name.split(' ')[0] : ''),
            lastName || (name ? name.split(' ').slice(1).join(' ') : '')
        );
        
        if (!user) {
            return res.status(500).json({ error: 'Failed to create or find user' });
        }
        
        const token = generateToken(email, email, user.first_name, user.last_name);
        const refreshToken = generateRefreshToken(email);
        
        res.json({
            success: true,
            token,
            refreshToken,
            user: buildUserResponse(user),
            message: 'Facebook login successful'
        });
    } catch (error) {
        console.error('Facebook auth error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/phone/request - Request OTP for phone login
router.post('/phone/request', authValidation.phoneRequest, async (req, res) => {
    try {
        const { phone } = req.body;
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP with expiry (10 minutes)
        otpStore.set(phone, {
            otp,
            expires: Date.now() + 10 * 60 * 1000,
            attempts: 0
        });
        
        // TODO: Integrate with SMS provider (Twilio, AWS SNS) in production
        // For now, log to console for demo/testing
        console.log(`[DEMO OTP] Phone: ${phone}, OTP: ${otp}`);
        
        res.json({
            success: true,
            message: 'OTP sent to your phone number',
            // For demo purposes only - remove in production
            demo_otp: otp,
            expires_in: 600 // seconds
        });
    } catch (error) {
        console.error('Phone OTP request error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/phone/verify - Verify OTP and login/signup
router.post('/phone/verify', authValidation.phoneVerify, async (req, res) => {
    try {
        const { phone, otp } = req.body;
        
        const stored = otpStore.get(phone);
        
        if (!stored) {
            return res.status(400).json({ error: 'OTP not found or expired. Please request a new OTP.' });
        }
        
        if (Date.now() > stored.expires) {
            otpStore.delete(phone);
            return res.status(400).json({ error: 'OTP expired. Please request a new OTP.' });
        }
        
        if (stored.attempts >= 3) {
            otpStore.delete(phone);
            return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
        }
        
        stored.attempts += 1;
        
        if (stored.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
        }
        
        // OTP verified - clean up
        otpStore.delete(phone);
        
        // Create email from phone for identification
        const email = `${phone}@phone.local`;
        
        // Check if user exists or create
        let user = await getUserByEmail(email);
        if (!user) {
            await createUser({
                email,
                phone,
                first_name: '',
                last_name: '',
                auth_provider: 'phone'
            });
            user = await getUserByEmail(email);
        }
        
        const token = generateToken(email, email, user.first_name, user.last_name);
        const refreshToken = generateRefreshToken(email);
        
        res.json({
            success: true,
            token,
            refreshToken,
            user: buildUserResponse(user),
            message: 'Phone login successful'
        });
    } catch (error) {
        console.error('Phone OTP verify error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/auth/verify - Verify token
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        jwt.verify(token, JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ error: 'Invalid token' });
            }
            
            // Get latest user data including names
            const user = await getUserByEmail(decoded.email);
            if (user) {
                decoded.firstName = user.first_name || '';
                decoded.lastName = user.last_name || '';
            }
            
            res.json({ valid: true, user: decoded });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        jwt.verify(token, JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ error: 'Invalid token' });
            }
            
            const { first_name, last_name, phone, current_password, new_password } = req.body;
            const user = await getUserByEmail(decoded.email);
            
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const updates = {};
            
            if (first_name !== undefined) updates.first_name = first_name;
            if (last_name !== undefined) updates.last_name = last_name;
            if (phone !== undefined) updates.phone = phone;
            
            // Password change (only for local auth users)
            const userPassword = user.password || user.password_hash;
            if (new_password && user.auth_provider === 'local' && userPassword) {
                if (!current_password) {
                    return res.status(400).json({ error: 'Current password is required' });
                }
                const validPassword = bcrypt.compareSync(current_password, userPassword);
                if (!validPassword) {
                    return res.status(401).json({ error: 'Current password is incorrect' });
                }
                updates.password = bcrypt.hashSync(new_password, 10);
                updates.password_hash = bcrypt.hashSync(new_password, 10); // store in both fields for compatibility
            }
            
            const updatedUser = await updateUser(decoded.email, updates);
            
            if (updatedUser) {
                res.json({
                    success: true,
                    user: buildUserResponse(updatedUser),
                    message: 'Profile updated successfully'
                });
            } else {
                res.status(500).json({ error: 'Failed to update profile' });
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

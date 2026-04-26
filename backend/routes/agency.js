const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken: authenticate } = require('../middleware/auth');
const { requireAgencyOwner, requireRole } = require('../middleware/multiTenant');
const { getDatabase: getDb } = require('../models/database');

// Create agency
router.post('/create', authenticate, [
    body('name').isString().trim().isLength({ min: 2, max: 100 }),
    body('plan').optional().isIn(['agency-starter', 'agency-growth', 'agency-scale'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { name, plan = 'agency-starter' } = req.body;
        const agencyId = uuidv4();
        
        const db = getDb();
        
        // Check if user already owns an agency
        const existing = await db.get(
            'SELECT id FROM agencies WHERE owner_id = ?',
            [req.user.id]
        );
        
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'User already owns an agency'
            });
        }
        
        // Get plan limits
        const planLimits = {
            'agency-starter': { maxClients: 5, maxUsers: 3 },
            'agency-growth': { maxClients: 15, maxUsers: 5 },
            'agency-scale': { maxClients: 50, maxUsers: 10 }
        };
        
        const limits = planLimits[plan];
        
        // Create agency
        await db.run(
            `INSERT INTO agencies (id, name, owner_id, plan_type, max_clients, max_users_per_client)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [agencyId, name, req.user.id, plan, limits.maxClients, limits.maxUsers]
        );
        
        res.json({
            success: true,
            agency: {
                id: agencyId,
                name,
                plan,
                limits
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get agency details
router.get('/', authenticate, async (req, res) => {
    try {
        const db = getDb();
        
        const agency = await db.get(
            `SELECT * FROM agencies WHERE owner_id = ? OR id IN 
             (SELECT agency_id FROM client_workspaces WHERE id IN 
              (SELECT workspace_id FROM workspace_members WHERE user_id = ?))`,
            [req.user.id, req.user.id]
        );
        
        if (!agency) {
            return res.status(404).json({
                success: false,
                error: 'No agency found'
            });
        }
        
        // Get clients count
        const clients = await db.get(
            'SELECT COUNT(*) as count FROM client_workspaces WHERE agency_id = ?',
            [agency.id]
        );
        
        res.json({
            success: true,
            agency: {
                ...agency,
                clients_count: clients.count
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create client workspace
router.post('/workspaces', authenticate, requireAgencyOwner, [
    body('name').isString().trim().isLength({ min: 2, max: 100 }),
    body('slug').isString().trim().isLength({ min: 2, max: 50 }).matches(/^[a-z0-9-]+$/),
    body('description').optional().isString(),
    body('primaryColor').optional().matches(/^#[0-9A-Fa-f]{6}$/),
    body('accentColor').optional().matches(/^#[0-9A-Fa-f]{6}$/)
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { name, slug, description, primaryColor, accentColor } = req.body;
        const workspaceId = uuidv4();
        
        const db = getDb();
        
        // Check client limit
        const agency = await db.get(
            'SELECT * FROM agencies WHERE owner_id = ?',
            [req.user.id]
        );
        
        const clientCount = await db.get(
            'SELECT COUNT(*) as count FROM client_workspaces WHERE agency_id = ?',
            [agency.id]
        );
        
        if (clientCount.count >= agency.max_clients) {
            return res.status(400).json({
                success: false,
                error: 'Client limit reached for your plan'
            });
        }
        
        // Check if slug is taken
        const existing = await db.get(
            'SELECT id FROM client_workspaces WHERE slug = ?',
            [slug]
        );
        
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Slug already in use'
            });
        }
        
        await db.run(
            `INSERT INTO client_workspaces 
             (id, agency_id, name, slug, description, primary_color, accent_color)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [workspaceId, agency.id, name, slug, description || '', primaryColor || '#3B82F6', accentColor || '#10B981']
        );
        
        // Add owner as workspace member
        await db.run(
            `INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
             VALUES (?, ?, 'admin', datetime('now'))`,
            [workspaceId, req.user.id]
        );
        
        res.json({
            success: true,
            workspace: {
                id: workspaceId,
                name,
                slug
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all workspaces for agency
router.get('/workspaces', authenticate, async (req, res) => {
    try {
        const db = getDb();
        
        const workspaces = await db.all(
            `SELECT w.*, COUNT(wm.id) as member_count
             FROM client_workspaces w
             LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
             WHERE w.id IN (
                 SELECT workspace_id FROM workspace_members WHERE user_id = ?
             )
             GROUP BY w.id`,
            [req.user.id]
        );
        
        res.json({
            success: true,
            workspaces
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Invite user to workspace
router.post('/workspaces/:workspaceId/invite', authenticate, [
    body('email').isEmail(),
    body('role').optional().isIn(['admin', 'analyst', 'viewer'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { workspaceId } = req.params;
        const { email, role = 'analyst' } = req.body;
        
        const db = getDb();
        
        // Check if inviter has permission
        const membership = await db.get(
            'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND role IN ("admin", "owner")',
            [workspaceId, req.user.id]
        );
        
        if (!membership) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
        }
        
        // Create invitation
        const invitationId = uuidv4();
        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
        
        await db.run(
            `INSERT INTO agency_invitations (id, agency_id, email, role, invited_by, token, expires_at)
             SELECT ?, cw.agency_id, ?, ?, ?, ?, ?
             FROM client_workspaces cw
             WHERE cw.id = ?`,
            [invitationId, email, role, req.user.id, token, expiresAt.toISOString(), workspaceId]
        );
        
        // TODO: Send invitation email
        
        res.json({
            success: true,
            invitation: {
                id: invitationId,
                email,
                role,
                expiresAt: expiresAt.toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;

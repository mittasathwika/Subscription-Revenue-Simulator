const { getDatabase: getDb } = require('../models/database');

const multiTenantMiddleware = async (req, res, next) => {
    try {
        // Skip for non-authenticated routes
        if (!req.user || !req.user.id) {
            return next();
        }

        const db = getDb();
        
        // Check if user is part of any workspace
        const workspaceMember = await db.get(
            `SELECT wm.*, w.slug as workspace_slug, w.agency_id, w.name as workspace_name
             FROM workspace_members wm
             JOIN client_workspaces w ON wm.workspace_id = w.id
             WHERE wm.user_id = ? AND wm.is_active = 1
             LIMIT 1`,
            [req.user.id]
        );
        
        if (workspaceMember) {
            req.workspace = {
                id: workspaceMember.workspace_id,
                slug: workspaceMember.workspace_slug,
                agencyId: workspaceMember.agency_id,
                name: workspaceMember.workspace_name,
                role: workspaceMember.role
            };
            
            // Check agency details if applicable
            if (workspaceMember.agency_id) {
                const agency = await db.get(
                    'SELECT * FROM agencies WHERE id = ?',
                    [workspaceMember.agency_id]
                );
                
                if (agency) {
                    req.agency = {
                        id: agency.id,
                        name: agency.name,
                        plan: agency.plan_type,
                        maxClients: agency.max_clients
                    };
                }
            }
        }
        
        // Also check if user owns an agency
        const ownedAgency = await db.get(
            'SELECT * FROM agencies WHERE owner_id = ?',
            [req.user.id]
        );
        
        if (ownedAgency) {
            req.isAgencyOwner = true;
            req.agency = {
                id: ownedAgency.id,
                name: ownedAgency.name,
                plan: ownedAgency.plan_type,
                maxClients: ownedAgency.max_clients,
                isOwner: true
            };
        }
        
        next();
    } catch (error) {
        console.error('Multi-tenant middleware error:', error);
        next();
    }
};

// Middleware to require workspace membership
const requireWorkspace = (req, res, next) => {
    if (!req.workspace) {
        return res.status(403).json({
            success: false,
            error: 'Workspace access required'
        });
    }
    next();
};

// Middleware to require agency ownership
const requireAgencyOwner = (req, res, next) => {
    if (!req.isAgencyOwner) {
        return res.status(403).json({
            success: false,
            error: 'Agency owner access required'
        });
    }
    next();
};

// Middleware to check role-based access
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.workspace) {
            return res.status(403).json({
                success: false,
                error: 'Workspace access required'
            });
        }
        
        if (!allowedRoles.includes(req.workspace.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
        }
        
        next();
    };
};

// Helper to add workspace filter to queries
const withWorkspaceFilter = (userId, workspaceId) => {
    if (workspaceId) {
        return {
            where: 'AND workspace_id = ?',
            params: [workspaceId]
        };
    }
    return {
        where: 'AND user_id = ?',
        params: [userId]
    };
};

module.exports = {
    multiTenantMiddleware,
    requireWorkspace,
    requireAgencyOwner,
    requireRole,
    withWorkspaceFilter
};

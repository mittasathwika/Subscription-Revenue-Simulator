const { body, param, validationResult } = require('express-validator');

/**
 * Validation error handler middleware
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: err.value
            }))
        });
    }
    next();
};

/**
 * Sanitize string input
 */
const sanitizeString = (value) => {
    if (typeof value !== 'string') return value;
    return value
        .trim()
        .replace(/[<>]/g, '') // Remove < and > to prevent basic XSS
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

/**
 * Auth validation rules
 */
const authValidation = {
    signup: [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
        handleValidationErrors
    ],
    login: [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        body('password')
            .notEmpty()
            .withMessage('Password is required'),
        handleValidationErrors
    ]
};

/**
 * Metrics calculation validation rules
 */
const metricsValidation = {
    calculate: [
        body('price')
            .optional()
            .isFloat({ min: 0.01 })
            .withMessage('Price must be greater than 0'),
        body('churn')
            .optional()
            .isFloat({ min: 0, max: 100 })
            .withMessage('Churn rate must be between 0% and 100%'),
        body('adSpend')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Ad spend cannot be negative'),
        body('growthRate')
            .optional()
            .isFloat({ min: -100, max: 1000 })
            .withMessage('Growth rate must be between -100% and 1000%'),
        body('initialCustomers')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Initial customers cannot be negative'),
        body('cac')
            .optional()
            .isFloat({ min: 0.01 })
            .withMessage('CAC must be greater than 0'),
        body('months')
            .optional()
            .isInt({ min: 1, max: 60 })
            .withMessage('Months must be between 1 and 60'),
        handleValidationErrors
    ],
    updateReal: [
        body('customers')
            .isInt({ min: 0 })
            .withMessage('Customers must be a non-negative integer'),
        body('monthly_revenue')
            .isFloat({ min: 0 })
            .withMessage('Monthly revenue cannot be negative'),
        body('churn_rate')
            .isFloat({ min: 0, max: 1 })
            .withMessage('Churn rate must be between 0 and 1'),
        body('ad_spend')
            .isFloat({ min: 0 })
            .withMessage('Ad spend cannot be negative'),
        body('cac')
            .isFloat({ min: 0.01 })
            .withMessage('CAC must be greater than 0'),
        handleValidationErrors
    ]
};

/**
 * Scenario validation rules
 */
const scenarioValidation = {
    create: [
        body('name')
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Scenario name must be between 1 and 100 characters')
            .customSanitizer(sanitizeString),
        body('price')
            .optional()
            .isFloat({ min: 0.01 })
            .withMessage('Price must be greater than 0'),
        body('churn_rate')
            .optional()
            .isFloat({ min: 0, max: 1 })
            .withMessage('Churn rate must be between 0 and 1'),
        body('ad_spend')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Ad spend cannot be negative'),
        body('growth_rate')
            .optional()
            .isFloat({ min: -1, max: 10 })
            .withMessage('Growth rate must be between -100% and 1000%'),
        body('initial_customers')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Initial customers cannot be negative'),
        body('cac')
            .optional()
            .isFloat({ min: 0.01 })
            .withMessage('CAC must be greater than 0'),
        handleValidationErrors
    ],
    update: [
        param('id')
            .isUUID()
            .withMessage('Invalid scenario ID format'),
        body('name')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Scenario name must be between 1 and 100 characters')
            .customSanitizer(sanitizeString),
        handleValidationErrors
    ],
    compare: [
        body('scenario_ids')
            .isArray({ min: 2, max: 5 })
            .withMessage('Please provide 2 to 5 scenario IDs for comparison'),
        body('scenario_ids.*')
            .isUUID()
            .withMessage('Invalid scenario ID format'),
        handleValidationErrors
    ]
};

module.exports = {
    handleValidationErrors,
    authValidation,
    metricsValidation,
    scenarioValidation,
    sanitizeString
};

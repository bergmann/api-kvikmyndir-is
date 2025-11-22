"use strict";

var DBService = require("./dbservice");
var logger = require("./logservice");

/**
 * API Usage Logging Service
 * Logs API requests for analytics and monitoring
 * @author: Sindri Bergmann
 */

/**
 * Log an API request to the database
 * @param {Object} logData - The log data object
 * @param {String} logData.endpoint - The API endpoint called (e.g., '/movies', '/search')
 * @param {String} logData.username - The username from JWT token
 * @param {String} logData.userId - The user ID from JWT token
 * @param {Number} logData.statusCode - HTTP response status code
 * @param {Object} logData.queryParams - Query parameters from the request
 * @param {String} logData.method - HTTP method (GET, POST, etc.)
 * @param {Date} logData.timestamp - Request timestamp
 * @param {Function} callback - Callback function
 */
function logApiRequest(logData, callback) {
    console.log("[API USAGE] Attempting to log API request:", logData);

    // Validate required fields
    if (!logData.endpoint || !logData.username || !logData.timestamp) {
        console.log("[API USAGE] Missing required fields:", logData);
        logger.error().info("API Usage Log: Missing required fields");
        if (callback) callback(new Error("Missing required fields"));
        return;
    }

    // Create log document
    var logDocument = {
        endpoint: logData.endpoint,
        username: logData.username,
        userId: logData.userId || null,
        statusCode: logData.statusCode || 200,
        queryParams: logData.queryParams || {},
        method: logData.method || "GET",
        timestamp: logData.timestamp,
        createdAt: new Date()
    };

    console.log("[API USAGE] Inserting log document:", logDocument);

    // Insert into database
    DBService.insertDocument(logDocument, "api_usage", function(err, result) {
        if (err) {
            console.log("[API USAGE] Error inserting:", err);
            logger.databaseError().info("Error logging API usage: " + err);
            if (callback) callback(err);
        } else {
            console.log("[API USAGE] Successfully logged API request");
            if (callback) callback(null, result);
        }
    });
}

/**
 * Get usage statistics for a specific time period
 * @param {Date} startDate - Start date for the period
 * @param {Date} endDate - End date for the period
 * @param {Function} callback - Callback function
 */
function getUsageStats(startDate, endDate, callback) {
    var query = {};
    
    if (startDate && endDate) {
        query.timestamp = {
            $gte: startDate,
            $lte: endDate
        };
    }

    DBService.findDocuments(query, "api_usage", function(err, docs) {
        if (err) {
            logger.databaseError().info("Error fetching usage stats: " + err);
            callback(err);
        } else {
            callback(null, docs);
        }
    });
}

/**
 * Get user statistics (total calls per user)
 * @param {Date} startDate - Start date for the period (optional)
 * @param {Date} endDate - End date for the period (optional)
 * @param {Function} callback - Callback function
 */
function getUserStats(startDate, endDate, callback) {
    var matchStage = {};
    
    if (startDate && endDate) {
        matchStage.timestamp = {
            $gte: startDate,
            $lte: endDate
        };
    }

    // Aggregate by username
    var pipeline = [
        { $match: matchStage },
        { 
            $group: {
                _id: "$username",
                totalCalls: { $sum: 1 },
                lastCall: { $max: "$timestamp" }
            }
        },
        { $sort: { totalCalls: -1 } }
    ];

    DBService.aggregate(pipeline, "api_usage", function(err, results) {
        if (err) {
            logger.databaseError().info("Error fetching user stats: " + err);
            callback(err);
        } else {
            callback(null, results);
        }
    });
}

/**
 * Get endpoint statistics (total calls per endpoint)
 * @param {Date} startDate - Start date for the period (optional)
 * @param {Date} endDate - End date for the period (optional)
 * @param {Function} callback - Callback function
 */
function getEndpointStats(startDate, endDate, callback) {
    var matchStage = {};
    
    if (startDate && endDate) {
        matchStage.timestamp = {
            $gte: startDate,
            $lte: endDate
        };
    }

    // Aggregate by endpoint
    var pipeline = [
        { $match: matchStage },
        { 
            $group: {
                _id: "$endpoint",
                totalCalls: { $sum: 1 },
                lastCall: { $max: "$timestamp" }
            }
        },
        { $sort: { totalCalls: -1 } }
    ];

    DBService.aggregate(pipeline, "api_usage", function(err, results) {
        if (err) {
            logger.databaseError().info("Error fetching endpoint stats: " + err);
            callback(err);
        } else {
            callback(null, results);
        }
    });
}

module.exports = {
    logApiRequest: logApiRequest,
    getUsageStats: getUsageStats,
    getUserStats: getUserStats,
    getEndpointStats: getEndpointStats
};


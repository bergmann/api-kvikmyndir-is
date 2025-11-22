"use strict";
var express = require('express');
var apiUsageService = require('../services/apiusageservice');
var moment = require('moment');

// ====================================
// ANALYTICS ==========================
// ====================================
module.exports = function(passport) {
    var router = express.Router();
    
    // Route for domain/analytics
    router.get('/analytics', isLoggedIn, function(req, res) {
        // Get time period from query params (default: all time)
        var period = req.query.period || 'all';
        var startDate, endDate;
        
        endDate = new Date();
        
        switch(period) {
            case '24h':
                startDate = moment().subtract(24, 'hours').toDate();
                break;
            case '7d':
                startDate = moment().subtract(7, 'days').toDate();
                break;
            case '30d':
                startDate = moment().subtract(30, 'days').toDate();
                break;
            case 'all':
            default:
                startDate = null;
                endDate = null;
                break;
        }
        
        // Fetch user stats and endpoint stats in parallel
        var userStatsComplete = false;
        var endpointStatsComplete = false;
        var recentLogsComplete = false;
        var userStats = [];
        var endpointStats = [];
        var recentLogs = [];
        var errors = [];
        
        // Get user statistics
        apiUsageService.getUserStats(startDate, endDate, function(err, stats) {
            if (err) {
                errors.push('Error fetching user stats: ' + err);
            } else {
                userStats = stats || [];
            }
            userStatsComplete = true;
            checkComplete();
        });
        
        // Get endpoint statistics
        apiUsageService.getEndpointStats(startDate, endDate, function(err, stats) {
            if (err) {
                errors.push('Error fetching endpoint stats: ' + err);
            } else {
                endpointStats = stats || [];
            }
            endpointStatsComplete = true;
            checkComplete();
        });
        
        // Get recent logs (last 50)
        apiUsageService.getUsageStats(startDate, endDate, function(err, logs) {
            if (err) {
                errors.push('Error fetching recent logs: ' + err);
            } else {
                // Sort by timestamp descending and limit to 50
                recentLogs = (logs || [])
                    .sort(function(a, b) {
                        return new Date(b.timestamp) - new Date(a.timestamp);
                    })
                    .slice(0, 50);
            }
            recentLogsComplete = true;
            checkComplete();
        });
        
        // Check if all data is fetched
        function checkComplete() {
            if (userStatsComplete && endpointStatsComplete && recentLogsComplete) {
                // Calculate total calls
                var totalCalls = userStats.reduce(function(sum, user) {
                    return sum + user.totalCalls;
                }, 0);
                
                res.render('analytics', {
                    user: req.user,
                    period: period,
                    userStats: userStats,
                    endpointStats: endpointStats,
                    recentLogs: recentLogs,
                    totalCalls: totalCalls,
                    totalUsers: userStats.length,
                    totalEndpoints: endpointStats.length,
                    errors: errors.length > 0 ? errors : false,
                    moment: moment
                });
            }
        }
    });
    
    return router;
};

// ====================================================================================================
// ==================================== LOGIN HELPERS =================================================
// ====================================================================================================
// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    req.session.returnTo = '/analytics';
    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated() && req.user.globaladmin) {
        return next();
    }
    res.redirect('/login');
}


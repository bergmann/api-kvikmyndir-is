"use strict";
var express = require("express");
var logger = require("../services/logservice");
var DBService = require("../services/dbservice");
var config = require("../config/config");
var utils = require("../utils/utils");
var jwt = require("jsonwebtoken");
var auth = require("basic-auth");

// =====================================
// AUTHENTICATION ======================
// =====================================
module.exports = function () {
    var router = express.Router();
    // Route for domain/auth
    router.post("/", function (req, res) {
        var credentials = auth(req);

        // Check if credentials are provided
        console.log(credentials);
        if (!credentials || !credentials.name || !credentials.pass) {
            return res.status(400).json({
                success: false,
                message:
                    "Authentication failed. Credentials not provided or invalid.",
            });
        }

        DBService.findOne(
            { username: credentials.name.toLowerCase() },
            "users",
            function (err, user) {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message:
                            "An error occurred while querying the database.",
                    });
                }

                // Check if user was found
                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: "Authentication failed. User not found.",
                    });
                }

                // Check if password matches
                if (!utils.validPasswordHash(credentials.pass, user.password)) {
                    return res.status(401).json({
                        success: false,
                        message: "Authentication failed. Wrong password.",
                    });
                }

                if (!user.active) {
                    return res.status(403).json({
                        success: false,
                        message:
                            "Authentication failed. Your user has not yet been activated. Please contact admin user for activation.",
                    });
                }

                // Create a token and set expire time to 24 hours
                try {
                    var token = jwt.sign({ id: user._id }, config.secret, {
                        expiresIn: 86400, // 24 hours
                    });

                    // Return the information including token as JSON
                    return res.json({
                        success: true,
                        message: "Enjoy your token. It expires in 24 hours.",
                        token: token,
                    });
                } catch (error) {
                    return res.status(500).json({
                        success: false,
                        message: "Error generating token",
                        error: error.message,
                    });
                }
            }
        );
    });

    return router;
};

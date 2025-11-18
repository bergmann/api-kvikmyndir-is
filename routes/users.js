"use strict";
var express = require("express");
var { ObjectId } = require("mongodb");
var DBService = require("../services/dbservice");
var utils = require("../utils/utils");
var logger = require("../services/logservice");
var userModel = require("../models/user");

// USERS ROUTES
module.exports = function (passport) {
    var router = express.Router();
    // Display the users page
    router.get("/", isLoggedIn, function (req, res) {
        var error = req.flash("errors"),
            msg = req.flash("msg"),
            user = req.user;

        res.render("users", {
            errors: error.length > 0 ? error : false,
            msg: msg.length > 0 ? msg : false,
            postParams: false,
            user: user || false,
            userslist: false,
        });
    });

    // Get all users from database
    router.get("/users", isLoggedIn, function (req, res) {
        DBService.findDocuments({}, "users", function (err, users) {
            if (err) {
                logger
                    .databaseError()
                    .info("Error getting users from users collection: " + err);
                return res.json({
                    success: false,
                    message: "Error getting users from database: " + err,
                });
            }
            res.json(users);
        });
    });

    // Get user by id
    router.get("/:id", isLoggedIn, function (req, res) {
        var id = req.params.id;

        if (ObjectId.isValid(id)) {
            DBService.findOne(
                { _id: new ObjectId(id) },
                "users",
                function (err, user) {
                    if (err) {
                        return res.json({
                            success: false,
                            message: "Error getting user: " + err,
                        });
                    }
                    res.json(user);
                }
            );
        } else {
            res.json({
                success: false,
                message: "Not a valid ObjectId",
            });
        }
    });

    // Delete user
    router.delete("/", isLoggedIn, function (req, res) {
        var userid = req.body.id;
        if (!userid) {
            return res.json({
                success: false,
                message:
                    "No id in request. Please supply an id to delete user.",
            });
        }
        if (userid === configDB.MainGlobalAdminId) {
            return res.json({
                success: false,
                message: "You cannot delete the main global admin.",
            });
        }
        DBService.removeDocument(
            { _id: new ObjectId(userid) },
            "users",
            function (err) {
                if (err) {
                    logger
                        .databaseError()
                        .info(
                            "Error deleting user with id " + userid + ": " + err
                        );
                    return res.json({
                        success: false,
                        message: "Error deleting user with id " + userid,
                    });
                }
                res.json({
                    success: true,
                    message: "User deleted!",
                });
            }
        );
    });

    // Update user
    router.post("/", isLoggedIn, function (req, res) {
        var id = req.body._id;

        if (!ObjectId.isValid(id)) {
            var errors = {},
                postParams = {},
                hasError = false,
                user = userModel();
            delete user.password;

            Object.keys(req.body).forEach(function (key) {
                var value = req.body[key];
                switch (key) {
                    case "email":
                        if (!utils.validateEmail(value)) {
                            errors[key] = "Please enter a valid email address";
                            hasError = true;
                        } else {
                            user.email = value;
                        }
                        break;
                    case "password":
                        if (value && value.length < 6) {
                            errors[key] =
                                "Password must be at least 6 characters long";
                            hasError = true;
                        } else if (value) {
                            user.password = utils.generateHash(value);
                        }
                        break;
                    default:
                        if (
                            ["_id", "password", "email"].indexOf(key) === -1 &&
                            !value
                        ) {
                            errors[key] = `${key} is required`;
                            hasError = true;
                        } else {
                            user[key] = value;
                        }
                }
            });

            if (!hasError) {
                user.username = user.username.toLowerCase();

                DBService.updatePartialDocument(
                    { _id: new ObjectId(id) },
                    user,
                    "users",
                    function (err) {
                        if (err) {
                            logger
                                .databaseError()
                                .info(
                                    "Error updating user " +
                                        user.username +
                                        ": " +
                                        err
                                );
                            return res.json({
                                success: false,
                                message: "Error updating user: " + err,
                            });
                        }
                        res.json({
                            success: true,
                            message:
                                "User " + user.fullname + " has been updated.",
                        });
                    }
                );
            } else {
                res.json({
                    success: false,
                    message: "Validation errors found.",
                    errors: errors,
                });
            }
        } else {
            return res.json({
                success: false,
                message: "Invalid user ID provided.",
            });
        }
    });

    return router;
};

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
    req.session.returnTo = "/users";
    console.log("checking is logge din ", req.isAuthenticated());
    if (req.isAuthenticated() && req.user.globaladmin) {
        return next();
    }
    res.redirect("/login");
}

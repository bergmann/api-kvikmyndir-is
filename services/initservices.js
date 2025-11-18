"use strict";
var config = require("../config/api");
var HttpService = require("./httpservice");
var FileService = require("./fileservice");
var ExtraData = require("./extradata");
var paradisScraper = require("./paradisscraper");
var logger = require("./logservice");
var DBService = require("./dbservice");
var _underscore = require("underscore");
var fs = require("fs-extra");

/**
 * Initialize services
 * Gathers all information about movies in Icelandic Theaters
 * and saves it to database and to json files
 * @param {callback} callback function to run when all operations have finished
 * @author : Snær Seljan Þóroddsson
 */
var initServices = function (callback) {
    /**
     * SHOWTIMES AND FUTURE SHOWTIMES
     * Gets showtimes today and future showtimes for the next four days
     * Gathers all information about the movies
     * and saves it to database and to json files
     * @param {maxdays} Count of max days to get (maximum is 4 days)
     * @author : Snær Seljan Þóroddsson
     */
    var getFutureShowtimes = function (day, maxDays) {
        HttpService.getContent(
            config.kvikmyndirBaseUrl +
                config.showtimesDate +
                "/?key=" +
                config.kvikmyndirkey +
                "&dagur=" +
                day
        )
            .then(function (data) {
                if (data) {
                    try {
                        // Ensure data is a string before parsing
                        const jsonData =
                            typeof data === "string" ? JSON.parse(data) : data;

                        // Process the parsed JSON data
                        const result = ShowtimesFixer(jsonData);

                        DBService.removeDocument(
                            {},
                            "movies" + day,
                            function (err) {
                                if (err) {
                                    logger
                                        .databaseError()
                                        .info("Error: " + err);
                                }

                                if (day <= maxDays) {
                                    ExtraData.addExtraToMovies(
                                        result,
                                        config.dataBasePath +
                                            "/movies" +
                                            day +
                                            ".json",
                                        null,
                                        "movies" + day,
                                        function () {
                                            setTimeout(function () {
                                                getFutureShowtimes(
                                                    day + 1,
                                                    maxDays
                                                );
                                            }, 10000); // Because of moviedb request limit is 30 requests per 10 second
                                        }
                                    );
                                } else {
                                    console.log("Getting upcoming");
                                    getUpcoming();
                                }
                            }
                        );
                    } catch (error) {
                        logger
                            .error()
                            .info(
                                "Error parsing data: " +
                                    config.kvikmyndirBaseUrl +
                                    config.showtimesDate +
                                    "/?key=" +
                                    config.kvikmyndirkey +
                                    "&dagur=" +
                                    day +
                                    ", Error: " +
                                    error
                            );
                    }
                } else {
                    console.log("Getting upcoming2");
                    getUpcoming();
                }
            })
            .catch(function (err) {
                logger
                    .error()
                    .info(
                        "Error getting url2 " +
                            config.showtimesDate +
                            day +
                            " - " +
                            config.kvikmyndirBaseUrl +
                            config.showtimesDate +
                            "/?key=" +
                            config.kvikmyndirkey +
                            "&dagur=" +
                            day +
                            ", Error: " +
                            err
                    );
            });
    };

    /**
     * UPCOMING MOVIES
     * Gets upcoming movies coming to cinema
     * Gathers all information about movies
     * and saves it to database and to json files
     * @author : Snær Seljan Þóroddsson
     */
    var getUpcoming = function () {
        setTimeout(function () {
            console.log("Getting upcoming");
            console.log(
                config.kvikmyndirBaseUrl +
                    config.upcomming +
                    "/?count=50" +
                    "&key=" +
                    config.kvikmyndirkey
            );
            HttpService.getContent(
                config.kvikmyndirBaseUrl +
                    config.upcomming +
                    "/?count=50" +
                    "&key=" +
                    config.kvikmyndirkey
            )
                .then(function (data) {
                    if (data) {
                        console.log("We have upcoming data");
                        // Ensure data is a string before parsing
                        const jsonData =
                            typeof data === "string" ? JSON.parse(data) : data;

                        var result = jsonData;
                        console.log("Upcoming movies count:", result.length);

                        // Remove all documents from upcoming collection
                        DBService.removeDocument(
                            {},
                            "upcoming",
                            function (err) {
                                if (err) {
                                    logger
                                        .databaseError()
                                        .info(
                                            "Error removing all documents from upcoming collection, Error: " +
                                                err
                                        );
                                } else {
                                    console.log("Successfully removed all documents from upcoming collection");
                                }
                                ExtraData.addExtraToMovies(
                                    result,
                                    config.upcommingfilepath,
                                    config.extraImages,
                                    "upcoming",
                                    callback
                                );
                            }
                        );
                    }
                })
                .catch(function (err) {
                    logger
                        .error()
                        .info(
                            "Error getting url 3 " +
                                config.upcomming +
                                ", Error: " +
                                err
                        );
                });
        }, 10000); // Because of moviedb request limit is 30 requests per 10 second
    };

    // Get genres from services and write to json file
    // and save data to collection genres
    HttpService.getContent(
        config.kvikmyndirBaseUrl +
            config.genres +
            "?key=" +
            config.kvikmyndirkey
    )
        .then(function (data) {
            if (data) {
                var result = JSON.parse(data);
                // Clean property names (removes tab characters like "NameEN\t")
                result = utils.cleanPropertyNames(result);
                FileService.writeToJson(result, config.genresfilepath);

                // Save to MongoDB
                DBService.removeDocument({}, "genres", function (err) {
                    if (err) {
                        logger
                            .databaseError()
                            .info("Error removing genres from database: " + err);
                    }
                    DBService.insertDocument(result, "genres", function (err, res) {
                        if (err) {
                            logger
                                .databaseError()
                                .info("Error inserting genres to database: " + err);
                        }
                    });
                });
            }
        })
        .catch(function (err) {
            logger
                .error()
                .info(
                    "Error getting url " + config.genresurl + ", Error: " + err
                );
        });

    // Get theaters from kvikmyndir.is API and save to json file and database
    HttpService.getContent(
        config.kvikmyndirBaseUrl +
            "/theaters" +
            "?key=" +
            config.kvikmyndirkey
    )
        .then(function (data) {
            if (data) {
                var result = JSON.parse(data);
                // Clean property names (removes tab characters like "address")
                result = utils.cleanPropertyNames(result);
                FileService.writeToJson(result, config.theatersfilepath);

                // Save to MongoDB
                DBService.removeDocument({}, "theaters", function (err) {
                    if (err) {
                        logger
                            .databaseError()
                            .info("Error removing theaters from database: " + err);
                    }
                    DBService.insertDocument(result, "theaters", function (err, res) {
                        if (err) {
                            logger
                                .databaseError()
                                .info("Error inserting theaters to database: " + err);
                        }
                    });
                });
            }
        })
        .catch(function (err) {
            logger
                .error()
                .info(
                    "Error getting theaters from API, Error: " + err
                );
        });

    // Gets future showtimes from kvikmyndir.is
    // And add other data from other services
    getFutureShowtimes(0, 4);
};

/**
 * BÍÓ PARADÍS MOVIES SCRAPER
 * Gathers all information about movies in Bíó Paradís
 * and saves it to database and to json files
 * @author : Snær Seljan Þóroddsson
 */
// Bíó paradís movie scraper
var getBioparadis = function () {
    setTimeout(function () {
        HttpService.getContent(
            config.bioparadisApiUrl + config.bioparadisApiKey
        )
            .then(function (data) {
                if (data) {
                    var result = JSON.parse(data);
                } else {
                    paradisScraper.init(callback);
                }
            })
            .catch(function (err) {
                logger
                    .error()
                    .info(
                        "Error getting url 4" +
                            config.bioparadisApiUrl +
                            ", Error: " +
                            err
                    );
            });
    }, 10000); // Moviedb request limit is 30 requests per 10 second
};

//getBioparadis();

/**
 * Removes all dublicates from showtimes array
 * @param {movies} movies to iterate through
 * @author Snær Seljan Þóroddsson
 */
function ShowtimesFixer(movies) {
    movies.forEach(function (movie) {
        if (movie.showtimes) {
            movie.showtimes.forEach(function (showtime) {
                if (showtime.schedule) {
                    showtime.schedule = _underscore._.uniq(showtime.schedule);
                }
            });
        }
    });
    return movies;
}

module.exports = initServices;

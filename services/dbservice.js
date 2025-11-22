"use strict";
var MongoClient = require("mongodb").MongoClient;
var DBconfig = require("../config/database");
var logger = require("./logservice");

// Database connection string
var url = DBconfig.MongoDBUrlDev;

/**
 * Creates connection to database
 * --------------------------------------
 * @param {func} callback function to run
 */
var MongoClient = require("mongodb").MongoClient;

var connectToDataBase = function (callback) {
    MongoClient.connect(url)
        .then((client) => {
            const db = client.db(DBconfig.dbName); // Access the database
            callback(null, db, client); // Pass the db and client for further operations and closing the connection
        })
        .catch((err) => {
            callback(err, null, null); // Handle any connection errors
        });
};

/**
 * Create collection if it does not exist
 * --------------------------------------
 * @param {obj} database object
 * @param {string} collection name
 * @param {func} callback function to run
 */
var createCollection = function (db, collectionName, callback) {
    db.createCollection(collectionName, {
        capped: true, // Indicate that this is a capped collection
        size: 2147483648, // Size in bytes
    })
        .then((collection) => {
            callback(null, collection);
        })
        .catch((err) => {
            logger.databaseError().info("Error creating collection! " + err);
            callback(err, null);
        });
};

/**
 * Inserts all movies into database
 * --------------------------------------
 * @param {obj} movies to insert
 * @param {string} collection name
 * @param {func} callback function to run
 */
var insertManyDocument = function (movies, collectionName, callback) {
    connectToDataBase(function (err, db, client) {
        if (err) {
            logger.databaseError().info("Error connection to database " + err);
            callback(err);
        } else {
            /*createCollection(db, collectionName, function (err) {
        if (err) {
          callback(err);
          return;
        }*/
            var collection = db.collection(collectionName);
            collection
                .insertMany(movies)
                .then((result) => {
                    callback(null, result);
                })
                .catch((err) => {
                    callback(err);
                })
                .finally(() => {
                    client.close();
                });
            //});
        }
    });
};

/**
 * Inserts all movies into database
 * Only inserts if movie object has changed
 * --------------------------------------
 * @param {obj} movies to insert
 * @param {string} collection name
 * @param {func} callback function to run
 */
var insertDocument = function (movies, collectionName, callback) {
    connectToDataBase(function (err, db, client) {
        if (err) {
            logger.databaseError().info("Error connecting to database " + err);
            callback(err, null);
        } else {
            /*createCollection(db, collectionName, function (createErr) {
        if (createErr) {
          callback(createErr, null);
          return;
        }*/

            var collection = db.collection(collectionName);

            // Use Promise.all to handle multiple asynchronous operations
            Promise.all(
                movies.map((movie) => {
                    var criteria = { id: movie.id, title: movie.title };
                    if (collectionName === "extraimages") {
                        criteria = { imdbid: movie.imdbid };
                    }

                    return collection.updateOne(
                        criteria,
                        { $set: movie },
                        { upsert: true }
                    );
                })
            )
                .then((results) => {
                    callback(null, results);
                })
                .catch((updateErr) => {
                    callback(updateErr, null);
                })
                .finally(() => {
                    client.close();
                });
            // });
        }
    });
};

/**
 * Inserts any obj document into database
 * --------------------------------------
 * @param {obj} obj to insert
 * @param {string} collection name
 * @param {func} callback function to run
 */
var insertAny = function (document, collectionName, callback) {
    connectToDataBase(function (err, db, client) {
        if (err) {
            logger.databaseError().info("Error connecting to database " + err);
            if (callback) callback(err, null);
        } else {
            /*  createCollection(db, collectionName, function (createErr) {
        if (createErr) {
          if (callback) callback(createErr, null);
          return;
        }
        */
            var collection = db.collection(collectionName);

            // Check if 'document' is an array to decide between insertMany and insertOne
            let insertOperation;
            if (Array.isArray(document)) {
                insertOperation = collection.insertMany(document);
            } else {
                insertOperation = collection.insertOne(document);
            }

            insertOperation
                .then((result) => {
                    if (callback) callback(null, result);
                })
                .catch((insertErr) => {
                    if (callback) callback(insertErr, null);
                })
                .finally(() => {
                    client.close();
                });
            //});
        }
    });
};

/**
 * Remove documents or document from database
 * for example an empty object removes all documents
 * --------------------------------------
 * @param {obj} obj to remove from db
 * @param {string} collection name
 * @param {func} callback function to run
 */
var removeDocument = function (obj, collectionName, callback) {
    connectToDataBase(function (err, db, client) {
        if (err) {
            logger.databaseError().info("Error connecting to database " + err);
            callback(err, null);
        } else {
            var collection = db.collection(collectionName);
            collection.deleteMany(obj, function (deleteErr, result) {
                callback(deleteErr, result);
                client.close();
            });
            callback(err, "");
        }
        callback(err, "");
    });
};

/**
 * Query database with query object
 * Only returns one document
 * for example { title : 'Movie name'} returns
 * one document with same title name
 * --------------------------------------
 * @param {obj} queryObject to query
 * @param {string} collection name
 * @param {func} callback function to run
 */
var findDocument = function (queryObj, collectionName, callback) {
    connectToDataBase(function (err, db, client) {
        if (err) {
            logger.databaseError().info("Error connecting to database " + err);
            callback(err, null);
        } else {
            var collection = db.collection(collectionName);

            let findOperation = queryObj
                ? collection.find(queryObj).limit(1)
                : collection.find();

            findOperation
                .toArray()
                .then((docs) => {
                    callback(null, docs);
                })
                .catch((findErr) => {
                    callback(findErr, null);
                })
                .finally(() => {
                    client.close();
                });
        }
    });
};

/**
 * Query database and returns one document
 * Only returns one document
 * for example { _id : id} returns
 * one document with same id name if exsist
 * --------------------------------------
 * @param {obj} queryObject to query
 * @param {string} collection name
 * @param {func} callback function to run
 */
var findOne = function (queryObj, collectionName, callback) {
    connectToDataBase(function (err, db, client) {
        if (err) {
            logger.databaseError().info("Error connecting to database " + err);
            callback(err, null);
        } else {
            var collection = db.collection(collectionName);
            if (queryObj) {
                collection
                    .findOne(queryObj)
                    .then((doc) => {
                        callback(null, doc);
                    })
                    .catch((findErr) => {
                        callback(findErr, null);
                    })
                    .finally(() => {
                        client.close();
                    });
            } else {
                callback("No query object supplied", null);
                client.close();
            }
        }
    });
};

/**
 * Query database with query object
 * Can return multiple documents
 * for example { title : 'Movie name'} returns
 * all documents with same title name
 * --------------------------------------
 * @param {obj} queryObject to query
 * @param {string} collection name
 * @param {func} callback function to run
 */
var findDocuments = function (queryObj, collectionName, callback) {
    connectToDataBase(function (err, db, client) {
        if (err) {
            logger.databaseError().info("Error connecting to database " + err);
            callback(err, null);
        } else {
            var collection = db.collection(collectionName);
            let findOperation = collection.find(queryObj ? queryObj : {});

            findOperation
                .toArray()
                .then((docs) => {
                    callback(null, docs);
                })
                .catch((findErr) => {
                    callback(findErr, null);
                })
                .finally(() => {
                    client.close();
                });
        }
    });
};

/**
 * Update specific document or documents if multiObj is defined

 * --------------------------------------
 * @param {obj} queryObject: to query
 * @param {obj} updateObj : object to update
 * @param {boolean} multiObj: If set to true, updates multiple documents that meet the query criteria. 
 * @param {string} collection name
 * @param {func} callback function to run 
 */
var updateDocument = function (
    queryObj,
    updateObj,
    multiObj,
    collectionName,
    callback
) {
    connectToDataBase(function (err, db, client) {
        if (err) {
            logger.databaseError().info("Error connection to database " + err);
        } else {
            var collection = db.collection(collectionName);
            // Choose updateOne or updateMany based on multiObj
            let updateMethod = multiObj
                ? collection.updateMany
                : collection.updateOne;

            updateMethod(queryObj, updateObj, function (err, docs) {
                callback(err, docs);
                client.close();
            });
        }
    });
};

/**
 * Update specific part of a document

 * --------------------------------------
 * @param {obj} queryObject: to query
 * @param {obj} updateObj : object to update
 * @param {string} collection name
 * @param {func} callback function to run
 */
var updatePartialDocument = function (
    queryObj,
    updateObj,
    collectionName,
    callback
) {
    connectToDataBase(function (err, db, client) {
        if (err) {
            logger.databaseError().info("Error connection to database " + err);
        } else {
            var collection = db.collection(collectionName);
            collection.updateOne(
                queryObj,
                { $set: updateObj },
                function (err, docs) {
                    callback(err, docs);
                    client.close();
                }
            );
        }
    });
};

/**
 * Run aggregation pipeline on a collection
 * --------------------------------------
 * @param {array} pipeline - Aggregation pipeline array
 * @param {string} collectionName - Collection name
 * @param {func} callback - Callback function to run
 */
var aggregate = function (pipeline, collectionName, callback) {
    connectToDataBase(function (err, db, client) {
        if (err) {
            logger.databaseError().info("Error connecting to database " + err);
            callback(err, null);
        } else {
            var collection = db.collection(collectionName);
            collection
                .aggregate(pipeline)
                .toArray()
                .then((results) => {
                    callback(null, results);
                })
                .catch((aggregateErr) => {
                    callback(aggregateErr, null);
                })
                .finally(() => {
                    client.close();
                });
        }
    });
};

/**
 * Wrapper object for main database query methods
 * */
var DBService = {
    insertManyDocument: function (movies, collectionName, callback) {
        insertManyDocument(movies, collectionName, callback);
    },
    insertDocument: function (movies, collectionName, callback) {
        insertDocument(movies, collectionName, callback);
    },
    insertAny: function (obj, collectionName, callback) {
        insertAny(obj, collectionName, callback);
    },
    findDocument: function (queryObj, collectionName, callback) {
        findDocument(queryObj, collectionName, callback);
    },
    findDocuments: function (queryObj, collectionName, callback) {
        findDocuments(queryObj, collectionName, callback);
    },
    findOne: function (queryObj, collectionName, callback) {
        findOne(queryObj, collectionName, callback);
    },
    removeDocument: function (obj, collectionName, callback) {
        removeDocument(obj, collectionName, callback);
    },
    updateDocument: function (
        queryObj,
        updateObj,
        multiObj,
        collectionName,
        callback
    ) {
        updateDocument(queryObj, updateObj, multiObj, collectionName, callback);
    },
    updatePartialDocument: function (
        queryObj,
        updateObj,
        collectionName,
        callback
    ) {
        updatePartialDocument(queryObj, updateObj, collectionName, callback);
    },
    aggregate: function (pipeline, collectionName, callback) {
        aggregate(pipeline, collectionName, callback);
    },
};

module.exports = DBService;

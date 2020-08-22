var Genre = require('../models/genre');
var Book = require('../models/book');
var debug = require('debug')('genre');
var async = require('async');
const { body, validationResult } = require('express-validator');

// Display list of all Genre.
exports.genre_list = (_req, res, next) => {

    Genre.find()
        .sort([['name', 'ascending']])
        .exec(function (err, genre_list) {
            if (err) {
                debug('list error:' + err);
                return next(err)
            };

            res.render('genre_list', { title: 'Genre List', genre_list });
        });

};

// Display detail page for a specific Genre.
exports.genre_detail = (req, res, next) => {

    async.parallel({
        genre: (callback) => {
            Genre.findById(req.params.id)
                .exec(callback);
        },
        genre_books: (callback) => {
            Book.find({ 'genre': req.params.id })
                .exec(callback);
        }
    }, (err, results) => {
        if (err) {
            debug('detail error:' + err);
            return next(err)
        };

        if (results.genre == null) {
            let err = new Error('Genre not found');
            err.status = 404;
            debug('detail error:' + err);
            return next(err);
        }

        res.render('genre_detail', { title: 'Genre Detail', genre: results.genre, genre_books: results.genre_books });
    })

};

// Display Genre create form on GET.
exports.genre_create_get = (_req, res) => {
    res.render('genre_form', { title: 'Create Genre' });
};

// Handle Genre create on POST.
exports.genre_create_post = [

    // Validate that the name field is not empty, then sanitize
    body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),

    // Process after validation and sanitization
    (req, res, next) => {

        // Extract validation errors
        const errors = validationResult(req);

        // Genre object with escaped (sanitized) and trimmed data
        let genre = new Genre(
            { name: req.body.name }
        );

        if (!errors.isEmpty()) {
            // Errors are present
            res.render('genre_form', { title: 'Create Genre', genre, errors: errors.array() });
            return;
        }
        else {
            // Form data is valid
            // Check if Genre with same name already exists
            Genre.findOne({ 'name': req.body.name })
                .exec((err, found_genre) => {
                    if (err) {
                        debug('create error:' + err);
                        return next(err)
                    };

                    if (found_genre) {
                        // Found Genre, redirect to its detail page
                        res.redirect(found_genre.url);
                    }
                    else {
                        genre.save((err) => {
                            if (err) {
                                debug('create error:' + err);
                                return next(err)
                            };

                            // Genre saved successfully, redirect to genre detail page
                            res.redirect(genre.url);
                        });
                    }
                });
        }
    }
];

// Display Genre delete form on GET.
exports.genre_delete_get = (req, res, next) => {

    async.parallel({
        genre: (callback) => {
            Genre.findById(req.params.id)
                .exec(callback);
        },
        genre_books: (callback) => {
            Book.find({ 'genre': req.params.id })
                .exec(callback);
        }
    }, (err, results) => {
        if (err) {
            debug('delete error:' + err);
            return next(err)
        };

        // Genre not found
        if (results.genre == null) {
            res.redirect('/catalog/genres');
        }

        res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, genre_books: results.genre_books });
    });

};

// Handle Genre delete on POST.
exports.genre_delete_post = (req, res, next) => {

    async.parallel({
        genre: (callback) => {
            Genre.findById(req.body.genreid)
                .exec(callback);
        },
        genre_books: (callback) => {
            Book.find({ 'genre': req.body.genreid })
                .exec(callback);
        }
    }, (err, results) => {
        if (err) {
            debug('delete error:' + err);
            return next(err)
        };

        // Genre not found
        if (results.genre_books.length > 0) {
            res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, genre_books: results.genre_books });
        }
        else {
            // Genre has no books. Delete object and redirect to the list of genres.
            Genre.findByIdAndRemove(req.body.genreid, { useFindAndModify: false }, (err) => {
                if (err) {
                    debug('delete error:' + err);
                    return next(err)
                };

                // Success - go to genre list
                res.redirect('/catalog/genres')
            })
        }
    });

};

// Display Genre update form on GET.
exports.genre_update_get = (req, res, next) => {

    Genre.findById(req.params.id, (err, genre) => {
        if (err) {
            debug('update error:' + err);
            return next(err)
        };

        if (genre == null) {
            let err = new Error('Genre not found');
            err.status = 404;
            debug('update error:' + err);
            return next(err);
        }

        res.render('genre_form', { title: 'Update Genre', genre });
    });
};

// Handle Genre update on POST.
exports.genre_update_post = [

    // Validate that the name field is not empty, then sanitize
    body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),

    // Process after validation and sanitization
    (req, res, next) => {

        // Extract validation errors
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // Errors are present
            res.render('genre_form', { title: 'Update Genre', genre: req.body, errors: errors.array() });
            return;
        }
        else {
            // Form data is valid

            // Genre object with escaped (sanitized) and trimmed data
            let genre = new Genre({
                name: req.body.name,
                _id: req.params.id
            });

            // Update the record
            Genre.findByIdAndUpdate(req.params.id, genre, { useFindAndModify: false }, (err, thegenre) => {
                if (err) {
                    debug('update error:' + err);
                    return next(err)
                };

                // Successful - redirect to genre detail page.
                res.redirect(thegenre.url);
            });
        }
    }
];
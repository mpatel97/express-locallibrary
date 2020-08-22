var Book = require('../models/book');
var Author = require('../models/author');
var Genre = require('../models/genre');
var BookInstance = require('../models/bookinstance');
var debug = require('debug')('book');
var async = require('async');
const { body, validationResult } = require('express-validator');

exports.index = (_req, res) => {

    async.parallel({
        book_count: (callback) => {
            Book.countDocuments({}, callback);
        },
        book_instance_count: (callback) => {
            BookInstance.countDocuments({}, callback);
        },
        book_instance_available_count: (callback) => {
            BookInstance.countDocuments({ status: 'Available' }, callback);
        },
        author_count: (callback) => {
            Author.countDocuments({}, callback);
        },
        genre_count: (callback) => {
            Genre.countDocuments({}, callback);
        }
    }, (err, results) => {
        res.render('index', { title: 'Local Library Home', error: err, data: results })
    });

};

// Display list of all books.
exports.book_list = (_req, res, next) => {

    Book.find({}, 'title author')
        .populate('author')
        .exec((err, book_list) => {
            if (err) {
                debug('list error:' + err);
                return next(err)
            };

            res.render('book_list', { title: 'Book List', book_list });
        });

};

// Display detail page for a specific book.
exports.book_detail = (req, res, next) => {

    async.parallel({
        book: (callback) => {

            Book.findById(req.params.id)
                .populate('author')
                .populate('genre')
                .exec(callback);
        },
        book_instance: (callback) => {

            BookInstance.find({ 'book': req.params.id })
                .exec(callback);
        }
    }, (err, results) => {
        if (err) {
            debug('detail error:' + err);
            return next(err)
        };

        if (results == null) {
            let err = new Error('Book not found');
            err.status = 404;
            debug('detail error:' + err);
            return next(err);
        }

        res.render('book_detail', { title: results.book.title, book: results.book, book_instances: results.book_instance });
    });

};

// Display book create form on GET.
exports.book_create_get = (_req, res, next) => {

    // Get all authors and genres
    async.parallel({
        authors: (callback) => {
            Author.find(callback);
        },
        genres: (callback) => {
            Genre.find(callback);
        }
    }, (err, results) => {
        if (err) {
            debug('create error:' + err);
            return next(err)
        };

        res.render('book_form', { title: 'Create Book', authors: results.authors, genres: results.genres });
    });
};

// Handle book create on POST.
exports.book_create_post = [

    // Convert genre to an array
    (req, _res, next) => {
        if (!(req.body.genre instanceof Array)) {
            if (typeof req.body.genre != 'undefined')
                req.body.genre = [];
            else
                req.body.genre = new Array(req.body.genre);
        }
        next();
    },

    // Validate & sanitize fields
    body('title', 'Title must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('author', 'Author must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }).escape(),
    body('genre.*').escape(),

    // Process request
    (req, res, next) => {

        // Extract validation errors
        const errors = validationResult(req);

        // Create Book object with sanitized data
        let book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: req.body.genre
        });

        if (!errors.isEmpty()) {
            // Errors found, render form again with sanitized values & error message(s)

            // Get all authors and genres
            async.parallel({
                authors: (callback) => {
                    Author.find(callback);
                },
                genres: (callback) => {
                    Genre.find(callback);
                }
            }, (err, results) => {
                if (err) {
                    debug('create error:' + err);
                    return next(err)
                };

                for (let i = 0; i < results.genres.length; i++) {
                    if (book.genre.indexOf(results.genres[i]._id) > -1) {
                        // Current genre is selected. Set "checked" flag.
                        results.genres[i].checked = true;
                    }
                }

                res.render('book_form', { title: 'Create Book', authors: results.authors, genres: results.genres, book: book, errors: errors.array() });
            })
            return;
        }
        else {
            // Form data is valid
            book.save((err) => {
                if (err) {
                    debug('create error:' + err);
                    return next(err)
                };

                // Form submission successful, redirect to new book's details
                res.redirect(book.url);
            });
        }
    }
];

// Display book delete form on GET.
exports.book_delete_get = (req, res, next) => {

    async.parallel({
        book: (callback) => {
            Book.findById(req.params.id).exec(callback)
        },
        book_instances: (callback) => {
            BookInstance.find({ 'book': req.params.id }).exec(callback)
        }
    }, function (err, results) {
        if (err) {
            debug('delete error:' + err);
            return next(err)
        };

        if (results.book == null) { // No results
            res.redirect('/catalog/books');
        }

        // Successful
        res.render('book_delete', { title: 'Delete Book', book: results.book, book_instances: results.book_instances });
    });
};

// Handle book delete on POST.
exports.book_delete_post = (req, res, next) => {

    async.parallel({
        book: (callback) => {
            Book.findById(req.body.bookid).exec(callback)
        },
        book_instances: (callback) => {
            BookInstance.find({ 'book': req.body.bookid }).exec(callback)
        }
    }, function (err, results) {
        if (err) {
            debug('delete error:' + err);
            return next(err)
        };

        // Success
        if (results.book_instances.length > 0) {
            // Book has instances. Render in same way as for GET route.
            res.render('book_delete', { title: 'Delete Book', book: results.book, book_instances: results.book_instances });
            return;
        }
        else {
            // Book has no instances. Delete object and redirect to the list of books.
            Book.findByIdAndRemove(req.body.bookid, { useFindAndModify: false }, (err) => {
                if (err) {
                    debug('delete error:' + err);
                    return next(err)
                };

                // Success - go to book list
                res.redirect('/catalog/books')
            })
        }
    });

};

// Display book update form on GET.
exports.book_update_get = (req, res, next) => {

    // Get book, authors and genres for form
    async.parallel({
        book: (callback) => {
            Book.findById(req.params.id).populate('author').populate('genre').exec(callback);
        },
        authors: (callback) => {
            Author.find(callback);
        },
        genres: (callback) => {
            Genre.find(callback);
        }
    }, (err, results) => {
        if (err) {
            debug('update error:' + err);
            return next(err)
        };

        if (results.book == null) {
            let err = new Error('Book not found');
            err.status = 404;
            debug('update error:' + err);
            return next(err);
        }

        // Success
        // Mark selected genres as checked
        for (let i = 0; i < results.genres.length; i++) {
            for (let j = 0; j < results.book.genre.length; j++) {
                if (results.genres[i]._id.toString() == results.book.genre[j]._id.toString())
                    results.genres[i].checked = true;
            }
        }

        res.render('book_form', { title: 'Update Book', authors: results.authors, genres: results.genres, book: results.book });
    });

};

// Handle book update on POST.
exports.book_update_post = [

    // Convert the genre to an array
    (req, _res, next) => {
        if (!(req.body.genre instanceof Array)) {
            if (typeof req.body.genre === 'undefined')
                req.body.genre = [];
            else
                req.body.genre = new Array(req.body.genre);
        }
        next();
    },

    // Validate & sanitize fields
    body('title', 'Title must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('author', 'Author must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }).escape(),
    body('genre.*').escape(),

    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a Book object with escaped/trimmed data and old id.
        var book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: (typeof req.body.genre === 'undefined') ? [] : req.body.genre,
            _id: req.params.id //This is required, or a new ID will be assigned!
        });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.

            // Get all authors and genres for form.
            async.parallel({
                authors: (callback) => {
                    Author.find(callback);
                },
                genres: (callback) => {
                    Genre.find(callback);
                }
            }, (err, results) => {
                if (err) {
                    debug('update error:' + err);
                    return next(err)
                };

                // Mark our selected genres as checked.
                for (let i = 0; i < results.genres.length; i++) {
                    if (book.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked = 'true';
                    }
                }
                res.render('book_form', { title: 'Update Book', authors: results.authors, genres: results.genres, book: book, errors: errors.array() });
            });
            return;
        }
        else {
            // Data from form is valid. Update the record.
            Book.findByIdAndUpdate(req.params.id, book, { useFindAndModify: false }, (err, thebook) => {
                if (err) {
                    debug('update error:' + err);
                    return next(err)
                };

                // Successful - redirect to book detail page.
                res.redirect(thebook.url);
            });
        }
    }
];
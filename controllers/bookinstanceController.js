var BookInstance = require('../models/bookinstance');
var Book = require('../models/book');
var debug = require('debug')('bookinstance');
var async = require('async');
const { body, validationResult } = require('express-validator');

// Display list of all BookInstances.
exports.bookinstance_list = (_req, res, next) => {

    BookInstance.find()
        .populate('book')
        .exec((err, bookinstance_list) => {
            if (err) {
                debug('list error:' + err);
                return next(err)
            };

            res.render('bookinstance_list', { title: 'Book Instance List', bookinstance_list });
        });

};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = (req, res, next) => {

    BookInstance.findById(req.params.id)
        .populate('book')
        .exec((err, bookinstance) => {
            if (err) {
                debug('detail error:' + err);
                return next(err)
            };

            if (bookinstance == null) {
                let err = new Error('Book copy not found');
                err.status = 404;
                debug('detail error:' + err);
                return next(err);
            }

            res.render('bookinstance_detail', { title: `Copy ${bookinstance.book.title}`, bookinstance });
        });

};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = (_req, res, next) => {

    Book.find({}, 'title')
        .exec((err, book_list) => {
            if (err) {
                debug('create error:' + err);
                return next(err)
            };

            res.render('bookinstance_form', { title: 'Create Book Instance', book_list });
        });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [

    // Validate & sanitize fields
    body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
    body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }).escape(),
    body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601().escape(),
    body('status').trim().escape(),

    // Process request
    (req, res, next) => {

        // Extract validation errors
        const errors = validationResult(req);

        // Create BookInstance object with sanitized field values
        let bookinstance = new BookInstance({
            book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back
        });

        if (!errors.isEmpty()) {
            // Error's found, render form again with sanitized values and error message(s)
            Book.find({}, 'title')
                .exec((err, book_list) => {
                    if (err) {
                        debug('create error:' + err);
                        return next(err)
                    };

                    res.render('bookinstance_form', { title: 'Create Book Instance', book_list, selected_book: bookinstance.book._id, errors: errors.array(), bookinstance });
                });
            return;
        }
        else {
            // Form data is valid

            bookinstance.save((err) => {
                if (err) {
                    debug('create error:' + err);
                    return next(err)
                };

                // Successful - redirect to book instance's details
                res.redirect(bookinstance.url);
            });
        }
    }
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = (req, res, next) => {

    BookInstance.findById(req.params.id).populate('book').exec((err, bookinstance) => {
        if (err) {
            debug('delete error:' + err);
            return next(err)
        };

        if (bookinstance == null) {
            let err = new Error('Book Instance not found');
            err.status = 404;
            debug('delete error:' + err);
            return next(err);
        }

        res.render('bookinstance_delete', { title: 'Delete Book Instance', bookinstance });
    });

};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = (req, res, next) => {

    BookInstance.findById(req.body.bookinstanceid, (err, result) => {
        if (err) {
            debug('delete error:' + err);
            return next(err)
        };

        if (result == null) {
            let err = new Error('Book Instance not found');
            err.status = 404;
            debug('delete error:' + err);
            return next(err);
        }

        // Remove BookInstance
        BookInstance.findByIdAndRemove(req.body.bookinstanceid, { useFindAndModify: false }, (err) => {
            if (err) {
                debug('delete error:' + err);
                return next(err)
            };

            // Success - go to bookinstance list
            res.redirect('/catalog/bookinstances')
        })
    });

};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = (req, res, next) => {

    async.parallel({
        bookinstance: (callback) => {
            BookInstance.findById(req.params.id).populate('book').exec(callback);
        },
        books: (callback) => {
            Book.find(callback);
        }
    }, (err, results) => {
        if (err) {
            debug('update error:' + err);
            return next(err)
        };

        if (results.bookinstance == null) {
            let err = new Error('Book Instance not found');
            err.status = 404;
            debug('update error:' + err);
            return next(err);
        }

        res.render('bookinstance_form', { title: 'Update Book Instance', bookinstance: results.bookinstance, book_list: results.books });
    });
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [

    // Validate & sanitize fields
    body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
    body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }).escape(),
    body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601().escape(),
    body('status').trim().escape(),

    // Process request
    (req, res, next) => {

        // Extract validation errors
        const errors = validationResult(req);

        // Create BookInstance object with sanitized field values
        let bookinstance = new BookInstance({
            book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back,
            _id: req.params.id //This is required, or a new ID will be assigned!
        });

        if (!errors.isEmpty()) {
            // Error's found, render form again with sanitized values and error message(s)
            Book.find({}, 'title')
                .exec((err, book_list) => {
                    if (err) {
                        debug('update error:' + err);
                        return next(err)
                    };

                    res.render('bookinstance_form', { title: 'Update Book Instance', book_list, selected_book: bookinstance.book._id, errors: errors.array(), bookinstance });
                });
            return;
        }
        else {

            // Form data is valid, update the record
            BookInstance.findByIdAndUpdate(req.params.id, bookinstance, { useFindAndModify: false }, (err, thebookinstance) => {
                if (err) {
                    debug('update error:' + err);
                    return next(err)
                };

                // Successful - redirect to book instance detail page.
                res.redirect(thebookinstance.url);
            });

        }
    }
];
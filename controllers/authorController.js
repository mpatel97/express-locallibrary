var Author = require('../models/author');
var Book = require('../models/book');
var async = require('async');
var debug = require('debug')('author');
const { body, validationResult } = require('express-validator');

// Display list of all Authors
exports.author_list = (_req, res, next) => {

    Author.find()
        .populate('author')
        .sort([['family_name', 'ascending']])
        .exec((err, author_list) => {
            if (err) {
                debug('list error:' + err);
                return next(err);
            }

            res.render('author_list', { title: 'Author List', author_list })
        });

}

// Display detail page for a specific Author
exports.author_detail = (req, res, next) => {

    async.parallel({
        author: (callback) => {
            Author.findById(req.params.id)
                .exec(callback)
        },
        authors_books: (callback) => {
            Book.find({ 'author': req.params.id }, 'title summary')
                .exec(callback)
        }
    }, (err, results) => {
        if (err) {
            debug('detail error:' + err);
            return next(err)
        };

        if (results.author == null) {
            let err = new Error('Author not found');
            err.status = 404;
            debug('detail error:' + err);
            return next(err);
        }

        res.render('author_detail', { title: 'Author Detail', author: results.author, author_books: results.authors_books });
    });

}

// Display Author create form on GET.
exports.author_create_get = (_req, res) => {
    res.render('author_form', { title: 'Create Author' });
};

// Handle Author create on POST.
exports.author_create_post = [

    // Validate & sanitize fields
    body('first_name').trim()
        .isLength({ min: 1 }).withMessage('First name must be specified.')
        .isAlphanumeric().withMessage('First name has non-alphanumeric characters')
        .escape(),
    body('family_name').trim()
        .isLength({ min: 1 }).withMessage('Family name must be specified.')
        .isAlphanumeric().withMessage('Family name has non-alphanumeric characters')
        .escape(),
    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601().toDate(),
    body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601().toDate(),

    // Process request after validation and sanitization
    (req, res, next) => {

        // Extract form errors
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // Errors are present, render form again with sanitized values & error message(s)
            res.render('author_form', { title: 'Create Author', author: req.body, errors: errors.array() });
            return;
        }
        else {
            // Form data is valid

            // Create Author object with escaped and trimmed data
            let author = new Author({
                first_name: req.body.first_name,
                family_name: req.body.family_name,
                date_of_birth: req.body.date_of_birth,
                date_of_death: req.body.date_of_death
            });

            author.save((err) => {
                if (err) {
                    debug('create error:' + err);
                    return next(err)
                };

                // Successful - redirect to new author's detail page
                res.redirect(author.url);
            });
        }
    }
];

// Display Author delete form on GET.
exports.author_delete_get = (req, res, next) => {

    async.parallel({
        author: (callback) => {
            Author.findById(req.params.id).exec(callback)
        },
        authors_books: (callback) => {
            Book.find({ 'author': req.params.id }).exec(callback)
        }
    }, function (err, results) {
        if (err) {
            debug('create error:' + err);
            return next(err)
        };

        if (results.author == null) { // No results
            res.redirect('/catalog/authors');
        }

        // Successful
        res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.authors_books });
    });

};

// Handle Author delete on POST.
exports.author_delete_post = (req, res, next) => {

    async.parallel({
        author: (callback) => {
            Author.findById(req.body.authorid).exec(callback)
        },
        authors_books: (callback) => {
            Book.find({ 'author': req.body.authorid }).exec(callback)
        }
    }, (err, results) => {
        if (err) {
            debug('delete error:' + err);
            return next(err)
        };

        // Success
        if (results.authors_books.length > 0) {
            // Author has books. Render in same way as for GET route.
            res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.authors_books });
            return;
        }
        else {
            // Author has no books. Delete object and redirect to the list of authors.
            Author.findByIdAndRemove(req.body.authorid, { useFindAndModify: false }, (err) => {
                if (err) {
                    debug('delete error:' + err);
                    return next(err)
                };

                // Success - go to author list
                res.redirect('/catalog/authors')
            })
        }
    });
};

// Display Author update form on GET.
exports.author_update_get = (req, res, next) => {

    Author.findById(req.params.id, (err, author) => {
        if (err) {
            debug('update error:' + err);
            return next(err)
        };

        if (author == null) {
            let err = new Error('Author not found');
            err.status = 404;
            debug('update error:' + err);
            return next(err);
        }

        res.render('author_form', { title: 'Update Author', author });
    });
};

// Handle Author update on POST.
exports.author_update_post = [

    // Validate & sanitize fields
    body('first_name').trim()
        .isLength({ min: 1 }).withMessage('First name must be specified.')
        .isAlphanumeric().withMessage('First name has non-alphanumeric characters')
        .escape(),
    body('family_name').trim()
        .isLength({ min: 1 }).withMessage('Family name must be specified.')
        .isAlphanumeric().withMessage('Family name has non-alphanumeric characters')
        .escape(),
    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601().toDate(),
    body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601().toDate(),

    // Process request after validation and sanitization
    (req, res, next) => {

        // Extract form errors
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // Errors are present, render form again with sanitized values & error message(s)
            res.render('author_form', { title: 'Update Author', author: req.body, errors: errors.array() });
            return;
        }
        else {
            // Form data is valid

            // Create Author object with escaped and trimmed data
            let author = new Author({
                first_name: req.body.first_name,
                family_name: req.body.family_name,
                date_of_birth: req.body.date_of_birth,
                date_of_death: req.body.date_of_death,
                _id: req.params.id
            });

            // Update the record
            Author.findByIdAndUpdate(req.params.id, author, { useFindAndModify: false }, (err, theauthor) => {
                if (err) {
                    debug('update error:' + err);
                    return next(err)
                };

                // Successful - redirect to author detail page.
                res.redirect(theauthor.url);
            });
        }
    }
];
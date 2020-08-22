var mongoose = require('mongoose');
var moment = require('moment');

var Schema = mongoose.Schema;

var BookInstanceSchema = Schema({
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    imprint: { type: String, required: true },
    status: { type: String, required: true, enum: ['Available', 'Maintenance', 'Loaned', 'Reserved'], default: 'Maintenance' },
    due_back: { type: Date, default: Date.now }
});

// Virtual for BookInstance's URL
BookInstanceSchema.virtual('url')
    .get(function () {
        return `/catalog/bookinstance/${this._id}`;
    });

// Virtual for formatted BookInstance's due back date
BookInstanceSchema.virtual('due_back_formatted')
    .get(function () {
        return moment(this.due_back).format('MMMM Do, YYYY');
    });

// Virtual for formatted BookInstance's due back date for form input field
BookInstanceSchema.virtual('input_due_back')
    .get(function () {
        return moment(this.due_back).format('YYYY-MM-DD');
    });

// Export model
module.exports = mongoose.model('BookInstance', BookInstanceSchema);
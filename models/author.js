var mongoose = require('mongoose');
var moment = require('moment');

var Schema = mongoose.Schema;

var AuthorSchema = new Schema({
    first_name: { type: String, required: true, maxlength: 100 },
    family_name: { type: String, required: true, maxlength: 100 },
    date_of_birth: { type: Date },
    date_of_death: { type: Date }
});

// Virtual for Author's full name
AuthorSchema.virtual('name')
    .get(function () {
        var full_name = '';

        if (this.first_name && this.family_name)
            full_name = `${this.family_name}, ${this.first_name}`;

        return full_name;
    });

// Virtual for Author's lifespan
AuthorSchema.virtual('lifespan')
    .get(function () {
        let formatted_dob = this.date_of_birth ? moment(this.date_of_birth).format('YYYY/MM/DD') : '';
        let formatted_dod = this.date_of_death ? moment(this.date_of_death).format('YYYY/MM/DD') : null;

        return `${formatted_dob}${formatted_dod ? ` - ${formatted_dod}` : ''}`;
    });

// Virtual for Author's URL
AuthorSchema.virtual('url')
    .get(function () {
        return `/catalog/author/${this._id}`;
    });

// Virtuals for formatted Author's date of birth & date of death (YYYY-MM-DD)
AuthorSchema.virtual('formatted_dob')
    .get(function () {
        return moment(this.date_of_birth).format('YYYY-MM-DD');
    });

AuthorSchema.virtual('formatted_dod')
    .get(function () {
        return moment(this.date_of_death).format('YYYY-MM-DD');
    });

// Export model
module.exports = mongoose.model('Author', AuthorSchema);
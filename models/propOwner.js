const mongoose = require('mongoose');

const validator = require('validator');
const aadhaarvValidator = require('aadhaar-validator');

const propOwnerSchema = mongoose.Schema({
    fname: {
        type: String,
        required: true,
        maxLength: 20
    },
    lname: {
        type: String,
        maxLength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: [validator.isEmail, 'Please enter a valid email.']
    },
    aadhaar: {
        type: String,
        maxLength: 12,
        required: true,
        unique: true,
        validate: [aadhaarvValidator.isValidNumber, 'Please enter a valid aadhaar number.']
    },
    pan: {
        type: String,
        maxLength: 10,
        required: true,
        unique: true
    },
    phone: {
        type: Number,
        maxLength: 10,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

propOwnerSchema.virtual('fullname').get(function () {
    return `${this.fname} ${this.lname}`
}).set(function (fullname) {
    this.fname, this.lname = fullname.split(' ');
});

const PropOwner = mongoose.model('PropOwner', propOwnerSchema);

module.exports = PropOwner;
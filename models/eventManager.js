const mongoose = require('mongoose');

const validator = require('validator');
const aadhaarvValidator = require('aadhaar-validator');

const eventManagerSchema = mongoose.Schema({
    fname: {
        type: String,
        required: true,
        maxLength: 20
    },
    lname: {
        type: String,
        required: true,
        default: "",
        maxLength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: [validator.isEmail, 'Please enter your valid email.']
    },
    aadhaar: {
        type: String,
        maxLength: 12,
        required: true,
        unique: true,
        validate: [aadhaarvValidator.isValidNumber, 'Please enter your valid aadhaar number.']
    },
    phone: {
        type: Number,
        maxLength: 10,
        required: true
    }
});

const EventManager = mongoose.model('EventManager', eventManagerSchema);

module.exports = EventManager;
const mongoose = require('mongoose');

const eventHallSchema = mongoose.Schema({
    size: Number,
    shift: Number,
    pricepershift: Number,
    contact: Number,
    address: String,
    city: String,
    pincode: Number,
    managerid: String
});

const EventHall = mongoose.model('EventHall', eventHallSchema);

module.exports = EventHall;
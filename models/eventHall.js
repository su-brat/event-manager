const mongoose = require('mongoose');

const eventHallSchema = mongoose.Schema({
    size: Number,
    shift: Number,
    pricepershift: Number,
    description: String,
    contact: Number,
    address: String,
    city: String,
    pincode: Number,
    managerid: { type: mongoose.Schema.Types.ObjectId, ref: 'EventManager' }
});

const EventHall = mongoose.model('EventHall', eventHallSchema);

module.exports = EventHall;
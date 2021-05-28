const mongoose = require('mongoose');

const eventHallSchema = mongoose.Schema({
    size: {
        type: Number,
        required: true
    },
    capacity: {
        type: Number,
        required: true
    },
    shift: {
        type: Number,
        required: true
    },
    pricepershift: {
        type: Number,
        required: true
    },
    functiontype: {
        type: Array,
        required: true
    },
    description: String,
    contact: {
        type: Number,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    pincode: {
        type: Number,
        required: true
    },
    managerid: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EventManager',
        required: true
    }
});

const EventHall = mongoose.model('EventHall', eventHallSchema);

module.exports = EventHall;
const mongoose = require('mongoose');

const EventSchema = mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    propId: {
        type: String,
        ref: 'EventProp',
        required: true
    },
    startDateAndTime: {
        type: String,
        required: true
    },
    endDateAndTime: {
        type: String,
        required: true
    },
    approved: {
        type: Boolean,
        default: false
    }
});

EventSchema.virtual('bookHours').get(function() {
    return Math.ceil(((new Date(this.endDateAndTime))-(new Date(this.startDateAndTime)))/(1000*60*60));
});

const EventDetails = mongoose.model('EventDetails', EventSchema);

module.exports = EventDetails;
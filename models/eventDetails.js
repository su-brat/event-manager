const mongoose = require('mongoose');
// const EventProp = require('./EventProp');

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
    type: {
        type: String,
        required: true
    },
    bookingDate: {
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

// EventSchema.virtual('totalPrice').get(async function() {
//     const prop = await EventProp.findOne({_id: this.propId});
//     if(prop) {
//         const pricePerHour = prop.priceperhour;
//         return (this.bookHours * pricePerHour).toFixed(2);
//     } else {
//         return 0;
//     }
// });

// EventSchema.virtual('advance').get(async function() {
//     return 10*(this.totalPrice/100);
// });

const EventDetails = mongoose.model('EventDetails', EventSchema);

module.exports = EventDetails;

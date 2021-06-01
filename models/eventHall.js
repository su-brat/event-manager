const mongoose = require('mongoose');

const ImageSchema = mongoose.Schema({
    url: String,
    filename: String
});

ImageSchema.virtual('thumbnail').get(function() {
    return this.url.replace('/upload', '/upload/w_200');
});

const LocationSchema = mongoose.Schema({
    longitude: Number,
    latitude: Number,
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
    }
});

LocationSchema.virtual('lngLat').get(function() {
    return [this.longitude, this.latitude];
})

const eventHallSchema = mongoose.Schema({
    name: String,
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
    functiontype: Array,
    description: String,
    images: [ImageSchema],
    contact: {
        type: Number,
        required: true
    },
    location: LocationSchema,
    managerid: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EventManager',
        required: true
    }
});

const EventHall = mongoose.model('EventHall', eventHallSchema);

module.exports = EventHall;
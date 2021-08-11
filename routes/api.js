const express = require("express");
const router = express.Router();
const cors = require("cors");

const PropOwner = require('../models/propOwner');
const EventProp = require('../models/eventProp');
const EventDetails = require('../models/eventDetails');

const { inRange, sortByRange } = require('../services/filterByDist');

router.use(cors());

router.get('/owners/:id', async (req, res) => {
    const { id } = req.params;
    const data = await PropOwner.findOne({ _id: id });
    res.json({
        name: data.fullname,
        email: data.email
    });
});

router.get('/props/:id', async (req, res) => {
    const { id } = req.params;
    const data = await EventProp.findOne({ _id: id });
    res.json(data);
});

// GET '/props?lat=30&lng=70&dist=20' or '/props?city=Bhubaneshwar' or '/props?pincode=750835'
router.get('/props', async (req, res) => {
    const { lat, lng, dist, city, state, pincode } = req.query;
    let props = null;
    if(state) {
        props = await EventProp.find({'location.state': state.toUpperCase()});
    } if(city) {
        props = await EventProp.find({'location.city': city.toUpperCase()});
    } if(pincode) {
        props = await EventProp.find({'location.pincode': pincode});
    } if(lat && lng) {
        props = (await EventProp.find({})).filter(prop => inRange(lat, lng, prop.location.latitude, prop.location.longitude, dist));
        sortByRange(lat, lng, props);
    }
    res.json({ props });
});

router.get('/event-bookings', async (req, res) => {
    const { propId, fromDate, toDate } = req.query;
    if(propId && fromDate && toDate) {
        try {
            const bookings = await EventDetails.find({propId: propId, endDateAndTime: {$gte: new Date(fromDate), $lte: new Date(toDate)}});
            return res.json({ bookings: bookings.sort((a, b) => a.startDateAndTime>b.startDateAndTime ? 1 :
                (a.startDateAndTime<b.startDateAndTime ? -1 :
                    (a.endDateAndTime>b.endDateAndTime ? 1 :
                        (a.endDateAndTime<b.endDateAndTime ? -1 : 0)))) });
        } catch(err) {
            return res.json({error: err});
        }
    }
});

router.post('/request-booking', async (req, res) => {
    const { userId: userId, propId: propId, startDateAndTime, endDateAndTime } = req.body;
    try {
        const prop = await EventProp.findOne({ _id: propId });
        if(!prop)
            throw new Error('Property not found.');

        // authenticate user using userId

        const eventBooking = new EventDetails({
            userId,
            propId,
            startDateAndTime: (new Date(startDateAndTime)),
            endDateAndTime: (new Date(endDateAndTime))
        });
        await eventBooking.save();
        res.json({ message: 'success' });
    } catch(err) {
        res.json({ message: 'failed', error : err.message });
    }
});

module.exports = router;
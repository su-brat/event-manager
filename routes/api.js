const express = require("express");
const router = express.Router();
const cors = require("cors");

const {checkUser} = require("../middlewares/checkLocalUser");

const PropOwner = require('../models/propOwner');
const EventProp = require('../models/eventProp');
const EventDetails = require('../models/eventDetails');
const Customer = require('../models/customer');

const { inRange, sortByRange } = require('../services/filterByDist');

router.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'OPTIONS', 'HEAD'],
    credentials: true
}));

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
    const { lat, lng, dist, city, state, pincode, available } = req.query;
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
    } if(available) {
        props = props.filter(prop => prop.allowBooking===available);
    }
    res.json({ props: props.map(prop => {
        return { ...{...prop}._doc, primaryImage: prop.images.length>0?prop.images[0].thumbnail:'' }
    })});
});

router.get('/event-bookings', async (req, res) => {
    const { propId, fromDate, toDate } = req.query;
    try {
        if(propId && fromDate && toDate) {
            const bookings = await EventDetails.find({propId: propId, endDateAndTime: {$gte: new Date(fromDate), $lte: new Date(toDate)}});
            return res.json({ bookings: bookings.sort((a, b) => a.startDateAndTime>b.startDateAndTime ? 1 :
                (a.startDateAndTime<b.startDateAndTime ? -1 :
                    (a.endDateAndTime>b.endDateAndTime ? 1 :
                        (a.endDateAndTime<b.endDateAndTime ? -1 : 0)))) });
        } else {
            throw new Error('Invalid request');
        }
    } catch(err) {
        return res.json({error: err});
    }
});

module.exports = router;
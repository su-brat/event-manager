const express = require("express");
const router = express.Router();

const {checkUser} = require("../middlewares/checkLocalUser");

const PropOwner = require('../models/propOwner');
const EventProp = require('../models/eventProp');
const EventDetails = require('../models/eventDetails');
const Customer = require('../models/customer');

const { inRange, sortByRange } = require('../services/filterByDist');


const {mongoose} = require('../services/dbInitClose');
const Grid = require('gridfs-stream');

let gfs;

mongoose.connection.once('open', function () {
    gfs = Grid(mongoose.connection.db, mongoose.mongo);
    gfs.collection('uploads');
});

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
        return { ...{...prop}._doc, primaryImage: prop.images.length>0?prop.images[0].url:'' };
    })});
});

router.get('/image/props/:filename', async (req, res) => {
    try {
        const file = await gfs.files.findOne({filename: req.params.filename});
        const readstream = await gfs.createReadStream(file.filename);
        readstream.pipe(res);
    } catch (err) {
        res.status(404).json({ err: err });
    }
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
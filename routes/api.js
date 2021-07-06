const express = require("express");
const router = express.Router();

const PropOwner = require('../models/propOwner');
const EventProp = require('../models/eventProp');

const { inRange, sortByRange } = require('../services/filterByDist');

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

router.get('/props', async (req, res) => {
    const { pincode, lat, lng } = req.query
    let props = null;
    if(pincode && lat && lng) {
        const nearPin = pincode - pincode%1000
        props = (await EventProp.find({ "location.pincode": { $gte: nearPin, $lt: nearPin+1000 } })).filter(prop => inRange(lat, lng, prop.location.latitude, prop.location.longitude));
        sortByRange(lat, lng, props);
    }
    res.json({ props });
})

module.exports = router;
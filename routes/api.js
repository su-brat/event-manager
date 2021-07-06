const express = require("express");
const router = express.Router();

const PropOwner = require('../models/propOwner');
const EventProp = require('../models/eventProp');

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

module.exports = router;
const mongoose = require('mongoose');
const EventManager = require('./models/eventManager');

//to connect to MongoDB and use database "test"
mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB.');
    })
    .catch((err) => {
        console.log('Error connecting: ', err);
    });

// let manager = new EventManager({ fname: 'Ram', lname: 'Jethmalani', email: 'ramj@ymail.com', aadhaar: '533692738264', phone: 9876543210 });

// manager.save().then(() => {
//     console.log('Saved to database');
// });

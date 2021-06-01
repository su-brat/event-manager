const mongoose = require('mongoose');

//to connect to MongoDB and use database "test"
const connect = async (database) => {
    await mongoose.connect(`mongodb://localhost:27017/${database}`, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })
        .then(() => {
            console.log('Connected to database');
        })
        .catch((err) => {
            console.log('Error connecting to database: ', err.message);
        });
}

module.exports = {
    connect: connect,
    close: mongoose.connection.close
}
const mongoose = require('mongoose');

//to connect to MongoDB and use database "test"
const connect = async (database) => {
    await mongoose.connect(`mongodb://localhost:27017/${database}`, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => {
            console.log('Connected to database');
        })
        .catch((err) => {
            console.log('Error connecting to database: ', err);
        });
}

const drop = async (model) => {
    await model.deleteMany({})
        .then(() => console.log('Dropped collection'))
        .catch((err) => console.log('Error dropping from database: ', err));
}

const save = async (tuple) => {
    await tuple.save()
        .then(() => console.log('Saved'))
        .catch((err) => console.log('Error saving to database: ', err));
}

const close = async () => {
    await mongoose.connection.close()
        .then(() => console.log('Database connection closed'))
        .catch((err) => console.log('Error closing database: ', err));
}

module.exports = {
    connect: connect,
    drop: drop,
    save: save,
    close: close
}
const MongoStore = require('connect-mongo');

const weekinmillis = (weeks = 1) => 1000 * 60 * 60 * 24 * 7 * weeks;

const sessionConfig = {
    name: 'user-session',
    secret: process.env.SESSION_SECRET,
    secure: process.env.NODE_ENV === 'PRODUCTION',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DB_PATH }),
    cookie: {
        expires: Date.now() + weekinmillis(),
        maxAge: weekinmillis()
    }
}

module.exports = sessionConfig;
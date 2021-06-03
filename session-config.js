const weekinmillis = (weeks = 1) => 1000 * 60 * 60 * 24 * 7 * weeks;

const sessionConfig = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + weekinmillis(),
        maxAge: weekinmillis()
    }
}

module.exports = sessionConfig;
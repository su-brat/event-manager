const weekinmillis = (weeks = 1) => 1000 * 60 * 60 * 24 * 7 * weeks;

const sessionConfig = {
    name: 'user-session',
    secret: process.env.SESSION_SECRET,
    //secure: true,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + weekinmillis(),
        maxAge: weekinmillis()
    }
}

module.exports = sessionConfig;
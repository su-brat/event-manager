const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const flash = require('connect-flash');
const methodOverride = require('method-override');

const db = require('./dbhandler');

db.connect('eventData');

const EventManager = require('./models/eventManager');
const EventHall = require('./models/eventHall');
const BankAccount = require('./models/bankAccount');

const weekinmillis = (weeks = 1) => 1000 * 60 * 60 * 24 * 7 * weeks;

const sessionConfig = {
    secret: 'Thisisasecretkey',
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + weekinmillis(),
        maxAge: weekinmillis()
    }
}

const hashedpwd = async (pwd) => await bcrypt.hash(pwd, 12);

const authenticate = async (user, pwd) => await bcrypt.compare(pwd, user.password);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

//to access the public folder from anywhere directly
app.use(express.static(path.join(__dirname, 'public')));

//to get POST data
app.use(express.urlencoded({ extended: true }));

//to parse and fetch json data
app.use(express.json());

//to override POST request for DELETE, PUT, PATCH etc.
app.use(methodOverride('_method'));

app.use(session(sessionConfig));

app.use(flash());

app.use(async (req, res, next) => {
    req.requestTime = Date.now();
    console.log(`\nRequest timestamp: ${new Date(req.requestTime)}`);
    try {
        res.locals.user = await EventManager.findOne({ _id: req.session.userId });
    } catch (err) {
        console.log(err);
    }
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.halltypes = ['B\'day', 'Marriage', 'Thread Ceremony'];
    next();
})

//to connect and listen to port 3000
app.listen(3000, () => {
    console.log('Listening to port 3000...');
});

app.get('/', async (req, res) => {
    if (res.locals.user)
        res.redirect('/dashboard');
    else
        res.render('index');
});

app.get('/register', (req, res) => {
    if (res.locals.user)
        res.redirect('/logout');
    else
        res.render('register');
});

app.post('/register', async (req, res) => {

    //Code to register and verify.
    if (req.body.password == req.body.password_repeat) {
        try {
            let hpwd = await hashedpwd(req.body.password);
            user = new EventManager({
                fname: req.body.first_name,
                lname: req.body.last_name,
                email: req.body.email,
                phone: req.body.phone,
                aadhaar: req.body.aadhaar,
                pan: req.body.pan,
                password: hpwd
            })
            await db.save(user);
            req.session.userId = user._id;
            req.flash('success', 'Successfully registered.');
            res.redirect('/dashboard');
        } catch (err) {
            req.session.destroy();
            console.log(err);
            req.flash('error', err.message);
            res.redirect('/register');
        }
    }
})

app.get('/login', (req, res) => {
    if (res.locals.user)
        res.redirect('/logout');
    else
        res.render('login');
});

app.post('/login', async (req, res) => {

    //Code to authenticate and log in.
    try {
        let pwd = req.body.password;
        user = await EventManager.findOne({ email: req.body.email });
        if (user) {
            let verified = await authenticate(user, pwd);
            if (!verified)
                throw new Error('Invalid username or password.');
            else {
                req.session.userId = user._id;
                req.flash('success', 'Welcome back.');
                res.redirect('/dashboard');
            }
        }
        else
            throw new Error('Invalid username or password.');
    } catch (err) {
        console.log(err);
        req.flash('error', err.message);
        res.redirect('/login');
    }
});

app.get('/dashboard', (req, res) => {
    if (res.locals.user)
        res.render('dashboard');
    else
        res.redirect('/');
});

app.get('/profile', async (req, res) => {
    if (res.locals.user) {
        try {
            let hall = await EventHall.findOne({ managerid: res.locals.user._id })
            let account = await BankAccount.findOne({ managerid: res.locals.user._id })
            res.render('profile', { hall, account });
        }
        catch (err) {
            console.log(err);
            res.redirect('/');
        }
    }
    else
        res.redirect('/');
});

app.post('/profile', async (req, res) => {
    let update = null;
    try {
        switch (req.query.form) {
            case '1':
                update = await EventManager.findOneAndUpdate({ _id: res.locals.user._id }, {
                    fname: req.body.first_name,
                    lname: req.body.last_name,
                    email: req.body.email,
                    aadhaar: req.body.aadhaar_num,
                    pan: req.body.pan_num,
                    phone: req.body.phone
                }, { new: true, runValidators: true });
                break;
            case '2':
                const ftype = res.locals.halltypes.filter(type => req.body[type]);
                update = await EventHall.findOneAndUpdate({ managerid: res.locals.user._id }, {
                    managerid: res.locals.user._id,
                    address: req.body.address,
                    city: req.body.city,
                    pincode: req.body.pincode,
                    contact: req.body.contact,
                    size: req.body.size,
                    capacity: req.body.capacity,
                    shift: req.body.shifts,
                    pricepershift: req.body.costpershift,
                    functiontype: ftype,
                    description: req.body.desc
                }, { upsert: true, new: true, runValidators: true });
                break;
            case '3':
                update = await BankAccount.findOneAndUpdate({ managerid: res.locals.user._id }, {
                    managerid: res.locals.user._id,
                    name: req.body.acholdername,
                    accno: req.body.acnum,
                    ifsc: req.body.ifsc
                }, { upsert: true, new: true, runValidators: true });
                break;
            default:
                update = null;
        }
        req.flash('success', 'Updated successfully.')
    } catch (err) {
        console.log(err);
        req.flash('error', err);
    }
    res.redirect('/profile');
});

app.get('/bookings', (req, res) => {
    if (res.locals.user)
        res.render('bookings');
    else
        res.redirect('/');
});

app.post('/logout', (req, res) => {

    //Code to log the user out.
    if (req.session.userId)
        req.session.destroy();
    res.redirect('/');
});

app.post('/deleteAccount', async (req, res) => {
    try {
        if (req.session.userId) {
            const userId = req.session.userId;
            console.log('Deleting account...');
            let user = await EventManager.findOne({ _id: userId });
            await EventManager.deleteOne({ _id: userId });
            await EventHall.deleteMany({ managerid: userId });
            await BankAccount.deleteMany({ managerid: userId });
            req.session.destroy();
            console.log('Account deleted');
        }
        res.redirect('/');
    } catch (err) {
        console.log(err);
        req.flash('error', err.message);
        res.redirect('/profile');
    }
})


/*

async function operateOnDB() {
    await db.connect('eventBusiness');

    let manager = new EventManager({ fname: 'Ram', lname: 'Jethmalani', email: 'ramj@ymail.com', aadhaar: '548648389383', phone: 9876543210 });
    await db.save(manager);

    await db.drop(EventManager);

    db.close();
}

operateOnDB();


app.get('/search', (req, res) => {
    if (req.query.id && req.query.name) {
        res.send('You are logged in')
    }
    else {
        res.send('Permission denied')
    }
});

app.get('/r/:subroute', (req, res) => {
    res.send(`Welcome to ${req.params.subroute}!`);
});
*/

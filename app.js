const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const flash = require('connect-flash');

if (process.env.NODE_ENV!=='PRODUCTION')
    require('dotenv').config();

const { storage, cloudinary } = require('./cloudinaryconfig');
const multer = require('multer');
const upload = multer({ storage: storage });

const methodOverride = require('method-override');

const db = require('./dbhandler');

db.connect('eventData');

const EventManager = require('./models/eventManager');
const EventHall = require('./models/eventHall');
const BankAccount = require('./models/bankAccount');

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

checkUser = (req, res, next) => {
    if (res.locals.user)
        next();
    else
        res.redirect('/');
}

app.get('/', async (req, res) => {
    if (res.locals.user)
        res.redirect('/dashboard');
    else
        res.render('index');
});

app.get('/register', (req, res) => {
    if (res.locals.user)
        req.session.destroy();
    else
        res.render('register');
});

app.post('/register', async (req, res) => {
    if (req.body.password == req.body.password_repeat) {
        try {
            const pwdigest = await hashedpwd(req.body.password);
            user = new EventManager({
                fname: req.body.first_name,
                lname: req.body.last_name,
                email: req.body.email,
                phone: req.body.phone,
                aadhaar: req.body.aadhaar,
                pan: req.body.pan,
                password: pwdigest
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
        req.session.destroy();
    else
        res.render('login');
});

app.post('/login', async (req, res) => {
    try {
        const pwd = req.body.password;
        user = await EventManager.findOne({ email: req.body.email });
        if (user) {
            const verified = await authenticate(user, pwd);
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

app.get('/dashboard', checkUser, (req, res) => {
    res.render('dashboard');
});

app.get('/profile', checkUser, async (req, res) => {
    try {
        const hall = await EventHall.findOne({ managerid: res.locals.user._id })
        const account = await BankAccount.findOne({ managerid: res.locals.user._id })
        res.render('profile', { hall, account });
    }
    catch (err) {
        console.log(err);
        req.session.destroy();
        res.redirect('/');
    }
});

app.post('/profile', checkUser, upload.array('images'), async (req, res) => {
    try {
        switch (req.query.form) {
            case '1':
                await EventManager.findOneAndUpdate({ _id: res.locals.user._id }, {
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
                const newimages = req.files.map(file => ({ url: file.path, filename: file.filename }));
                const update = await EventHall.findOneAndUpdate({ managerid: res.locals.user._id }, {
                    managerid: res.locals.user._id,
                    name: req.body.hallname,
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
                const deleteImages = [];
                for (let image of update.images) {
                    if (req.body[image.filename]) {
                        await cloudinary.uploader.destroy(image.filename);
                        deleteImages.push(image.filename);
                    }
                }
                const oldimages = update.images.filter((image) => !deleteImages.includes(image.filename));
                update.images = [...oldimages||[], ...newimages||[]];
                await update.save();
                break;
            case '3':
                await BankAccount.findOneAndUpdate({ managerid: res.locals.user._id }, {
                    managerid: res.locals.user._id,
                    name: req.body.acholdername,
                    accno: req.body.acnum,
                    ifsc: req.body.ifsc
                }, { upsert: true, new: true, runValidators: true });
                break;
        }
        req.flash('success', 'Updated successfully.')
    } catch (err) {
        console.log(err);
        req.flash('error', err);
    }
    res.redirect('/profile');
});

app.get('/bookings', checkUser, (req, res) => {
    res.render('bookings');
});

app.post('/logout', (req, res) => {
    if (req.session.userId)
        req.session.destroy();
    res.redirect('/');
});

app.post('/deleteAccount', checkUser, async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await EventManager.findOne({ _id: userId });
        const halls = await EventHall.find({ managerid: userId });
        const verified = await authenticate(user, req.body.pwd);
        if (verified) {
            console.log('Deleting account...');
            for (let hall of halls) {
                for (image of hall.images)
                    await cloudinary.uploader.destroy(image.filename);
            }
            await EventManager.deleteOne({ _id: userId });
            await EventHall.deleteMany({ managerid: userId });
            await BankAccount.deleteMany({ managerid: userId });
            req.session.destroy();
            console.log('Account deleted');
            res.redirect('/');
        }
        else
            throw new Error('Failed to delete account. Could not authenticate user.');
    } catch (err) {
        console.log(err);
        req.flash('error', err.message);
        res.redirect('/profile');
    }
})

//to connect and listen to port 3000
app.listen(3000, () => {
    console.log('Listening to port 3000...');
});

/*

app.get('/r/:subroute', (req, res) => {
    res.send(`Welcome to ${req.params.subroute}!`);
});

*/

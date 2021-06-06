const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const flash = require('connect-flash');

const { body, validationResult } = require('express-validator');

const mongoSanitize = require('express-mongo-sanitize');

if (process.env.NODE_ENV!=='PRODUCTION')
    require('dotenv').config();

const { storage, cloudinary } = require('./cloudinary-config');
const multer = require('multer');
const upload = multer({ storage: storage });

const methodOverride = require('method-override');

const db = require('./db-handler');

db.connect('eventData');

const EventManager = require('./models/eventManager');
const EventHall = require('./models/eventHall');
const BankAccount = require('./models/bankAccount');

const sessionConfig = require('./session-config');

const validateOTP = (req, res, next) => {
    // Code to validate OTP

    next();
}

const hashedpwd = async (pwd) => await bcrypt.hash(pwd, 12);

const authenticate = async (user, pwd) => await bcrypt.compare(pwd, user.password);

const checkUser = (req, res, next) => {
    if (res.locals.user)
        next();
    else
        res.redirect('/');
}

// Throws error if input validation fails
const checkInputValidation = req => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new Error('Missing/Invalid input field(s).');
    }
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

//to access the public folder from anywhere directly
app.use(express.static(path.join(__dirname, 'public')));

//to get POST data
app.use(express.urlencoded({ extended: true }));

//to parse and fetch json data
app.use(express.json());

//remove or sanitize $ or . to prevent noSQL injection
app.use(mongoSanitize());

//report on console if anything is sanitized
app.use(
  mongoSanitize({
    onSanitize: ({ req, key }) => {
      console.warn(`This request[${key}] is sanitized`, req);
    },
  }),
);

//to override POST request for DELETE, PUT, PATCH etc.
app.use(methodOverride('_method'));

app.use(session(sessionConfig));

app.use(flash());

app.use(async (req, res, next) => {
    req.requestTime = Date.now();
    console.log(`\nRequest timestamp: ${new Date(req.requestTime)}`);
    console.log(`Requested page: ${req.originalUrl}`);
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

app.post('/register', 
        body('first_name').isString().trim().escape(), 
        body('last_name').isString().trim().escape(), 
        body('password').isLength({ min: 6 }).escape(),
        body('password_repeat').isLength({ min: 6 }).escape(),
        body('email').isEmail(),
        body('phone').isMobilePhone(),
        body('aadhaar').isNumeric(),
        body('pan').isAlphanumeric(),
        validateOTP, 
        async (req, res) => {
            try {
                if (req.body.password == req.body.password_repeat) {
                    checkInputValidation(req);
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
                    await user.save();
                    req.session.userId = user._id;
                    req.flash('success', 'Successfully registered.');
                    res.redirect('/dashboard');
                } else
                    throw new Error('Password and repeat password do not match.');
            } catch (err) {
                console.log(err);
                req.flash('error', err.message);
                res.redirect('/register');
            }
        })

app.get('/login', (req, res) => {
    if (res.locals.user)
        req.session.destroy();
    else
        res.render('login');
});

app.post('/login',
        body('email').isEmail(),
        body('password').isLength({ min: 6 }).escape(),
        async (req, res) => {
            try {
                checkInputValidation(req)
                const pwd = req.body.password;
                user = await EventManager.findOne({ email: req.body.email });
                if (user) {
                    const verified = await authenticate(user, pwd);
                    if (!verified)
                        throw new Error('Missing/Invalid username or password.');
                    else {
                        req.session.userId = user._id;
                        req.flash('success', 'Welcome back.');
                        res.redirect('/dashboard');
                    }
                }
                else
                    throw new Error('Missing/Invalid username or password.');
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

app.post('/profile/manager',
        checkUser,
        body('first_name').isString().trim().escape().notEmpty(),
        body('last_name').isString().trim().escape(),
        body('email').isEmail().notEmpty(),
        body('aadhaar_num').isNumeric().notEmpty(),
        body('pan_num').isAlphanumeric().notEmpty(),
        body('phone').isMobilePhone().notEmpty(),
        async (req, res) => {
            try {
                checkInputValidation(req);
                await EventManager.findOneAndUpdate({ _id: res.locals.user._id }, {
                    fname: req.body.first_name,
                    lname: req.body.last_name,
                    email: req.body.email,
                    aadhaar: req.body.aadhaar_num,
                    pan: req.body.pan_num,
                    phone: req.body.phone
                }, { new: true, runValidators: true });
                
                req.flash('success', 'Updated successfully.')
            } catch (err) {
                console.log(err);
                req.flash('error', err.message);
            }
            res.redirect('/profile');
        });

app.post('/profile/hall',
        checkUser,
        upload.array('images'),
        body('hallname').isString().trim().escape(),
        body('longitude').isNumeric(),
        body('latitude').isNumeric(),
        body('address').isString().trim().escape().notEmpty(),
        body('city').isString().trim().escape().notEmpty(),
        body('pincode').isNumeric().notEmpty(),
        body('contact').isMobilePhone().notEmpty(),
        body('size').isNumeric().notEmpty(),
        body('capacity').isNumeric().notEmpty(),
        body('shifts').isNumeric().notEmpty(),
        body('costpershift').isNumeric().notEmpty(),
        body('desc').isString().trim().escape(),
        async (req, res) => {
            const newimages = req.files.map(file => ({ url: file.path, filename: file.filename }));
            try {
                checkInputValidation(req);

                const ftype = res.locals.halltypes.filter(type => req.body[type]);
                
                const update = await EventHall.findOneAndUpdate({ managerid: res.locals.user._id }, {
                    managerid: res.locals.user._id,
                    name: req.body.hallname,
                    location: { longitude: req.body.longitude, latitude: req.body.latitude, address: req.body.address, city: req.body.city, pincode: req.body.pincode },
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
                if (update.images.length>5) {
                    const removeImages = update.images.slice(5).map(image => image.filename);
                    update.images = update.images.slice(0, 5);
                    for (let imagename of removeImages)
                        await cloudinary.uploader.destroy(imagename);
                }
                await update.save();
                req.flash('success', 'Updated successfully.')
            } catch (err) {
                for (let image of newimages) {
                    await cloudinary.uploader.destroy(image.filename);
                }
                console.log(err);
                req.flash('error', err.message);
            }
            res.redirect('/profile');
        });

app.post('/profile/bankaccount', 
        checkUser, 
        body('acholdername').isString().trim().escape().notEmpty(),
        body('acnum').isNumeric().notEmpty(),
        body('ifsc').isAlphanumeric().notEmpty(),
        async (req, res) => {
            try {
                checkInputValidation(req);
                await BankAccount.findOneAndUpdate({ managerid: res.locals.user._id }, {
                    managerid: res.locals.user._id,
                    name: req.body.acholdername,
                    accno: req.body.acnum,
                    ifsc: req.body.ifsc
                }, { upsert: true, new: true, runValidators: true });
                req.flash('success', 'Updated successfully.');
            } catch (err) {
                console.log(err);
                req.flash('error', err.message);
            }
            res.redirect('/profile');
        });

app.get('/bookings', checkUser, (req, res) => {
    res.render('bookings');
});

app.post('/logout', checkUser, (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/account', checkUser, (req, res) => {
    res.render('account');
});

app.post('/account',
        checkUser,
        body('password').isLength({ min: 6 }).escape(),
        body('newpassword').isLength({ min: 6 }).escape(),
        body('passwordrepeat').isLength({ min: 6 }).escape(),
        async (req, res) => {
            try {
                if (req.body.newpassword==req.body.passwordrepeat) {
                    checkInputValidation(req);
                    const user = res.locals.user;
                    const pwd = req.body.password;
                    const verified = await authenticate(user, pwd);
                    if (verified) {
                        const newpwdigest = await hashedpwd(req.body.newpassword);
                        await EventManager.findOneAndUpdate({ _id: user._id }, { password: newpwdigest }, { new: true, runValidators: true });
                        req.flash('success', 'Password updated.');
                    }
                    else
                        throw new Error('Unable to authenticate.');
                }
                else
                    throw new Error('New and repeat passwords do not match.');
            } catch(err) {
                console.log(err);
                req.flash('error', err.message);
            }
            res.redirect('/account');
        })

app.post('/account/delete', checkUser, body('pwd').isLength({ min: 6 }).escape(), async (req, res) => {
    try {
        checkInputValidation(req);
        const userId = res.locals.user._id;
        const user = await EventManager.findOne({ _id: userId });
        const halls = await EventHall.find({ managerid: userId });
        const verified = await authenticate(user, req.body.pwd);
        if (verified) {
            console.log('Deleting account...');
            for (let hall of halls) {
                for (let image of hall.images)
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
        res.redirect('/account');
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

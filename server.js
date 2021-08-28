const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const { hashedpwd, authenticate } = require('./services/pwdServices');
const flash = require('connect-flash');
const helmet = require('helmet');

const customerRoutes = require('./routes/customer');
const apiRoutes = require('./routes/api');

const mongoSanitize = require('express-mongo-sanitize');

const config = require('./config/envConf')
config()

const { storage, cloudinary } = require('./config/cloudinaryConf');
const multer = require('multer');
const upload = multer({ storage: storage });

const sessionConfig = require('./config/sessionConf');

const db = require('./services/dbInitClose');

db.connect();

const methodOverride = require('method-override');

const PropOwner = require('./models/propOwner');
const EventProp = require('./models/eventProp');
const EventDetails = require('./models/eventDetails');
const BankAccount = require('./models/bankAccount');
const Customer = require('./models/customer');

const { sendOTP, resendOTP, authOTP } = require('./services/otpService');

const validateOTP = (req, res, next) => {
    // Code to validate OTP
    
    next();
}

const {checkOwner} = require('./middlewares/checkLocalUser')

const reqInfo = require('./middlewares/debugMsg')

// Throws error if input validation fails
const { registerFormValidation, loginFormValidation, ownerProfileFormValidation, propertyFormValidation, bankAccountFormValidation, accountFormValidation } = require('./services/inputValidation');
const inputValidationResult = require('./middlewares/valResult');

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

app.use(helmet());

const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://api.tiles.mapbox.com/",
    "https://api.mapbox.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net",
    "http://gc.kis.v2.scr.kaspersky-labs.com/"
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://api.mapbox.com/",
    "https://api.tiles.mapbox.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
    "http://gc.kis.v2.scr.kaspersky-labs.com/"
];
const connectSrcUrls = [
    "https://api.mapbox.com/",
    "https://a.tiles.mapbox.com/",
    "https://b.tiles.mapbox.com/",
    "https://events.mapbox.com/",
    "http://gc.kis.v2.scr.kaspersky-labs.com/"
];
const fontSrcUrls = [
    "https://fonts.gstatic.com/"
];

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com/cloud24x7/", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT! 
                "https://images.unsplash.com/",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);

//to override POST request for DELETE, PUT, PATCH etc.
app.use(methodOverride('_method'));

app.use(session(sessionConfig));

app.use(flash());

app.use(reqInfo)

app.use(async (req, res, next) => {
    console.log('session: ', req.session);
    try {
        if (req.session && req.session.role === 'owner') {
            res.locals.user = await PropOwner.findOne({ _id: req.session.userId });
            res.locals.user.role = 'owner';
        } else if (req.session && req.session.role === 'customer') {
            res.locals.user = await Customer.findOne({ _id: req.session.userId });
            res.locals.user.role = 'customer';
        }
    } catch (err) {
        console.log(err);
    }
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.proptypes = ['B\'day', 'Engagement', 'Wedding', 'Thread Ceremony', 'Puja Function', 'Get-together', 'Party'];
    next();
})

app.use('/api', apiRoutes);

app.use('/customer', customerRoutes);

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

app.put('/register', 
        registerFormValidation,
        inputValidationResult,
        validateOTP,
        async (req, res) => {
            try {
                if (req.body.password == req.body.password_repeat) {
                    const pwdigest = await hashedpwd(req.body.password);
                    user = new PropOwner({
                        fname: req.body.first_name.toUpperCase(),
                        lname: req.body.last_name.toUpperCase(),
                        email: req.body.email.toLowerCase(),
                        phone: req.body.phone,
                        aadhaar: req.body.aadhaar,
                        pan: req.body.pan.toUpperCase(),
                        password: pwdigest
                    })
                    await user.save();
                    req.session.userId = user._id;
                    req.session.role = 'owner';
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
        loginFormValidation,
        inputValidationResult,
        async (req, res) => {
            try {
                const pwd = req.body.password;
                user = await PropOwner.findOne({ email: req.body.email.toLowerCase() });
                if (user) {
                    const verified = await authenticate(user, pwd);
                    if (!verified)
                        throw new Error('Missing/Invalid username or password.');
                    else {
                        req.session.userId = user._id;
                        req.session.role = 'owner';
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

app.use(checkOwner);

app.get('/dashboard', async (req, res) => {
    try {
        const prop = await EventProp.findOne({ ownerid: req.session.userId });
        const events = await EventDetails.find({ propId: prop._id });
        let upcomingEvents = events.filter(e => new Date(e.startDateAndTime) >= Date.now()).sort((a, b) => new Date(a.startDateAndTime) - new Date(b.startDateAndTime));
        upcomingEvents = await Promise.all(upcomingEvents.map(async e => {
            const customer = await Customer.findOne({ _id: e.userId });
            return { ...e._doc, 
                customerName: customer.name, 
                customerEmail: customer.email, 
                customerPhone: customer.phone 
            };
        }));
        res.render('dashboard', {upcomingEvents});
    } catch (err) {
        console.log(err);
        req.flash('error', err.message);
        res.redirect('/login');
    }
});

app.get('/profile', async (req, res) => {
    try {
        const prop = await EventProp.findOne({ ownerid: res.locals.user._id })
        const account = await BankAccount.findOne({ ownerid: res.locals.user._id })
        res.render('profile', { prop, account });
    }
    catch (err) {
        console.log(err);
        req.session.destroy();
        res.redirect('/');
    }
});

app.post('/profile/owner',
        ownerProfileFormValidation,
        inputValidationResult,
        async (req, res) => {
            try {
                await PropOwner.findOneAndUpdate({ _id: res.locals.user._id }, {
                    fname: req.body.first_name.toUpperCase(),
                    lname: req.body.last_name.toUpperCase(),
                    email: req.body.email.toLowerCase(),
                    aadhaar: req.body.aadhaar_num,
                    pan: req.body.pan_num.toUpperCase(),
                    phone: req.body.phone
                }, { new: true, runValidators: true });
                
                req.flash('success', 'Updated successfully.')
            } catch (err) {
                console.log(err);
                req.flash('error', err.message);
            }
            res.redirect('/profile');
        });

app.post('/profile/prop',
        upload.array('images'),
        propertyFormValidation,
        inputValidationResult,
        async (req, res) => {
            console.log(req.body.allowBooking);
            const newimages = req.files.map(file => ({ url: file.path, filename: file.filename }));
            try {
                const ftype = res.locals.proptypes.filter(type => req.body[type]);
                
                const update = await EventProp.findOneAndUpdate({ ownerid: res.locals.user._id }, {
                    ownerid: res.locals.user._id,
                    name: req.body.propname.toUpperCase(),
                    location: { longitude: req.body.longitude, latitude: req.body.latitude, address: req.body.address.toUpperCase(), city: req.body.city.toUpperCase(), state:req.body.state.toUpperCase(), pincode: req.body.pincode },
                    contact: req.body.contact,
                    size: req.body.size,
                    allowBooking: req.body.allowBooking,
                    capacity: req.body.capacity,
                    priceperhour: req.body.costperhour,
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
        bankAccountFormValidation,
        inputValidationResult,
        async (req, res) => {
            try {
                await BankAccount.findOneAndUpdate({ ownerid: res.locals.user._id }, {
                    ownerid: res.locals.user._id,
                    name: req.body.acholdername.toUpperCase(),
                    accno: req.body.acnum,
                    ifsc: req.body.ifsc.toUpperCase()
                }, { upsert: true, new: true, runValidators: true });
                req.flash('success', 'Updated successfully.');
            } catch (err) {
                console.log(err);
                req.flash('error', err.message);
            }
            res.redirect('/profile');
        });

app.get('/bookings', async (req, res) => {
    try {
        const prop = await EventProp.findOne({ ownerid: req.session.userId });
        let events = await EventDetails.find({ propId: prop._id });
        events = await Promise.all(events.map(async e => {
            const customer = await Customer.findOne({ _id: e.userId });
            return { ...e._doc, 
                customerName: customer.name, 
                customerEmail: customer.email, 
                customerPhone: customer.phone,
                totalPayment: prop.priceperhour * e.bookHours,
            };
        }));
        res.render('bookings', { events });
    } catch(err) {
        console.log(err);
        req.flash('error', err.message);
        res.redirect('/');
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/account', (req, res) => {
    res.render('account');
});

app.post('/account',
        accountFormValidation,
        inputValidationResult,
        async (req, res) => {
            try {
                if (req.body.newpassword==req.body.passwordrepeat) {
                    const user = res.locals.user;
                    const pwd = req.body.password;
                    const verified = await authenticate(user, pwd);
                    if (verified) {
                        const newpwdigest = await hashedpwd(req.body.newpassword);
                        await PropOwner.findOneAndUpdate({ _id: user._id }, { password: newpwdigest }, { new: true, runValidators: true });
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

app.delete('/account/delete', async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const user = await PropOwner.findOne({ _id: userId });
        const props = await EventProp.find({ ownerid: userId });
        const verified = await authenticate(user, req.body.pwd);
        if (verified) {
            console.log('Deleting account...');
            for (let prop of props) {
                for (let image of prop.images)
                    await cloudinary.uploader.destroy(image.filename);
            }
            await PropOwner.deleteOne({ _id: userId });
            await EventProp.deleteMany({ ownerid: userId });
            await BankAccount.deleteMany({ ownerid: userId });
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
app.listen(3001, () => {
    console.log('Listening to port 3001...');
});


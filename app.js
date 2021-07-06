const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const { hashedpwd, authenticate } = require('./services/pwdServices');
const flash = require('connect-flash');
const helmet = require('helmet');

const apiRoutes = require('./routes/api')

const mongoSanitize = require('express-mongo-sanitize');

const config = require('./config/envConf')
config()

const { storage, cloudinary } = require('./config/cloudinaryConf');
const multer = require('multer');
const upload = multer({ storage: storage });

const sessionConfig = require('./config/sessionConf');

const db = require('./services/dbInitClose');

db.connect(process.env.DB_PATH);

const methodOverride = require('method-override');

const PropOwner = require('./models/propOwner');
const EventProp = require('./models/eventProp');
const BankAccount = require('./models/bankAccount');

const { sendOTP, resendOTP, authOTP } = require('./services/otpService');

const validateOTP = (req, res, next) => {
    // Code to validate OTP
    
    next();
}

const checkUser = require('./middlewares/checkLocalUser')

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

app.use(helmet({
    contentSecurityPolicy: false    //to enable undefined sources such as mapbox, cloudinary etc.
}));

//to retrieve data using api
app.use('/api', apiRoutes);

//to override POST request for DELETE, PUT, PATCH etc.
app.use(methodOverride('_method'));

app.use(session(sessionConfig));

app.use(flash());

app.use(reqInfo)

app.use(async (req, res, next) => {
    try {
        res.locals.user = await PropOwner.findOne({ _id: req.session.userId });
    } catch (err) {
        console.log(err);
    }
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.proptypes = ['B\'day', 'Engagement', 'Wedding', 'Thread Ceremony', 'Puja Function', 'Get-together', 'Party'];
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

app.put('/register', 
        registerFormValidation,
        inputValidationResult,
        validateOTP,
        async (req, res) => {
            try {
                if (req.body.password == req.body.password_repeat) {
                    const pwdigest = await hashedpwd(req.body.password);
                    user = new PropOwner({
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
        loginFormValidation,
        inputValidationResult,
        async (req, res) => {
            try {
                const pwd = req.body.password;
                user = await PropOwner.findOne({ email: req.body.email });
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
        checkUser,
        ownerProfileFormValidation,
        inputValidationResult,
        async (req, res) => {
            try {
                await PropOwner.findOneAndUpdate({ _id: res.locals.user._id }, {
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

app.post('/profile/prop',
        checkUser,
        upload.array('images'),
        propertyFormValidation,
        inputValidationResult,
        async (req, res) => {
            const newimages = req.files.map(file => ({ url: file.path, filename: file.filename }));
            try {
                const ftype = res.locals.proptypes.filter(type => req.body[type]);
                
                const update = await EventProp.findOneAndUpdate({ ownerid: res.locals.user._id }, {
                    ownerid: res.locals.user._id,
                    name: req.body.propname,
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
        bankAccountFormValidation,
        inputValidationResult,
        async (req, res) => {
            try {
                await BankAccount.findOneAndUpdate({ ownerid: res.locals.user._id }, {
                    ownerid: res.locals.user._id,
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

app.delete('/account/delete', checkUser, async (req, res) => {
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
app.listen(3000, () => {
    console.log('Listening to port 3000...');
});


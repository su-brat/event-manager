const express = require('express');
const app = express();
const path = require('path');
const methodOverride = require('method-override');

const db = require('./dbhandler');

db.connect('eventData');

const EventManager = require('./models/eventManager');
const EventHall = require('./models/eventHall');
const BankAccount = require('./models/bankAccount');

const userId = '60a01dafe17afdf02876309f'; // Assuming a manager with _id = userId
                                           // is inserted into eventmanagers collection
                                           // (Hardcoded for build-time use)

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

//to connect and listen to port 3000
app.listen(3000, () => {
    console.log('Listening to port 3000...');
});

app.get('/', async (req, res) => {
    if (userId) {
        try {
            let user = await EventManager.findOne({ _id: userId })
            if (user)
                res.redirect('/dashboard');
            else {
                userId = null;
                res.render('index');
            }
        }
        catch(err) {
            console.log(err);
            res.render('index');
        }
    }
    else {

        res.render('index');
    }
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {

    //Code to register and verify.

})

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {

    //Code to authenticate and log in.

});

app.get('/dashboard', (req, res) => {
    res.render('dashboard');
});

app.get('/profile', async (req, res) => {
    try {
        let rel1 = await EventManager.findOne({ _id: userId })
        console.log(rel1);
        let rel2 = await EventHall.findOne({ managerid: userId })
        console.log(rel2);
        let rel3 = await BankAccount.findOne({ managerid: userId })
        console.log(rel3);
        res.render('profile', {rel1, rel2, rel3});
    }
    catch(err) {
        console.log(err);
        res.redirect('/');
    }
});

app.post('/profile', async (req, res) => {
    let update;
    try {
        switch (req.query.form) {
            case '1':
                update = await EventManager.findOneAndUpdate({ _id: userId }, {
                    fname: req.body.first_name, 
                    lname: req.body.last_name, 
                    email: req.body.email, 
                    aadhaar: req.body.aadhaar_num,
                    pan: req.body.pan_num,
                    phone: req.body.phone
                }, {new: true, runValidators: true});
                break;
            case '2':
                update = await EventHall.findOneAndUpdate({ managerid: userId }, {
                    managerid: userId, 
                    address: req.body.address,
                    city: req.body.city,
                    pincode: req.body.pincode,
                    contact: req.body.contact
                }, { upsert: true, new: true, runValidators: true });
                break;
            case '3':
                update = await EventHall.findOneAndUpdate({ managerid: userId }, {
                    managerid: userId,
                    size: req.body.size,
                    shift: req.body.shifts,
                    pricepershift: req.body.costpershift,
                    description: req.body.desc
                }, { upsert: true, new: true, runValidators: true });
                break;
            case '4':
                update = await BankAccount.findOneAndUpdate({ managerid: userId }, {
                    managerid: userId, 
                    name: req.body.acholdername,
                    accno: req.body.acnum,
                    ifsc: req.body.ifsc
                }, { upsert: true, new: true, runValidators: true });
                break;
            default:
                update = null;
        }
    } catch(err) {
        update = err;
    }
    console.log(update);
    res.redirect('/profile');
});

app.get('/bookings', (req, res) => {
    res.render('bookings');
});

app.get('/logout', (req, res) => {
    
    //Code to log the user out.

    res.redirect('/');
});


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

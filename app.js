const express = require('express');
const app = express();
const path = require('path');
const methodOverride = require('method-override');

const db = require('./dbhandler');

const EventManager = require('./models/eventManager');
const EventHall = require('./models/eventHall');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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

app.get('/', (req, res) => res.render('index'));

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

app.get('/profile', (req, res) => {
    res.render('profile');
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

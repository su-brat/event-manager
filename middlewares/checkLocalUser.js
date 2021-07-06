function checkUser (req, res, next) {
    if (res.locals.user)
        next();
    else
        res.redirect('/');
}

module.exports = checkUser;
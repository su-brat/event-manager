const { body } = require('express-validator');

const registerFormValidation = [
    body('first_name').isString().trim().escape(), 
    body('last_name').isString().trim().escape(), 
    body('password').isLength({ min: 6 }).escape(),
    body('password_repeat').isLength({ min: 6 }).escape(),
    body('email').isEmail(),
    body('phone').isMobilePhone(),
    body('aadhaar').isNumeric(),
    body('pan').isAlphanumeric()
]

const loginFormValidation = [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }).escape()
]

const ownerProfileFormValidation = [
    body('first_name').isString().trim().escape().notEmpty(),
    body('last_name').isString().trim().escape(),
    body('email').isEmail().notEmpty(),
    body('aadhaar_num').isNumeric().notEmpty(),
    body('pan_num').isAlphanumeric().notEmpty(),
    body('phone').isMobilePhone().notEmpty()
]

const propertyFormValidation = [
    body('propname').isString().trim().escape(),
    body('address').isString().trim().escape().notEmpty(),
    body('city').isString().trim().escape().notEmpty(),
    body('pincode').isNumeric().notEmpty(),
    body('contact').isMobilePhone().notEmpty(),
    body('size').isNumeric().notEmpty(),
    body('capacity').isNumeric().notEmpty(),
    body('costperhour').isNumeric().notEmpty(),
    body('desc').isString().trim().escape()
]

const bankAccountFormValidation = [
    body('acholdername').isString().trim().escape().notEmpty(),
    body('acnum').isNumeric().notEmpty(),
    body('ifsc').isAlphanumeric().notEmpty(),
]

const accountFormValidation = [
    body('password').isLength({ min: 6 }).escape(),
    body('newpassword').isLength({ min: 6 }).escape(),
    body('passwordrepeat').isLength({ min: 6 }).escape(),
]

module.exports = { registerFormValidation, loginFormValidation, ownerProfileFormValidation, propertyFormValidation, bankAccountFormValidation, accountFormValidation }
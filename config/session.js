let oneHour = 1000 * 60 *60
session= 
{
    secret: process.env.SESSION_SECRET,
    cookie: {maxAge: oneHour}
}

module.exports = session
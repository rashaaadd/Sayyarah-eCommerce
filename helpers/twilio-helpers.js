const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const serviceSid = process.env.TWILIO_SERVICE_ID

module.exports = {

    doSms: (userData) => {
        let res = {}
        console.log(`+91${userData.contact}`);
        return new Promise(async (resolve, reject) => {
            await client.verify.services(serviceSid).verifications.create({
                to: `+91${userData.contact}`,
                channel: "sms"
            }).then((res) => {
                console.log(res);
                res.valid = true;
                resolve(res)
            })
        })
    },

    otpVerify: (otpData, userData) => {
        return new Promise(async (resolve, reject) => {
            await client.verify.services(serviceSid).verificationChecks.create({
                to: `+91${userData.contact}`,
                code: otpData.otp
            }).then((response) => {
                console.log("verification success",response);
                resolve(response)
            })
        })
    }
}
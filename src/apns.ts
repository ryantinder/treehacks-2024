import apn from 'node-apn-http2'
import fs from 'fs'
export const sendAPNS = async (myDeviceToken: string, alert: string, name: string, type: string, data: any) => {

    console.log("sending apns", myDeviceToken)
    var options = {
        token: {
            key: fs.readFileSync(`${__dirname}/AuthKey.p8`),
            keyId: process.env.APNS_KEY_ID!,
            teamId: process.env.APNS_TEAM_ID!
        },
        production: false,
        hideExperimentalHttp2Warning: true 
    };

    var apnProvider = new apn.Provider(options);
    let deviceToken = myDeviceToken
    var note = new apn.Notification({'name': name, 'type': type, 'data': data});

    note.expiry = Math.floor(Date.now() / 1000) + 3600
    note.alert = alert;
    note.topic = "com.zhuhaoyu.EstiMate";

    apnProvider.send(note, deviceToken).then(console.log)
}
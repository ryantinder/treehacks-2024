
export const sendAPNS = async (myDeviceToken: string, alert: string, name: string, type: string, data: any) => {

    var apn = require('node-apn-http2');
    console.log("sending apns", myDeviceToken)
    var options = {
        token: {
            key: "/Users/tinder/Documents/hackathons/treehacks/src/AuthKey.p8",
            keyId: "QD4434QX5D",
            teamId: "44BN78992X"
        },
        production: false,
        hideExperimentalHttp2Warning: true 
    };

    var apnProvider = new apn.Provider(options);
    let deviceToken = myDeviceToken
    var note = new apn.Notification();

    note.expiry = Math.floor(Date.now() / 1000) + 3600
    note.alert = alert;
    note.payload = {'name': name, 'type': type, 'data': data};
    note.topic = "com.zhuhaoyu.EstiMate";

    apnProvider.send(note, deviceToken).then( (result) => {
    console.log(result);

});



}
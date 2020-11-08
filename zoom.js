const config = require('./config');
const TelegramBot = require('node-telegram-bot-api');
// replace the value below with the Telegram token you receive from @BotFather
const bottoken = config.bottoken;
// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(bottoken, {
    polling: true
});

const botid = config.botid;
const email = config.email

//https://github.com/yagop/node-telegram-bot-api/issues/637
var opts = {
    reply_markup: {
        inline_keyboard: [
            [{
                text: "Terminate Call",
                callback_data: "13"
            }],
            [{
                text: "Initiate Call",
                callback_data: "18"
            }]
        ]
    }

};

var result = "";
var flag = 0;
const jwt = require('jsonwebtoken');
const opn = require('opn');


//Use the ApiKey and APISecret from config.js
const payload = {
    iss: config.APIKey,
    exp: ((new Date()).getTime() + 5000)
};
const token = jwt.sign(payload, config.APISecret);
const rp = require('request-promise');

async function StartZoomMeeting(bot) {
    const options = {
        method: "POST",
        uri: "https://api.zoom.us/v2/users/" + email + "/meetings",
        body: {
            topic: "test create meeting",
            type: 1,
            settings: {
                host_video: "true",
                participant_video: "true",
                approval_type: 0
            }
        },
        auth: {
            bearer: token
        },
        headers: {
            "User-Agent": "Zoom-api-Jwt-Request",
            "content-type": "application/json"
        },
        json: true //Parse the JSON string in the response
    };

    try {
        const response = await rp(options);
        result = JSON.stringify(response);
        result = JSON.parse(result);
        //console.log(result.start_url);
        //opn(result.start_url);

        var proc = require('child_process').spawn('chromium', [result.start_url]);

        function killBrowser(arg) {
            console.log(`arg=> ${arg}`);
            proc.kill('SIGINT');
        }

        setTimeout(killBrowser, 8000, 'close browser');

        //send bot
        bot.sendMessage(botid, result.join_url, opts);
    } catch (error) {
        console.log("API call failed, reason ", error);
    }
}

bot.on("callback_query", async function(data) {
    const chatId = data.id;
    //console.log(data);
    // Get the callback data specified
    let callback_data = data.data
    //console.log(callback_data)
    if (callback_data === "13") {
        console.log("Terminating call..")

        try {
            var response = await UpdateZoomMeeting(result.id);
            console.log("response");
            console.log(response);

            if (response === "OK") {
                //https://github.com/yagop/node-telegram-bot-api/issues/622
                await bot.answerCallbackQuery(data.id, {
                    text: 'Call terminated'
                });
                flag = 0;
            } else {
                await bot.answerCallbackQuery(data.id, {
                    text: 'Error'
                });
                flag = 0;
            }

        } catch (err) {
            console.log('error: can\'t terminate call');
            await bot.answerCallbackQuery(data.id, {
                text: 'Can\'t terminate call'
            });
            flag = 0;
        }
    }

    if (callback_data === "18") {
        console.log("Initiating call..")

        if (flag === 0) {
            console.log("here you go - initiate call");
            flag = 1;
            StartZoomMeeting(bot);
        } else {
            console.log('error: can\'t initiate call');
            await bot.answerCallbackQuery(data.id, {
                text: 'Can\'t initiate call. Please terminate it first'
            });
        }

    }
});

bot.on('polling_error', error => console.log(error))

async function UpdateZoomMeeting(meetingID) {
    const options = {
        // To update the meeting ID with status 'end'
        method: "PUT",
        uri: "https://api.zoom.us/v2/meetings/" + meetingID + "/status",
        body: {
            "action": "end"
        },
        auth: {
            bearer: token
        },
        //** 

        json: true //Parse the JSON string in the response
    };

    try {
        const response = await rp(options);
        return Promise.resolve("OK");
    } catch (error) {
        return Promise.reject("error");
    }
}


//sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
var BBCMicrobit = require('bbc-microbit')

var BUTTON_VALUE_MAPPER = ['Not Pressed', 'Pressed', 'Long Press'];

// search for a micro:bit, to discover a particular micro:bit use:
// BBCMicrobit.discoverById(id, callback); or BBCMicrobit.discoverByAddress(id, callback);

console.log('Scanning for microbit');
BBCMicrobit.discover(function(microbit) {
    console.log('\tdiscovered microbit: id = %s, address = %s', microbit.id, microbit.address);

    microbit.on('disconnect', function() {
        console.log('\tmicrobit disconnected!');
        process.exit(0);
    });

    microbit.on('buttonAChange', function(value) {
        //console.log('\ton -> button A change: ', BUTTON_VALUE_MAPPER[value]);

        if (BUTTON_VALUE_MAPPER[value] === 'Pressed') {
            if (flag === 0) {
                console.log("here you go");
                flag = 1;
                StartZoomMeeting(bot);
            }
        }
    });

    microbit.on('buttonBChange', function(value) {
        console.log('\ton -> button B change: ', BUTTON_VALUE_MAPPER[value]);
    });

    console.log('connecting to microbit');
    microbit.connectAndSetUp(function() {
        console.log('\tconnected to microbit');

        console.log('subscribing to buttons');
        // to only subscribe to one button use:
        //   microbit.subscribeButtonA();
        // or
        //   microbit.subscribeButtonB();
        microbit.subscribeButtons(function() {
            console.log('\tsubscribed to buttons');
        });
    });
});

# Is it raining?
Is it raining? Is it windy? Is it cold? 

Living in Vancouver, these are the only three things you need to know when leaving your house in the morning. Three simple yes or no questions, so why fuss over complicated weather apps with useless overly-complicated graphs and 7-day forcasts?

At the click of a button, the Is It Raining machine will answer these questions and only these questions. What more could you ask for?

## Description
This was a project I made as a gift for a friend who always wished for a simpler weather app. It is designed to run on a Raspberry Pi connected to a wired speaker. Weather data is retrieved from the Is It Raining server API and weather information is spoken to the user via the Microsoft Speech Synthesis API. Device Configuration can be managed off-device using my private heartbeat uptime monitor, "Mother", which also doubles as a configuration hoster which devices can pull from. Instructions for how to get a raining machine built or running will not be provided as of how gimmicky the device is.

## Behind the scenes
All the code for this project runs in node.js, written in Typescript. The client is designed to run on a Raspberry Pi on Linux. The client listens for a button press on a specified GPIO pin. When pressed, the client queries the Is It Raining Server which queries multiple open-source weather API's and then returns the most accurate information as described below. As we are in Vancouver, slight bias is applied towards assuming it is raining (or in other words, the requirements to be considered "not raining" are far more stringent than the requirements to be considered "raining").

Once Weather data is returned, the client queries the Microsoft Speech Synthesis API and generates a sound file compiling the important results, then the sound file will be played over a connected sound device.

## Payload and Configuration
This file contains the source files for two projects:

### 1: An express webserver
GET requests to the server respond with answers to the only three questions that need to be answered
- Is it cold? 
- Is it raining?
- Is it windy?

#### Server API Requests
The server only accepts GET Requests. The following endpoints are supported:

`{hostname}/<clientID>/location/<query>`

`{hostname}/<clientID>/latlng/<lat>,<lng>`

Failure to provide a known hostname will cause the server to respond with a 401
Failure to provide an endpoint in the above format will cause the server to respond with a `400`
Requesting an endpoint that does not exist will cause the server to respond with a `404`

Valid API requests respond with the following payload:
```js
{
    temperature_c_feel: number, //The 'feels like' degrees in celsius
    temperature_c_real: number, //The real degrees in celsius
    isRaining: boolean,
    wind_kph: number,
    fromCache: boolean //True if the data was returned from the internal cache rather than a weather api
    nextHour: { //Predictions for the weather at the hour mark closest to an hour from the request time
        wind_kph: number,
        isRaining: boolean
    }
}
```

### 2: The "Is It Raining" Machine
An arduino powered box that when prompted, says whether it is cold, raining and or if it is windy.

The cold threshold is configurable by the end user

The dialogue and many operations of the client are fully configurable by Mother.

#### Configuration 
Configuration for the client contains a 3 level fallback system. Layer 1 is Mother, periodically, the client will query Mother for updated configurations. If a configuration or specific setting is not found, the parameter is pulled from the local `config.json` file. If it turns out this file is also corrupted or unavailable, data is instead pulled from the hardcoded property in `SettingsManager.ts`.

##### Mother Playload
```js
{
    "connectivityIP": number, //The IP the client uses to check if it has an internet connection
    "failOnNoFuture": boolean, //Whether requests should be cancelled if no future weather data is returned
    "location": {
        "type": "latlng"|"location", //The type of the value property
        "value": [lat: number, lng: number]|string //Array of [number, number]/[lat,long] or string containing the name, city, etc. of where to lookup
    },
    "coldFeelThreshold_c": number, //If less than (or equal to?) cold threshold, it is considered cold
    "windThreshold_kph": number, //If greater than (or equal to?) wild threshold, it is windy
    "sayFuturePrediction": boolean, //Whether or not to say the future weather forcast
    "dialogue": {
        "fileName": string, //Name of the file to save over, this must be unique to all other dialogue and can be used to override internal dialogue.
        "properties": string[], //List of weather properties this dialogue represents (Cold, Raining, Windy, *, Future, RecentlyAsked). * means anything and is last resort
        "text": string
    }[],
    "internalDialogue": {
        noInternet: string //Text for when there is no internet
        randomError: string //Text for when an unknown error occurs
        unknownWeatherFile: string //Text for when whether that doesn't have a dialogue line occurs
    },
    "dialogueOptions": { //If these values change, all existing audio files will be remade
        "pitch": number, //Pitch of speech (0 is normal)
        "rate": number, //Rate of speech (0 is normal)
        "speaker": string //Name of microsoft speech flavour
        "style": string //Style of speech (specific to speaker)
    },
    "savePreviousAudioFiles": boolean, //Whether to store previously generated audio for future use
    "motherCheckInInterval_ms": number, //How frequently to poll Mother for checkins and file downloads
    "motherDownloadAlsoChecksIn": boolean, //Whether downloading the configuration file also counts as checking in with Mother
    "githubUpdateCheckInterval_ms": number, //How frequently to poll Github for code updates
    "deleteAllDialogueOnBoot": boolean, //Whether or not to purge all dialogue on program boot to solve potential file corruption from failed shutdowns
}
```

##### Sample Payload
```js
{
    "connectivityIP": "208.67.222.222",
    "failOnNoFuture": false,
    "location": {
        "type": "latlng",
        "value": [49.258500,-123.250640]
    },
    "coldFeelThreshold_c": 5,
    "windThreshold_kph": 35,
    "sayFuturePrediction": true,
    "internalDialogue": {
        "noInternet": "Sorry, I can't connect to the internet right now. If you leave me outside for a bit you can probably figure it out the weather yourself.",
        "randomError": "Something went wrong, sorry. You should probably tell someone if this happens frequently.",
        "unknownWeatherFile": "Honestly, I don't know what's happening outside, good luck though!"
    },
    "dialogueOptions": {
        "pitch": 0,
        "rate": 15,
        "speaker": "en-US-JennyNeural",
        "style": "assistant"
    },
    "savePreviousAudioFiles": true,
    "motherCheckInInterval_ms": 30000,
    "motherDownloadAlsoChecksIn": true,
    "githubUpdateCheckInterval_ms": 1800000,
    "deleteAllDialogueOnBoot": true
}
```

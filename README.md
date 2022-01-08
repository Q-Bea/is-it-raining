testing client updater

Made as a christmas gift for Claire.

This file contains the source files for two projects:
### 1: An express webserver
GET requests to the server respond with answers to the only three questions that need to be answered
- Is it cold? 
- Is it raining?
- Is it windy?

### 2: The "Is It Raining" Machine
An arduino powered box that when prompted, says whether it is cold, raining and or if it is windy.

The cold threshold is configurable by the end user

### Server API Requests
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
    wind_kph: number, //
    fromCache: boolean //True if the data was returned from the internal cache rather than pirate weather
    nextHour: { //Predictions for the weather at the hour mark closest to an hour from the request time
        wind_kph: number,
        isRaining: boolean
    }
}
```

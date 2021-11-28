Made as a christmas gift for Claire.

This file contains the source files for two projects:
### 1: An express webserver
GET requests to the server respond with answers to the only three questions that need to be answered ever
- Is it cold? 
- Is it raining?
- Is it windy?

### 2: The "Is It Raining" Machine
An arduino powered box that when prompted, says whether it is cold, raining and or if it is windy.

The cold threshold is configurable by the end user

### Server API Requests
The server only accepts GET Requests. The following endpoints are supported:

`{hostname}/?latLng=<lat>,<long>`

`{hostname}/?location=<query>`

Failure to provide an endpoint satisfying these constraints will cause the server to respond with a `405`

Valid API requests respond with the following payload:
```js
{
    temperature: number, //The degrees in celsius
    isRaining: boolean,
    isWindy: boolean,
    fromCache: boolean //True if the data was returned from the internal cache rather than pirate weather
}
```
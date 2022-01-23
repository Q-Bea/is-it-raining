import Main from ".";
import BaseManager from "./BaseManager";
import express from "express";
import { InvalidWeatherDataReturnedError, NoWeatherDataReturnedError, WeatherData } from "./WeatherManager";

export default class ExpressManager extends BaseManager {
    express
    constructor(Main: Main) {
        super(Main);

        this.express = express();
    }

    logRequest(clientID: string, data?: WeatherData) {
        const existingData = this.Main.DbManager.get(clientID);

        let total = 0

        if (existingData !== undefined && existingData.requestsMade !== undefined) {
            total = existingData.requestsMade + 1;
            this.Main.DbManager.set(clientID, {requestsMade: existingData.requestsMade + 1, lastRequestDate: new Date(Date.now()).toString()}, true)
        } else {
            total = 1;
            this.Main.DbManager.set(clientID, {requestsMade: 1, lastRequestDate: new Date(Date.now()).toString()})
        }

        const totalRequests = this.getTotalRequests()
        if (!data) {
            console.log(`Request Received! -->\n  Client ID: ${clientID}\n  Total requests by this client: ${total}\n  Total of all requests to date: ${totalRequests} (~${Math.round((total/totalRequests)*100)}%)\n------------\n`)
        } else {
            console.log(`  Request Received! -->\n  Client ID: ${clientID}\n  Total requests by this client: ${total}\n  Total of all requests to date: ${totalRequests} (~${Math.round((total/totalRequests)*100)}%)\nData Returned:`)
            console.dir(data);
            console.log("------------\n")
        }
    }

    private getTotalRequests() {
        const dbDump = this.Main.DbManager.getAll();

        if (dbDump !== undefined) {
            let output = 0
            for (const clientID in dbDump) {
                output += dbDump[clientID].requestsMade ?? 0
            }

            return output;
        } else {
            return 0;
        }
    }

    start() {
        this.express.get("/robots.txt", (req, res) => {
            res.sendFile(process.cwd() + "/assets/robots.txt");
        })

        this.express.get("", (req, res) => {
            res.sendStatus(200);
        })

        this.express.get("/:clientID/location/:location", (req, res) => this.onLocation(req,res));
        this.express.get("/:clientID/latlng/:lat,:lng", (req, res) => this.onLatLng(req,res));
        this.express.get("/:clientID/latLng/:lat,:lng", (req, res) => this.onLatLng(req,res));

        this.express.listen(this.Main.config.port, () => console.log(`🚀 Server running on port ${this.Main.config.port}`));
    }

    private validateClientToken(req: express.Request): boolean {
        if (typeof(req.params.clientID) === "string") {
            if (this.Main.auth.validClientIDs.includes(req.params.clientID)) {
                return true;
            }
        }

        return false;
    }

    private async onLocation(req: express.Request, res: express.Response) {
        if (!this.validateClientToken(req)) {
            res.sendStatus(401);
            this.logRequest("Unauthorized");
            return;
        }

        
        if (typeof(req.params.location) === "string") {
            try {
                const latLng = await this.Main.WeatherManager.getLatLongFromLocationQuery(req.params.location);
                const weatherData = await this.Main.WeatherManager.getWeatherData(latLng[0], latLng[1])
                this.logRequest(req.params.clientID, weatherData);
                res.send(weatherData);
            } catch(e) {
                if (e instanceof NoWeatherDataReturnedError || e instanceof InvalidWeatherDataReturnedError) {
                    res.sendStatus(500);
                } else {
                    res.sendStatus(400);
                }
            }

            return;
        } else {
            this.logRequest(req.params.clientID);
        }
        res.sendStatus(400);
    }
    
    private async onLatLng(req: express.Request, res: express.Response) {
        if (!this.validateClientToken(req)) {
            res.sendStatus(401);
            this.logRequest("Unauthorized");
            return; 
        }

        
        if (typeof(req.params.lat) === "string" && typeof(req.params.lng) === "string") {
            try {
                if (isNaN(parseInt(req.params.lat)) || isNaN(parseInt(req.params.lng))) {
                    throw Error();
                }
                const weatherData = await this.Main.WeatherManager.getWeatherData(req.params.lat, req.params.lng);
                this.logRequest(req.params.clientID, weatherData);
                res.send(weatherData);
            } catch(e) {
                if (e instanceof NoWeatherDataReturnedError || e instanceof InvalidWeatherDataReturnedError) {
                    res.sendStatus(500);
                } else {
                    res.sendStatus(400);
                }
            }

            return;
        } else {
            this.logRequest(req.params.clientID);
        }

        res.sendStatus(400);
    }
}


import Main from ".";
import BaseManager from "./BaseManager";
import express from "express";
import { InvalidWeatherDataReturnedError, NoWeatherDataReturnedError } from "./WeatherManager";

export default class ExpressManager extends BaseManager {
    express
    constructor(Main: Main) {
        super(Main);

        this.express = express();
    }

    logRequest(clientID: string) {
        const existingData = this.Main.DbManager.get(clientID);

        if (existingData !== undefined && existingData.requestsMade !== undefined) {
            this.Main.DbManager.set(clientID, {requestsMade: existingData.requestsMade + 1, lastRequestDate: new Date(Date.now()).toString()}, true)
        } else {
            this.Main.DbManager.set(clientID, {requestsMade: 1, lastRequestDate: new Date(Date.now()).toString()})
        }

        this.Main.incrementTotalRequests();
        this.Main.setLastRequestDate(new Date(Date.now()).toString());
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

        this.logRequest(req.params.clientID);

        if (typeof(req.params.location) === "string") {
            try {
                const latLng = await this.Main.WeatherManager.getLatLongFromLocationQuery(req.params.location);
                const weatherData = await this.Main.WeatherManager.getWeatherData(latLng[0], latLng[1])
                res.send(weatherData);
            } catch(e) {
                if (e instanceof NoWeatherDataReturnedError || e instanceof InvalidWeatherDataReturnedError) {
                    res.sendStatus(500);
                } else {
                    res.sendStatus(400);
                }
            }

            return;
        }
        res.sendStatus(400);
    }
    
    private async onLatLng(req: express.Request, res: express.Response) {
        if (!this.validateClientToken(req)) {
            res.sendStatus(401);
            this.logRequest("Unauthorized");
            return; 
        }

        this.logRequest(req.params.clientID);

        if (typeof(req.params.lat) === "string" && typeof(req.params.lng) === "string") {
            try {
                if (isNaN(parseInt(req.params.lat)) || isNaN(parseInt(req.params.lng))) {
                    throw Error();
                }
                const weatherData = await this.Main.WeatherManager.getWeatherData(req.params.lat, req.params.lng);
                res.send(weatherData);
            } catch(e) {
                if (e instanceof NoWeatherDataReturnedError || e instanceof InvalidWeatherDataReturnedError) {
                    res.sendStatus(500);
                } else {
                    res.sendStatus(400);
                }
            }

            return;
        }

        res.sendStatus(400);
    }
}


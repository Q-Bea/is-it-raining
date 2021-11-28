import Main from ".";
import BaseManager from "./BaseManager";
import express from "express";

export default class ExpressManager extends BaseManager {
    express
    constructor(Main: Main) {
        super(Main);

        this.express = express();
    }

    start() {
        this.express.get("", async (req, res) => {
            if (req.query.latLng && typeof(req.query.latLng) === "string") {
                const latLongArray = req.query.latLng.split(",");
                if (latLongArray.length === 2) {
                    try {
                        const weatherData = await this.Main.WeatherManager.getWeatherData(latLongArray[0], latLongArray[1]);
                        res.send(weatherData);
                    } catch(e) {
                        res.send(500);
                    }
                }
            } else {
                if (req.query.location && typeof(req.query.location) === "string") {
                    try {
                        const latLng = await this.Main.WeatherManager.getLatLongFromLocationQuery(req.query.location);
                        const weatherData = await this.Main.WeatherManager.getWeatherData(latLng[0], latLng[1])
                        res.send(weatherData);
                    } catch(e) {
                        res.send(500);
                    }
                } else {
                    res.sendStatus(405)
                }
            }
        })

        this.express.listen(this.Main.config.port, () => console.log(`🚀 Server running on port ${this.Main.config.port}`));
    }
}
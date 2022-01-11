import Main from ".";
import BaseManager from "./BaseManager";
import express from "express";
import fs from "fs"

export default class ExpressManager extends BaseManager {
    express
    constructor(Main: Main) {
        super(Main);

        this.express = express();
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
        // if (typeof(req.params.clientID) === "string") {
        //     if (this.Main.auth.validClientIDs.includes(req.params.clientID)) {
        //         return true;
        //     }
        // }

        return true;
    }

    private async onLocation(req: express.Request, res: express.Response) {
        if (!this.validateClientToken(req)) {
            res.sendStatus(401);
            return;
        }

        res.status(200).send(this.getMockData());
        return;
    }
    
    private async onLatLng(req: express.Request, res: express.Response) {
        if (!this.validateClientToken(req)) {
            res.sendStatus(401);
            return; 
        }

        res.status(200).send(this.getMockData());
        return;
    }

    private getMockData() {
        return JSON.parse(fs.readFileSync(process.cwd() + "/mock.json").toString())
    }
}


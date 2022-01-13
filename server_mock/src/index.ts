import ExpressManager from "./ExpressManager";

export interface ConfigData {
    port: number
}

export default class Main {
    config: ConfigData

    ExpressManager: ExpressManager

    constructor(config: ConfigData) {
        this.config = config;

        this.ExpressManager = new ExpressManager(this);
    }

    startIntervalCacheClearer(): this {
        return this;
    }

    startExpressServer(): this {
        this.ExpressManager.start();
        return this;
    }
}

const config = require("../config.json");

//Check to ensure configs are valid
if (
    !checkValidConfig(config, ["port"])
) {
    console.error("INVALID CONFIG FILES! EXITING...")
    process.exit(1);
}

new Main(config).startExpressServer();

function checkValidConfig(data: Record<string, unknown>, requiredKeys: string[]): boolean {
    for (const key of requiredKeys) {
        if (data[key] === undefined) {
            return false;
        }
    }

    return true;
}
import ExpressManager from "./ExpressManager";
import WeatherManager from "./WeatherManager";

export interface AuthData {
    pirateWeatherAPIKey: string
    mapQuestAPIKey: string
    validClientIDs: string[]
}

export interface ConfigData {
    port: number
    useWeatherCaching: boolean //If enabled, API requests are only made to pirate weather if it has been more than x minutes since the last request
    cacheMaxLifespanMinutes: number
    maxCachedItems?: number
    willRainThreshold: number
}

export default class Main {
    auth: AuthData
    config: ConfigData

    WeatherManager: WeatherManager
    ExpressManager: ExpressManager
    constructor(auth: AuthData, config: ConfigData) {
        this.auth = auth;
        this.config = config;

        this.WeatherManager = new WeatherManager(this);
        this.ExpressManager = new ExpressManager(this);
    }

    startIntervalCacheClearer(): this {
        if (this.config.useWeatherCaching) {
            setInterval(() => {
                this.WeatherManager.purgeOldCaches();
            }, 1000 * 5)
        }

        return this;
    }

    startExpressServer(): this {
        this.ExpressManager.start();
        return this;
    }
}

const auth = require("../auth.json");
const config = require("../config.json");

//Check to ensure configs are valid
if (
    !checkValidConfig(auth, ["pirateWeatherAPIKey", "mapQuestAPIKey", "validClientIDs"]) || 
    !checkValidConfig(config, ["cacheMaxLifespanMinutes", "port", "useWeatherCaching", "willRainThreshold"])
) {
    console.error("INVALID CONFIG FILES! EXITING...")
    process.exit(1);
}

new Main(auth, config).startIntervalCacheClearer().startExpressServer();

function checkValidConfig(data: Record<string, unknown>, requiredKeys: string[]): boolean {
    for (const key of requiredKeys) {
        if (data[key] === undefined) {
            return false;
        }
    }

    return true;
}
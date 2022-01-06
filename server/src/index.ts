import ExpressManager from "./ExpressManager";
import WeatherManager from "./WeatherManager";
import DbManager from "./DbManager";
const tx2 = require("tx2")

export interface AuthData {
    openWeatherAPIKey: string
    mapQuestAPIKey: string
    validClientIDs: string[]
}

export interface ConfigData {
    port: number
    useWeatherCaching: boolean //If enabled, API requests are only made to pirate weather if it has been more than x minutes since the last request
    cacheMaxLifespanMinutes: number
    maxCachedItems?: number
}

export default class Main {
    auth: AuthData
    config: ConfigData

    WeatherManager: WeatherManager
    ExpressManager: ExpressManager
    DbManager: DbManager

    txTotalRequests?: any
    txLastRequest?: any

    constructor(auth: AuthData, config: ConfigData) {
        this.auth = auth;
        this.config = config;

        this.WeatherManager = new WeatherManager(this);
        this.ExpressManager = new ExpressManager(this);
        this.DbManager = new DbManager(this, "logging.json");
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

    startTX2(): this {
        tx2.action("queryUsageByClientID", (cb: any) => {
            const dbDump = this.DbManager.getAll();

            if (dbDump !== undefined) {
                const output: Record<string, string> = {}
                for (const clientID in dbDump) {
                    output[clientID] = `Requests: ${dbDump[clientID].requestsMade ?? 0} | Last Request: ${dbDump[clientID].lastRequestDate ?? "Never"}`
                }

                cb(output)
            } else {
                cb({})
            }
        })

        this.txTotalRequests = tx2.metric("Total Requests")
        this.txTotalRequests?.set(this.getTotalRequests())

        this.txLastRequest = tx2.metrix("Last Request");
        this.txLastRequest?.set("Unknown / Before Startup")

        return this;
    }

    incrementTotalRequests() {
        this.txTotalRequests?.set(this.txTotalRequests?.get() + 1);
    }

    setLastRequestDate(date: string) {
        this.txLastRequest?.set(date)
    }

    private getTotalRequests() {
        const dbDump = this.DbManager.getAll();

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
}

const auth = require("../auth.json");
const config = require("../config.json");

//Check to ensure configs are valid
if (
    !checkValidConfig(auth, ["openWeatherAPIKey", "mapQuestAPIKey", "validClientIDs"]) || 
    !checkValidConfig(config, ["cacheMaxLifespanMinutes", "port", "useWeatherCaching"])
) {
    console.error("INVALID CONFIG FILES! EXITING...")
    process.exit(1);
}

new Main(auth, config).startTX2().startIntervalCacheClearer().startExpressServer();

function checkValidConfig(data: Record<string, unknown>, requiredKeys: string[]): boolean {
    for (const key of requiredKeys) {
        if (data[key] === undefined) {
            return false;
        }
    }

    return true;
}
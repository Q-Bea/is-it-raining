export class BaseManager {
    Main: Main
    constructor(Main: Main) {
        this.Main = Main
    }
}

import MotherRequestManager from "./managers/MotherRequestManager"
import SettingsManager from "./managers/SettingsManager"
import SpeechRequestHandler from "./managers/SpeechRequestHandler"

export interface locationObject_latlng {
    type: "latlng",
    value: [number, number]
}

export interface locationObject_locationQuery {
    type: "location",
    value: "string"
}

export interface MotherSettings {
    location: locationObject_latlng | locationObject_locationQuery,
    savePreviousAudioFiles: boolean
}

export interface ConfigData {
    motherDownloadedConfigFilename: string
    offlineBehaviour: string
    fallbackSettings: MotherSettings
    motherCheckInInterval_ms: number
    motherDownloadAlsoChecksIn: boolean
}

export interface AuthData {
    isItRainingAuthToken: string
    motherAuthToken: string
    speechServicesAuthToken: string
    speechServicesAuthRegion: string
}

export default class Main {
    auth: AuthData
    config: ConfigData

    SettingManager: SettingsManager
    SpeechRequestHandler: SpeechRequestHandler
    MotherRequestManager: MotherRequestManager

    constructor(auth: AuthData, config: ConfigData) {
        this.auth = auth;
        this.config = config;

        this.MotherRequestManager = new MotherRequestManager(this);
        this.SettingManager = new SettingsManager(this);
        this.SpeechRequestHandler = new SpeechRequestHandler(this);
    }

    start() {
        this.MotherRequestManager.startInterval();
        this.SpeechRequestHandler.setup();

        this.SpeechRequestHandler.ServiceAPI.downloadSpeechFile("Just like last time you asked, it is not currently raining. You should bring you're umbrella though because it might be raining in an hour.")
    }
}

const authData = require("../auth.json");
const configData = require("../config.json")

if (
    !checkValidConfig(authData, ["isItRainingAuthToken", "motherAuthToken", "speechServicesAuthToken", "speechServicesAuthRegion"])||
    !checkValidConfig(configData, ["motherDownloadedConfigFilename", "offlineBehaviour", "fallbackSettings", "motherCheckInInterval_ms", "motherDownloadAlsoChecksIn"])
) {
    console.error("INVALID CONFIG FILES! EXITING...")
    process.exit(1);
}

new Main(authData, configData).start();


function checkValidConfig(data: Record<string, unknown>, requiredKeys: string[]): boolean {
    for (const key of requiredKeys) {
        if (data[key] === undefined) {
            return false;
        }
    }

    return true;
}
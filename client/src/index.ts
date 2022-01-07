export class BaseManager {
    Main: Main
    constructor(Main: Main) {
        this.Main = Main
    }
}

import MotherRequestManager, { type MotherSettings } from "./managers/MotherRequestManager"
import StorageManager from "./managers/StorageManager"
import SpeechRequestHandler from "./managers/SpeechRequestHandler"
import IITRequestManager from "./managers/IITRequestManager"
import GPIOInterface from "./managers/GPIOInterface"
import SettingsManager from "./managers/SettingsManager"

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

    StorageManager: StorageManager
    SpeechRequestHandler: SpeechRequestHandler
    MotherRequestManager: MotherRequestManager
    IITRequestManager: IITRequestManager
    GPIOInterface: GPIOInterface
    SettingsManager: SettingsManager

    constructor(auth: AuthData, config: ConfigData) {
        this.auth = auth;
        this.config = config;

        this.MotherRequestManager = new MotherRequestManager(this);
        this.StorageManager = new StorageManager(this);
        this.SpeechRequestHandler = new SpeechRequestHandler(this);
        this.IITRequestManager = new IITRequestManager(this);
        this.GPIOInterface = new GPIOInterface(this);
        this.SettingsManager = new SettingsManager(this);
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
    !checkValidConfig(configData, ["motherDownloadedConfigFilename", "fallbackSettings", "motherCheckInInterval_ms", "motherDownloadAlsoChecksIn"])
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
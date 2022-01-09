export class BaseManager {
    Main: Main;
    constructor(Main: Main) {
        this.Main = Main;
    }
}

import { exec } from "child_process";
import MotherRequestManager, { type MotherSettings } from "./managers/MotherRequestManager";
import StorageManager from "./managers/StorageManager";
import SpeechRequestHandler, { AudioFileType } from "./managers/SpeechRequestHandler";
import IITRequestManager from "./managers/IITRequestManager";
import GPIOInterface from "./managers/GPIOInterface";
import SettingsManager from "./managers/SettingsManager";
import GithubAutoUpdateManager from "./managers/GithubAutoUpdater";
import RuntimeManager from "./managers/Runtime";
import { type ValidAudioFileName } from "./managers/speechSubRoutine/SpeechFileManager";

export interface ConfigData {
    motherDownloadedConfigFilename: string
    fallbackSettings: MotherSettings
    gpioButtonPin: number
    gpioVolumePinA: number
    gpioVolumePinB: number
    loggingFileName: string
}

export interface AuthData {
    isItRainingAuthToken: string
    motherAuthToken: string
    speechServicesAuthToken: string
    speechServicesAuthRegion: string
}

export enum IntervalIDs {
    GPIO = 0,
    Mother = 1,
    Github = 2,
}

export default class Main {
    readonly auth: AuthData;
    readonly config: ConfigData;

    readonly StorageManager: StorageManager;
    readonly SpeechRequestHandler: SpeechRequestHandler;
    readonly MotherRequestManager: MotherRequestManager;
    readonly IITRequestManager: IITRequestManager;
    readonly GPIOInterface: GPIOInterface;
    readonly SettingsManager: SettingsManager;
    readonly GithubAutoUpdateManager: GithubAutoUpdateManager;
    readonly RuntimeManager: RuntimeManager;

    readonly noConnectionFileName: ValidAudioFileName = "noConnection1.wav";
    readonly randomErrorFileName: ValidAudioFileName = "randomError1.wav";
    readonly unknownWeatherFileName: ValidAudioFileName = "unknownWeather.wav";

    private intervalToRestart: IntervalIDs[] = []

    constructor(auth: AuthData, config: ConfigData) {
        this.auth = auth;
        this.config = config;

        this.MotherRequestManager = new MotherRequestManager(this);
        this.StorageManager = new StorageManager(this);
        this.SpeechRequestHandler = new SpeechRequestHandler(this);
        this.IITRequestManager = new IITRequestManager(this);
        this.GPIOInterface = new GPIOInterface(this);
        this.SettingsManager = new SettingsManager(this);
        this.GithubAutoUpdateManager = new GithubAutoUpdateManager(this);
        this.RuntimeManager = new RuntimeManager(this);
    }

    start() {
        this.StorageManager.createInstance(this.config.motherDownloadedConfigFilename, false);
        this.StorageManager.createInstance(this.config.loggingFileName, false);


        this.MotherRequestManager.startInterval();
        this.SpeechRequestHandler.setup();

        this.GithubAutoUpdateManager.fullUpdateRoutine();

        this.GPIOInterface.startListeners();

        this.generateInternalAudio();

        // this.tmp()
    }

    private async generateInternalAudio() {
        if (await this.checkInternetConnection()) {
            this.SpeechRequestHandler.createOverrideAudio(this.noConnectionFileName, AudioFileType.INTERNAL, "Sorry, I can't connect to the internet right now. If you leave me outside for a bit you can probably figure it out yourself.");
            this.SpeechRequestHandler.createOverrideAudio(this.randomErrorFileName, AudioFileType.INTERNAL, "Something went wrong, sorry. You should probably tell someone if this happens frequently.");   
            this.SpeechRequestHandler.createOverrideAudio(this.unknownWeatherFileName, AudioFileType.INTERNAL, "Honestly, I don't know what's happening outside, good luck though!") 
        }
    }

    private tmp() {
        setTimeout(() => {
            this.RuntimeManager.makeRequest();
        }, 2000);
    }

    /**
     * Sometimes the CWD can be one level too low, for file saving, this can be called to ensure that files are stored to the right location
     */
    ensureCorrectCWD() {
        if (process.cwd().endsWith("client")) return process.cwd();

        else return process.cwd() + "/client";
    }

    async checkInternetConnection(): Promise<boolean> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve) => {
            exec(`ping -c 1 ${this.SettingsManager.getSettings().connectivityIP}`, function(error){
                resolve(error === null);
            });
        });
    }


    async stageIntervalToRestart(id: IntervalIDs) {
        this.intervalToRestart.push(id);
    }

    async executeIntervalRestart() {
        while (this.intervalToRestart.length > 0) {
            const intervalID = this.intervalToRestart.shift();
            switch (intervalID) {
                case IntervalIDs.GPIO:
                    this.GPIOInterface.startListeners();
                    break;

                case IntervalIDs.Github:
                    this.GithubAutoUpdateManager.startInterval();
                    break;

                case IntervalIDs.Mother:
                    this.MotherRequestManager.startInterval();
                    break;

                default:
                    break;
            }
        }
    }
}

const authData = require("../auth.json");
const configData = require("../config.json");

if (
    !checkValidConfig(authData, ["isItRainingAuthToken", "motherAuthToken", "speechServicesAuthToken", "speechServicesAuthRegion"])||
    !checkValidConfig(configData, ["motherDownloadedConfigFilename", "fallbackSettings", "gpioButtonPin", "gpioVolumePinA", "gpioVolumePinB", "loggingFileName"])
) {
    console.error("INVALID CONFIG FILES! EXITING...");
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
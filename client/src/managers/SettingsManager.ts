import Main, { BaseManager } from "..";
import { type MotherSettings } from "./MotherRequestManager";

export default class SettingsManager extends BaseManager {
    static hardCodedFallbackSettings: MotherSettings = {
        location: {
            type: "latlng",
            value: [49.258500, -123.250640]
        },
        failOnNoFuture: false,
        dialogueOptions: {
            "pitch": 0,
            "rate": 15,
            "speaker": "en-US-JennyNeural",
            "style": "assistant"
        },
        internalDialogue: {
            "noInternet": "Sorry, I can't connect to the internet right now. If you leave me outside for a bit you can probably figure it out the weather yourself.",
            "randomError": "Something went wrong, sorry. You should probably tell someone if this happens frequently.",
            "unknownWeatherFile": "Honestly, I don't know what's happening outside, good luck though!"
        },
        dialogue: [],
        savePreviousAudioFiles: true,
        coldFeelThreshold_c: 5,
        windThreshold_kph: 35,
        sayFuturePrediction: true,
        connectivityIP: "208.67.222.222",
        motherCheckInInterval_ms: 15000,
        motherDownloadAlsoChecksIn: false,
        githubUpdateCheckInterval_ms: 1000*60*30,
        deleteAllDialogueOnBoot: true
    };
    constructor(Main: Main) {
        super(Main);
    }

    /**
     * Attempts to get the settings, as they were downloaded from Mother, if a setting is not present in mother, it will fallback to the config setting. If the config setting is missing, it will fallback to the hardcoded setting above
     */
    getSettings(): MotherSettings {
        //We will be doing this with a nested object proxy -- Existing data from mother will fallback to the fallback settings via proxy which will fallback to hardcoded
        const savedMother = this.Main.StorageManager.instances.get(this.Main.config.motherDownloadedConfigFilename)?.getRawJSON() as MotherSettings|Record<string,unknown>|undefined;

        const fallbackProxy = new Proxy(this.Main.config.fallbackSettings, {
            get: (target, prop) => {
                if (target[prop as keyof MotherSettings] === undefined) {
                    return SettingsManager.hardCodedFallbackSettings[prop as keyof MotherSettings];
                } else {
                    return (target as MotherSettings)[prop as keyof MotherSettings];
                }
            }
        });

        const motherProxy = new Proxy(savedMother as MotherSettings|undefined ?? {} as MotherSettings, {
            get: (target, prop) => {
                if ((target as MotherSettings)[prop as keyof MotherSettings] === undefined) {
                    return fallbackProxy[prop as keyof MotherSettings];
                } else {
                    return (target as MotherSettings)[prop as keyof MotherSettings];
                }
            }
        });

        // const fqSettings: MotherSettings = {
        //     dialogue: motherProxy.dialogue,
        //     dialogueOptions: motherProxy.dialogueOptions,
        //     location: motherProxy.location,
        //     savePreviousAudioFiles: motherProxy.savePreviousAudioFiles,
        //     coldFeelThreshold_c: motherProxy.coldFeelThreshold_c,
        //     windThreshold_kph: motherProxy.windThreshold_kph,
        //     sayFuturePrediction: motherProxy.sayFuturePrediction,
        //     connectivityIP: motherProxy.connectivityIP,
        //     failOnNoFuture: motherProxy.failOnNoFuture,
        //     GPIOPollInterval_ms: motherProxy.GPIOPollInterval_ms,
        //     githubUpdateCheckInterval_ms: motherProxy.githubUpdateCheckInterval_ms,
        //     motherCheckInInterval_ms: motherProxy.motherCheckInInterval_ms,
        //     motherDownloadAlsoChecksIn: motherProxy.motherDownloadAlsoChecksIn
        // };
        
        return motherProxy;
    }
}


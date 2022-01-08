import Main, { BaseManager } from "..";
import { VolumeKnobPercent } from "./GPIOInterface";
import { type MotherSettings } from "./MotherRequestManager";

export interface MergedSettings extends MotherSettings {
    volume:VolumeKnobPercent
}
export default class SettingsManager extends BaseManager {
    static hardCodedFallbackSettings: MotherSettings = {
        location: {
            type: "latlng",
            value: [49.258500, -123.250640]
        },
        dialogueOptions: {
            "pitch": 0,
            "rate": 15,
            "speaker": "en-US-JennyNeural",
            "style": "assistant"
        },
        dialogue: [],
        savePreviousAudioFiles: true,
        coldFeelThreshold_c: 5,
        windThreshold_kph: 35,
        sayFuturePrediction: true,
        connectivityIP: "208.67.222.222"
    };
    constructor(Main: Main) {
        super(Main);
    }

    /**
     * Attempts to get the settings, as they were downloaded from Mother, if a setting is not present in mother, it will fallback to the config setting. If the config setting is missing, it will fallback to the hardcoded setting above
     */
    getSettings(): MergedSettings {
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

        const fqSettings: MergedSettings = {
            volume: this.Main.GPIOInterface.readVolumeKnob(),
            dialogue: motherProxy.dialogue,
            dialogueOptions: motherProxy.dialogueOptions,
            location: motherProxy.location,
            savePreviousAudioFiles: motherProxy.savePreviousAudioFiles,
            coldFeelThreshold_c: motherProxy.coldFeelThreshold_c,
            windThreshold_kph: motherProxy.windThreshold_kph,
            sayFuturePrediction: motherProxy.sayFuturePrediction,
            connectivityIP: motherProxy.connectivityIP,
        };
        
        return fqSettings;
    }
}


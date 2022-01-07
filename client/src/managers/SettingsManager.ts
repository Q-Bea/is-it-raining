import Main, { BaseManager } from "..";
import { VolumeKnobPercent } from "./GPIOInterface";
import { type MotherSettings } from "./MotherRequestManager";

export interface MergedSettings extends MotherSettings {
    volume:VolumeKnobPercent
}
export default class SettingsManager extends BaseManager {
    static hardCodedFallbackSettings: MotherSettings = {
        dialogueSpeed: 1.2,
        location: {
            type: "latlng",
            value: [49.258500,-123.250640]
        },
        savePreviousAudioFiles: true,
        coldFeelThreshold_c: 5,
        windThreshold_kph: 35,
        sayFuturePrediction: true
    }
    constructor(Main: Main) {
        super(Main);
    }

    /**
     * Attempts to get the settings, as they were downloaded from Mother, if a setting is not present in mother, it will fallback to the config setting. If the config setting is missing, it will fallback to the hardcoded setting above
     */
    getSettings(): MergedSettings {
        const savedMother = this.Main.StorageManager.instances.get(this.Main.config.motherDownloadedConfigFilename)?.getRawJSON() as MotherSettings|{}|undefined
        const fqSettings: MergedSettings = {
            volume: this.Main.GPIOInterface.readVolumeKnob(),
            dialogueSpeed: (savedMother && "dialogueSpeed" in savedMother ? savedMother.dialogueSpeed : this.Main.config.fallbackSettings.dialogueSpeed ?? SettingsManager.hardCodedFallbackSettings.dialogueSpeed),
            location: (savedMother && "location" in savedMother ? savedMother.location : this.Main.config.fallbackSettings.location ?? SettingsManager.hardCodedFallbackSettings.location),
            savePreviousAudioFiles: (savedMother && "savePreviousAudioFiles" in savedMother ? savedMother.savePreviousAudioFiles : this.Main.config.fallbackSettings.savePreviousAudioFiles ?? SettingsManager.hardCodedFallbackSettings.savePreviousAudioFiles),
            coldFeelThreshold_c: (savedMother && "coldFeelThreshold_c" in savedMother ? savedMother.coldFeelThreshold_c : this.Main.config.fallbackSettings.coldFeelThreshold_c ?? SettingsManager.hardCodedFallbackSettings.coldFeelThreshold_c),
            windThreshold_kph: (savedMother && "windThreshold_kph" in savedMother ? savedMother.windThreshold_kph : this.Main.config.fallbackSettings.windThreshold_kph ?? SettingsManager.hardCodedFallbackSettings.windThreshold_kph),
            sayFuturePrediction: (savedMother && "sayFuturePrediction" in savedMother ? savedMother.sayFuturePrediction : this.Main.config.fallbackSettings.sayFuturePrediction ?? SettingsManager.hardCodedFallbackSettings.sayFuturePrediction),
        };
        
        return fqSettings;
    }
}
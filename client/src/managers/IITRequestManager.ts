import axios from "axios";
import Main, { BaseManager } from "..";
import { KnownProperties } from "./speechSubRoutine/SpeechDialogueManager";

export interface IITRequestData {
    temperature_c_feel: number, //The 'feels like' degrees in celsius
    temperature_c_real: number, //The real degrees in celsius
    isRaining: boolean,
    wind_kph: number, //
    fromCache: boolean //True if the data was returned from the internal cache rather than pirate weather
    nextHour: { //Predictions for the weather at the hour mark closest to an hour from the request time
        wind_kph: number,
        isRaining: boolean
    }
}

export default class IITRequestManager extends BaseManager {
    constructor(Main: Main) {
        super(Main);
    }

    async makeRequest(): Promise<IITRequestData|undefined> {
        try {
            const currentSettings = this.Main.SettingsManager.getSettings();
            let data;
            if (currentSettings.location.type === "latlng") {
                data = await axios({
                    url: `https://isitraining.beamacdonald.ca/latlng/${this.Main.auth.isItRainingAuthToken}/${currentSettings.location.value[0]},${currentSettings.location.value[1]}`,
                    method: "GET",
                    timeout: 10000
                });
            } else {
                data = await axios({
                    url: `https://isitraining.beamacdonald.ca/location/${currentSettings.location.value}`,
                    method: "GET",
                    timeout: 10000
                });
            }

            if (data.status === 200) {
                return data.data as IITRequestData;
            }

            return undefined;
        } catch(e) {
            return undefined;
        }
    }

    /**
     * This parses an IIT input and converts it into 1 or 2 known property arrays, the first is current and the second is future
     */
    parseIntoProperties(iitData: IITRequestData): [currentlyProperties: KnownProperties[], futureProperties: KnownProperties[]] {
        const currentSettings = this.Main.SettingsManager.getSettings();

        const properties: [KnownProperties[], KnownProperties[]] = [[],[KnownProperties.Future]];

        if (iitData.fromCache) {
            properties[0].push(KnownProperties.RecentlyAsked);
        }

        if (iitData.isRaining) {
            properties[0].push(KnownProperties.Raining);
        }
        
        if (iitData.temperature_c_feel <= currentSettings.coldFeelThreshold_c) {
            properties[0].push(KnownProperties.Cold);
        }

        if (iitData.wind_kph <= currentSettings.windThreshold_kph) {
            properties[0].push(KnownProperties.Windy);
        }

        if (iitData.nextHour.isRaining) {
            properties[1].push(KnownProperties.Raining);
        }

        if (iitData.nextHour.wind_kph) {
            properties[1].push(KnownProperties.Windy);
        }

        return properties;
    }
}
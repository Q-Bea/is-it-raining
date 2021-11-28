import Main from ".";
import BaseManager from "./BaseManager";
import axios from "axios";

export interface WeatherData {
    temperature: number
    isRaining: boolean
    isWindy: boolean
}

interface CachedItemData {
    lastUpdate: number
    data: WeatherData
}

export default class WeatherManager extends BaseManager {
    cached: Map<string, CachedItemData> = new Map();
    
    constructor(Main: Main) {
        super(Main);
    }

    private getMinutesSinceLastCache(lat: string, long: string): number {
        const cacheData = this.cached.get(`${lat}${long}`);
        
        if (!cacheData) return Infinity;

        //Unix is is ms
        return ((Date.now() - cacheData.lastUpdate)/1000)/60
    }

    private getFromCache(lat: string, long: string) {
        return this.cached.get(`${lat}${long}`);
    }

    public isCacheValid(lat: string, long: string): boolean {
        return this.getMinutesSinceLastCache(lat, long) < this.Main.config.cacheMaxLifespanMinutes;
    }

    public isCacheValidFromData(data: CachedItemData) {
        return ((Date.now() - data.lastUpdate)/1000)/60 < this.Main.config.cacheMaxLifespanMinutes;
    }

    public async getWeatherData(lat: string, long: string): Promise<WeatherData> {
        if (this.isCacheValid(lat, long)) return this.getFromCache(lat, long)!.data;

        try {
            const response = await axios({
                url: `https://api.pirateweather.net/forecast/${this.Main.auth.pirateWeatherAPIKey}/${lat},${long}`,
                responseType: "json",
                method: "GET",
                timeout: 5000
            })

            if (response.status === 200) {
                const isRaining = response.data.currently?.precipType === "rain" || response.data.currently?.precipProbability > 0.70
                const temperature = (response.data.currently?.temperature - 32) * (5/9);
                const isWindy = response.data.currently?.windSpeed * 1.609344 > 15;

                if (!(isRaining === undefined || temperature === undefined || isWindy === undefined)) {
                    if (this.Main.config.useWeatherCaching) {
                        this.cached.set(`${lat}${long}`, {
                            data: {
                                isRaining: isRaining,
                                isWindy: isWindy,
                                temperature: temperature
                            },
                            lastUpdate: Date.now()
                        })
                    }

                    return {
                        isRaining: isRaining,
                        isWindy: isWindy,
                        temperature: temperature
                    }
                }
            }

            throw Error();
        } catch(e) {
            console.error(e);
            throw Error();
        }
    }

    public async purgeOldCaches() {
        this.cached.forEach((cachedItem, key) => {
            if (!this.isCacheValidFromData(cachedItem)) {
                this.cached.delete(key);
            }
        })
    }

    public async getLatLongFromLocationQuery(query: string): Promise<[lat: string, long: string]> {
        try {
            const response = await axios({
                url: `http://www.mapquestapi.com/geocoding/v1/address`,
                params: {
                    key: this.Main.auth.mapQuestAPIKey,
                    location: query
                },
                method: "GET",
                timeout: 5000
            })
            //Response json: {results: [locations?: [{latLng: {lat: number, lng: number}}]]}

            if (response.status === 200) {
                const latLng = response.data?.results[0]?.locations[0]?.latLng;
                if (latLng) {
                    return [latLng.lat, latLng.lng];
                }
            }
            throw Error("Could not find Lat Long");
        } catch(e) {
            console.error(e);
            throw Error();
        }
    } 
}
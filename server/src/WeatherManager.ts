import Main from ".";
import BaseManager from "./BaseManager";
import axios from "axios";
import CustomError from "./CustomError";
export interface WeatherData {
    temperature_c_feel: number
    temperature_c_real: number
    isRaining: boolean
    wind_kph: number
    fromCache: boolean
    nextHour: Omit<Omit<Omit<Omit<WeatherData, "temperature_c_feel">, "fromCache">, "nextHour">, "temperature_c_real">
}

export class NoWeatherDataReturnedError extends CustomError {}
export class InvalidWeatherDataReturnedError extends CustomError {}
export class LatLngNotFoundError extends CustomError {}


interface CachedItemData {
    lastUpdate: number
    data: Omit<WeatherData, "fromCache">
}

const WIND_MS_TO_KPH = 3.2;

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
        if (this.isCacheValid(lat, long)) {
            const cache = this.getFromCache(lat, long)!.data
            return {
                fromCache: true,
                isRaining: cache.isRaining,
                wind_kph: cache.wind_kph,
                temperature_c_feel: cache.temperature_c_feel,
                temperature_c_real: cache.temperature_c_real,
                nextHour: cache.nextHour
            }
        };

        try {
            const response = await axios({
                url: `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${long}&exclude=minutely&units=metric&appid=${this.Main.auth.openWeatherAPIKey}`,
                responseType: "json",
                method: "GET",
                timeout: 5000
            })

            if (response.status === 200) {
                if (response.data.current) {
                    //Want to find the forecast the closest to an hour from now, which will either be data[1] or data[2]
                    //data[0] is the current hour, data[1] is the next hour
                    const hourFromNow = (response.data.current.dt + 60);

                    const data1Check = Math.abs(hourFromNow - response.data.hourly[1].dt);
                    const data2Check = Math.abs(hourFromNow - response.data.hourly[2].dt);
                    
                    const nextHourData = data1Check < data2Check ? response.data.hourly[1] : response.data.hourly[2];

                    const isRainingNow = (response.data.current.weather as [any]).some(weatherObject => {
                        return ["Rain", "Drizzle", "Thunderstorm"].includes(weatherObject.Main);
                    });

                    const mightRainLater = (nextHourData.weather as [any]).some(weatherObject => {
                        return ["Rain", "Drizzle", "Thunderstorm"].includes(weatherObject.Main);
                    })

                    const temperature_c_feel = response.data.current.feels_like;
                    const temperature_c_real = response.data.current.temp
                    const windNow = response.data.current.wind_speed * WIND_MS_TO_KPH;
                    const windLater = nextHourData.wind_speed * WIND_MS_TO_KPH;

                    if (this.Main.config.useWeatherCaching) {
                        if (this.Main.config.maxCachedItems && this.cached.size < this.Main.config.maxCachedItems) {
                            this.cached.set(`${lat}${long}`, {
                                data: {
                                    isRaining: isRainingNow,
                                    wind_kph: windNow,
                                    temperature_c_feel: temperature_c_feel,
                                    temperature_c_real: temperature_c_real,
                                    nextHour: {
                                        isRaining: mightRainLater,
                                        wind_kph: windLater,
                                    }
                                },
                                lastUpdate: Date.now()
                            })
                        }
                    }
                    return {
                        isRaining: isRainingNow,
                        wind_kph: windNow,
                        temperature_c_feel: temperature_c_feel,
                        temperature_c_real: temperature_c_real,
                        fromCache: false,
                        nextHour: {
                            isRaining: mightRainLater,
                            wind_kph: windLater
                        }
                    }
                }
            }

            throw new InvalidWeatherDataReturnedError();
        } catch(e) {
            console.error(e);
            throw new NoWeatherDataReturnedError();
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
                url: `https://www.mapquestapi.com/geocoding/v1/address`,
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
            throw new LatLngNotFoundError()
        } catch(e) {
            console.error(e);
            throw new LatLngNotFoundError();
        }
    } 
}
import Main from ".";
import BaseManager from "./BaseManager";
import axios from "axios";
import CustomError from "./CustomError";
// const ecWeather = require("ec-weather") //Does not contain typings

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
const WIND_MPH_TO_KPH = 1.609344;

export default class WeatherManager extends BaseManager {
    cached: Map<string, CachedItemData> = new Map();
    
    constructor(Main: Main) {
        super(Main);
    }

    private getMinutesSinceLastCache(ECanadaCityCode: string): number
    private getMinutesSinceLastCache(lat: string, long: string): number
    private getMinutesSinceLastCache(...query: [string]|[string,string]): number {

        let cacheData
        if (query.length == 1) {
            cacheData = this.getFromCache(query[0]);
        } else {
            cacheData = this.getFromCache(query[0], query[1])
        }
        
        if (!cacheData) return Infinity;

        //Unix is is ms
        return ((Date.now() - cacheData.lastUpdate)/1000)/60
    }

    private getFromCache(ECanadaCityCode: string): CachedItemData|undefined
    private getFromCache(lat: string, long: string): CachedItemData|undefined
    private getFromCache(...query: [string]|[string, string]): CachedItemData|undefined {
        if (query.length == 1) {
            return this.cached.get(query[0])
        } else {
            return this.cached.get(`${query[0]}${query[1]}`)
        }
    }

    public isCacheValid(ECanadaCityCode: string): boolean
    public isCacheValid(lat: string, long: string): boolean
    public isCacheValid(...query: [string]|[string, string]): boolean {
        if (query.length == 1) {
            return this.getMinutesSinceLastCache(query[0]) < this.Main.config.cacheMaxLifespanMinutes;
        } else {
            return this.getMinutesSinceLastCache(query[0], query[1]) < this.Main.config.cacheMaxLifespanMinutes;
        }
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
            const openWeatherData = await this.requestOpenWeatherData(lat, long);
            let pirateWeatherData;
            try {
                pirateWeatherData = await this.requestPirateWeatherData(lat, long);
            } catch(e) {
                pirateWeatherData = openWeatherData //We don't really care
            }

            //Prioritize openWeather, but if pirate weather says it is raining, then override
            const data: WeatherData = {
                isRaining: (openWeatherData.isRaining || pirateWeatherData.isRaining) ? true : false,
                wind_kph: openWeatherData.wind_kph,
                temperature_c_feel: openWeatherData.temperature_c_feel,
                temperature_c_real: openWeatherData.temperature_c_real,
                nextHour: {
                    isRaining: (openWeatherData.nextHour.isRaining || pirateWeatherData.nextHour.isRaining) ? true : false,
                    wind_kph: openWeatherData.nextHour.wind_kph,
                },
                fromCache: false
            }

            if (this.Main.config.useWeatherCaching) {
                if (this.Main.config.maxCachedItems && this.cached.size < this.Main.config.maxCachedItems) {
                    this.cached.set(`${lat}${long}`, {
                        data: data,
                        lastUpdate: Date.now()
                    })
                }
            }
            
            return data;
        } catch(e) {
            console.error(e);
            throw new NoWeatherDataReturnedError();
        }
    }

    public async getECanadaWeatherData(cityCode: string): Promise<WeatherData> {
        if (this.isCacheValid(cityCode)) {
            const cache = this.getFromCache(cityCode)!.data
            return {
                fromCache: true,
                isRaining: cache.isRaining,
                wind_kph: cache.wind_kph,
                temperature_c_feel: cache.temperature_c_feel,
                temperature_c_real: cache.temperature_c_real,
                nextHour: cache.nextHour
            }
        }
        
        try {
            const data = await this.parseEnvironmentCanadaData(cityCode);

            debugger;
            throw Error
        } catch (e) {
            console.log(e);
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

    private async requestOpenWeatherData(lat: string, long: string): Promise<Omit<WeatherData, "fromCache">> {
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
                const hourFromNow = (response.data.current.dt + 3600);

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
                const temperature_c_real = response.data.current.temp;
                const windNow = response.data.current.wind_speed * WIND_MS_TO_KPH;
                const windLater = nextHourData.wind_speed * WIND_MS_TO_KPH;

                return {
                    isRaining: isRainingNow,
                    temperature_c_feel: temperature_c_feel,
                    temperature_c_real: temperature_c_real,
                    wind_kph: windNow,
                    nextHour: {
                        isRaining: mightRainLater,
                        wind_kph: windLater
                    }
                }
            }
        }
        throw new InvalidWeatherDataReturnedError();
    }

    private async requestPirateWeatherData(lat: string, long: string): Promise<WeatherData> {
        const response = await axios({
            url: `https://dev.pirateweather.net/forecast/${this.Main.auth.pirateWeatherAPIKey}/${lat},${long}`,
            responseType: "json",
            method: "GET",
            timeout: 10000
        })

        if (response.status === 200) {
            if (response.data.currently && response.data.hourly?.data) {
                //data[0] is the current hour, data[1] is the next hour
                const hourFromNow = response.data.currently.time + 3600;

                //Want to find the forecast the closest to an hour from now, which will either be data[1] or data[2]
                const data1Check = Math.abs(hourFromNow - response.data.hourly.data[1].time);
                const data2Check = Math.abs(hourFromNow - response.data.hourly.data[2].time);
                
                const nextHourData = data1Check < data2Check ? response.data.hourly.data[1] : response.data.hourly.data[2];


                const isRainingNow = (
                    response.data.currently.summary === "Rain" || 
                    response.data.currently?.precipProbability > this.Main.config.pirateWeatherPrecipProbabilityThreshold || 
                    response.data.hourly.data[0].summary === "Rain" ||
                    response.data.hourly.data[0].precipProbability > this.Main.config.pirateWeatherPrecipProbabilityThreshold);
                const mightRainLater = nextHourData.summary === "Rain" || nextHourData.precipProbability > this.Main.config.pirateWeatherPrecipProbabilityThreshold;
                const temperature_c = (response.data.currently.temperature - 32) * (5/9);
                const temperature_c_apparent = (response.data.currently.temperature - 32) * (5/9);
                const windNow = response.data.currently.windSpeed * WIND_MPH_TO_KPH;
                const windLater = nextHourData.windSpeed * WIND_MPH_TO_KPH;

                const data: WeatherData = {
                    isRaining: isRainingNow,
                    wind_kph: windNow,
                    temperature_c_real: temperature_c,
                    temperature_c_feel: temperature_c_apparent,
                    nextHour: {
                        isRaining: mightRainLater,
                        wind_kph: windLater
                    },
                    fromCache: false
                }

                if (this.Main.config.useWeatherCaching) {
                    if (this.Main.config.maxCachedItems && this.cached.size < this.Main.config.maxCachedItems) {
                        this.cached.set(`${lat}${long}`, {
                            data: data,
                            lastUpdate: Date.now()
                        })
                    }
                }
                return data;
            }
        }

        throw new InvalidWeatherDataReturnedError();
    }

    private async parseEnvironmentCanadaData(cityCode: string): Promise<WeatherData> {
        // const data = await ecWeather({
        //     lang: 'en',
        //     city: 'bc-74'
        // })

        //TODO

        throw new InvalidWeatherDataReturnedError("Not supported");
    }
}
import Main from ".";
import BaseManager from "./BaseManager";
import fs from "fs";

export interface ClientData {
    requestsMade?: number
    lastRequestDate?: Date|string
}

export type StorageNamespace = {[clientID: string]: ClientData}

export default class DbManager extends BaseManager {
    dbFileName: string;
    constructor(Main: Main, dbFileName: string) {
        super(Main);
        this.dbFileName = dbFileName;

        if (!dbFileName.endsWith(".json")) {
            console.error("DB files must end with .json !");
            process.exit(1);
        }

        if (!fs.existsSync(process.cwd() + "/db")) {
            fs.mkdirSync(process.cwd() + "/db")
        }

        if (!fs.existsSync(this.getFilePath())) {
            console.warn(`DB file must exist! (db/${dbFileName}) --> Creating it now...`);
            fs.writeFileSync(process.cwd() + `/db/${dbFileName}`, '{}')
        }
    }

    private fileExists() {
        return fs.existsSync(this.getFilePath());
    }

    private getFilePath() {
        return process.cwd() + "/db/" + this.dbFileName;
    }

    getFile(): StorageNamespace|undefined {
        try {
            return JSON.parse(fs.readFileSync(this.getFilePath(), "utf-8"));
        } catch (e) {
            return undefined;
        }
    }

    //These are simple single path setters and getters
    get(clientID: string): ClientData | undefined {
        if (typeof(clientID) !== "string") return undefined;

        const fileData = this.getFile();

        if (!fileData) return undefined;

        return fileData[clientID];
    }

    getAll(): StorageNamespace {
        return this.getFile() || {};
    }

    set(clientID: string, data: ClientData, allowOverride = false): boolean {
        if (typeof(clientID) !== "string" || typeof(allowOverride) !== "boolean") return false;

        const fileData = this.getFile();

        if (!fileData) return false;

        if (!allowOverride && fileData[clientID]) return false;

        fileData[clientID] = data;

        this.updateFile(fileData);
        return true;
    }

    setProperty<Property extends keyof ClientData>(clientID: string, property: Property, value: ClientData[Property]): boolean {
        const fileData = this.getFile();

        if (!fileData) return false;
        if (!fileData[clientID]) return false;

        fileData[clientID][property] = value;

        this.updateFile(fileData);

        return true;
    }

    getProperty<Property extends keyof ClientData>(clientID: string, property: Property): ClientData[Property] | undefined {
        const fileData = this.getFile();

        if (!fileData) return undefined;
        if (!fileData[clientID]) return undefined;

        return fileData[clientID][property];
    }

    rem(key: string): boolean {
        if (typeof(key) !== "string") return false;

        const fileData = this.getFile();

        if (!fileData) return false;

        let output = false;

        if (fileData[key]) {
            delete fileData[key];
            output = true;
        }

        this.updateFile(fileData);

        return output;
    }

    reset(): void {
        if (this.fileExists()) {
            this.updateFile({});
        }
    }

    private updateFile(fileData: any) {
        fs.writeFileSync(this.getFilePath(), JSON.stringify(fileData, null, 4));
    }
}
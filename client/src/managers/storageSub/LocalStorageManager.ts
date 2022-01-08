import fs, {PathLike} from "fs";
import CustomError from "../../CustomError";
import StorageManager from "../StorageManager";

class LocalStorageInstanceAlreadyRegisteredError extends CustomError {}
class LocalStorageInstanceNotRegisteredError extends CustomError {}

class LocalStoragePathNotFound extends CustomError {}
class JSONFileCorruptOrNonExistentError extends CustomError {}
class PathInvalidError extends CustomError {}
class CannotAddPropertyToArray extends CustomError {}
export default class LocalStorageInstanceManager {
    dataPath: PathLike;
    instances: Map<string, LocalStorageInstance> = new Map();
    StorageManager: StorageManager;
    
    constructor(StorageManager: StorageManager) {
        this.dataPath = `${StorageManager.Main.ensureCorrectCWD()}/data`;
        this.StorageManager = StorageManager;
        this.createDataDirectory();
    }

    private createDataDirectory(): LocalStorageInstanceManager {
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath);
        }
        
        return this;
    }

    private dataDirectoryPurge(): LocalStorageInstanceManager {
        if (fs.existsSync(this.dataPath)) {
            fs.rmSync(this.dataPath, { recursive: true });
        }

        return this;
    }

    createInstance(fileName: string): LocalStorageInstance {
        if (this.instances.has(fileName)) {
            throw new LocalStorageInstanceAlreadyRegisteredError(`fileName: ${fileName}`);
        } else {
            const instance = new LocalStorageInstance(this, fileName);
            this.instances.set(fileName, instance);
            return instance;
        }
    }

    removeInstance(fileName: string): LocalStorageInstanceManager {
        if (!this.instances.has(fileName)) {
            throw new LocalStorageInstanceNotRegisteredError(`fileName: ${fileName}`);
        } else {
            this.instances.get(fileName)!.purgeInstance();

            this.instances.delete(fileName);
        }
        return this;
    }
}

export type RemPath = [...path: Array<string|number>, key: string|number] | Array<string|number>
export type GetPath = [...path: Array<string|number>, key: string|number] | Array<string|number>
export type SetPath = [...path: Array<string|number>, key: string|number, value: string|number|boolean|Record<string|number,unknown>|Array<unknown>|null]|Array<string|number>

export type GetReturns = string|number|boolean|Record<string|number,unknown>|Array<unknown>|null

export class LocalStorageInstance {
    LocalManager: LocalStorageInstanceManager;
    filePath: PathLike;
    fileName: string;
    constructor(LocalManager: LocalStorageInstanceManager, fileName: string) {
        this.LocalManager = LocalManager;
        this.filePath = `${this.LocalManager.dataPath}/${fileName}.json`;
        this.fileName = fileName;

        if (!this.absolutePathExists()) {
            this.createJSONFile();
        } else {
            this.resetJSONFile();
        }
    }

    writeJSON(data: SetPath): true {
        this.write(...data);

        return true;
    }

    deleteJSON(data: RemPath, ErrorOnFail = true): true {
        this.delete(data, ErrorOnFail);

        return true;
    }

    purgeInstance(): void {
        this.purge();
    } 

    getJSON(...data: GetPath): GetReturns | undefined {
        return this.get(...data);
    }

    getJSONStrict(...data: GetPath): GetReturns {
        return this.getStrict(...data);
    }


    writeRawJSON (data: unknown): LocalStorageInstance {
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 4));

        return this;
    }

    getRawJSON(): unknown {
        try {
            return this.getFileData();
        } catch(e) {
            return undefined;
        }
    }

    createJSONFile(): LocalStorageInstance {
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, "{}");
        }
        return this;
    }

    resetJSONFile(): LocalStorageInstance {
        if (!this.absolutePathExists()) {
            this.createJSONFile();
        } else {
            fs.writeFileSync(this.filePath, "{}");
        }
        return this;
    }

    private absolutePathExists(): boolean {
        return fs.existsSync(this.filePath);
    }

    private purge(): LocalStorageInstance {
        if (this.absolutePathExists()) {
            fs.rmSync(this.filePath);
        }

        return this;
    }

    private write(...path: SetPath): LocalStorageInstance {
        //Splice the end of path into key and value
        //This just works: MDNDocs - "If array.length + start is less than 0, it will begin from index 0"
        const value = path.splice(-1)[0];
        const key = path.splice(-1)[0];

        // if (typeof(key) !== "string" && typeof(key) !== "boolean") {
        //     throw new PathInvalidError(`guildID: ${this.StorageInstance.guildID} Invalid path argument: ${key} (key) (typeof ${typeof(key)})`);
        // }
        
        // Traverse the data in layers until the end of the path is complete. Assign the value by reference
        const recursiveTraceSetter = (nextJSONLayer: Record<string | number, unknown>, remainingPathArgs: SetPath): unknown => {
            if (typeof(remainingPathArgs[0]) !== "string" && typeof(remainingPathArgs[0]) !== "number") {
                throw new PathInvalidError(`fileName: ${this.fileName} Invalid path argument: ${remainingPathArgs[0]} (typeof ${typeof(remainingPathArgs[0])})`);
            }

            //Trace the existing, JSON, whenever a property doesn't exist create it

            if (!nextJSONLayer[remainingPathArgs[0]]) { //We need to keep going so this creates an empty next layer
                nextJSONLayer[remainingPathArgs[0]] = {};
            }

            //If the current level is an array, then the object will just add the next layer as a property, which is really bad
            if (Array.isArray(nextJSONLayer[remainingPathArgs[0]])) {
                throw new CannotAddPropertyToArray(`fileName: ${this.fileName}\nLevel Name ${nextJSONLayer[remainingPathArgs[0]]}`);
            }

            if (remainingPathArgs.slice(1).length !== 0) {
                //Reference will keep the source, so we only need to pass in the next layer
                return recursiveTraceSetter((nextJSONLayer[remainingPathArgs[0]] as Record<string | number, unknown>),  (remainingPathArgs.slice(1) as SetPath));
            } else {
                const kv: Record<string|number, unknown> = {};
                kv[(key as string|number)] = value;
                Object.assign((nextJSONLayer[remainingPathArgs[0]] as Record<string|number, unknown>), kv);
                return;
            }
        };

        const data = this.getFileData();
        if (path.length > 0) {
            recursiveTraceSetter(data, path);
        } else {
            data[(key as string|number)] = value;
        }

        
        //Save the data to disk
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 4));

        return this;
    }

    private get(...path: GetPath): GetReturns | undefined {
        return this.internal_retrieve(path, false);
    }

    private getStrict(...path: GetPath): GetReturns {
        return this.internal_retrieve(path, true);
    }
    /**
     * 
     * @param path non-final key must not be an object, boolean. Providing no path returns the full JSON body
     * @param strict Throw an error on missing path rather than a console warning
     * @returns 
     */
    private internal_retrieve(path: GetPath, strict?: false): GetReturns | undefined
    private internal_retrieve(path: GetPath, strict?: true): GetReturns
    private internal_retrieve(path: GetPath, strict = false): GetReturns | undefined  {
        const finalKey = path.splice(-1)[0];

        //Traverse the data in layers until the end of the path is complete
        let currentLayer = this.getFileData();
        for (const newLevel of path) {
            //Check if we can go a layer deeper, and if not, warn the user, and return undefined
            if (!currentLayer[newLevel]) {
                if (strict) {
                    throw new LocalStoragePathNotFound(`fileName ${this.fileName}`);
                } else {
                    // console.warn("Local Storage Path Not Found!"+`\nID ${this.StorageInstance.guildID} | path: ${path}`);
                    return;
                }
            }
            //Set current layer to be one layer deeper
            currentLayer = (currentLayer[newLevel] as Record<string | number, unknown>);
        }

        if (currentLayer[finalKey]) {
            //Return the retrieved data
            return (currentLayer[finalKey] as GetReturns);
        } else {
            if (strict) {
                throw new LocalStoragePathNotFound(`fileName ${this.fileName}`);
            } else {
                return;
            }
        }
    }

    private delete(path: RemPath, strict = true): LocalStorageInstance {
        
        //Splice the end of path into key and value
        //This just works: MDNDocs - "If array.length + start is less than 0, it will begin from index 0"
        const key = path.splice(-1)[0];

        // if (!(typeof(key) === "string" || typeof(value) === "boolean")) {
        //     throw new PathInvalidError(`guildID: ${this.StorageInstance.guildID} Invalid path argument: ${key} (key) (typeof ${typeof(key)})`);
        // }
        
        //Traverse the data in layers until the end of the path is complete. Assign the value by reference
        const recursiveTraceSetter = (nextJSONLayer: Record<string | number, unknown>, remainingPathArgs: RemPath): void => {
            if (!(typeof(remainingPathArgs[0]) == "string" || typeof(remainingPathArgs[0]) === "number")) {
                throw new PathInvalidError(`fileName: ${this.fileName} Invalid path argument: ${remainingPathArgs[0]} (typeof ${typeof(remainingPathArgs[0])})`);
            }

            if (!nextJSONLayer[remainingPathArgs[0]]) { //We if we hit a non-existent path we can stop
                if (strict) {
                    throw new LocalStoragePathNotFound(`fileName: ${this.fileName}`);
                } else {
                    return undefined;
                }
            }

            if (remainingPathArgs.slice(1).length !== 0) {

                //Reference will keep the source, so we only need to pass in the next layer
                return recursiveTraceSetter((nextJSONLayer[remainingPathArgs[0]] as Record<string | number, unknown>),  (remainingPathArgs.slice(1) as GetPath));
            } else {
                delete (nextJSONLayer[remainingPathArgs[0]] as Record<string|number, unknown>)[(key as string|number)];
                return;
            }
        };

        const data = this.getFileData();
        if (path.length > 0) {
            recursiveTraceSetter(data, path);
        } else {
            delete data[key];
        }
        
        //Save the data to disk
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 4));

        return this;
    }

    private getFileData(): Record<string | number, unknown> {
        try {
            return JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
        } catch (e) {
            throw new JSONFileCorruptOrNonExistentError(`fileName ${this.fileName}`);
        }
    }
}
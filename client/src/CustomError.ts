export default class CustomError extends Error {
    extraData?: Record<string, unknown>
    constructor(message?: string, extraData?: Record<string, unknown>) {
        super(message);
        this.message = message ?? "";
        this.extraData = extraData;
    }
}
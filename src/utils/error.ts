export class BusinessError extends Error {
  private _code: number
  private _payload?: unknown

  constructor(message: string, code: number, payload?: unknown) {
    super(message)
    this._code = code
    this._payload = payload
  }

  public get code() {
    return this._code
  }

  public get payload() {
    return this._payload
  }
}
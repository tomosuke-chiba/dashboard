import '@testing-library/jest-dom'

if (!globalThis.Headers) {
  globalThis.Headers = class Headers {
    constructor(init = {}) {
      this.map = new Map(Object.entries(init))
    }

    get(name) {
      return this.map.get(name) ?? null
    }

    set(name, value) {
      this.map.set(name, String(value))
    }
  }
}

if (!globalThis.Request) {
  globalThis.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input?.url ?? ''
      this.method = init.method ?? 'GET'
      this.headers = init.headers ?? new globalThis.Headers()
      this._body = init.body
    }

    async json() {
      if (typeof this._body === 'string') {
        return JSON.parse(this._body)
      }
      return this._body
    }
  }
}

if (!globalThis.Response) {
  globalThis.Response = class Response {
    constructor(body = null, init = {}) {
      this.body = body
      this.status = init.status ?? 200
      this.headers = init.headers ?? new globalThis.Headers()
    }

    async json() {
      if (typeof this.body === 'string') {
        return JSON.parse(this.body)
      }
      return this.body
    }

    static json(body, init = {}) {
      const headers = init.headers ?? new globalThis.Headers()
      if (headers.set) {
        headers.set('content-type', 'application/json')
      }
      return new globalThis.Response(JSON.stringify(body), { ...init, headers })
    }
  }
}

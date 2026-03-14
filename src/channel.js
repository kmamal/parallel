const { Worker } = require('node:worker_threads')
const Path = require('node:path')
const { once, EventEmitter } = require('node:events')

const { Opener } = require('@kmamal/async/opener')

const workerPath = Path.join(__dirname, 'channel.worker.js')

class Channel extends EventEmitter {
	constructor () {
		super()

		this._opener = new Opener()
		this._worker = null
		this._methods = null
	}

	state () { return this._opener.state() }
	methods () { return { ...this._methods } }

	async open (path) {
		return await this._opener.open(async () => {
			this._worker = new Worker(workerPath, { workerData: path })
			const table = await once(this._worker, 'message')
			const pending = new Map()

			let _nextId = 0

			const call = async (index, args) => {
				const id = _nextId++
				this._worker.postMessage({ id, index, args })
				return await new Promise((resolve, reject) => {
					pending.set(id, { resolve, reject })
				})
			}

			this._worker.on('message', ({ id, error, result }) => {
				if (id === undefined) {
					this.emit('error', error)
					return
				}

				const { resolve, reject } = pending.get(id)
				pending.delete(id)
				if (pending.size === 0) { _nextId = 0 }
				error ? reject(error) : resolve(result)
			})

			this._methods = {}
			for (let i = 0; i < table.length; i++) {
				const name = table[i]
				const method = async (...args) => await call(i, args)
				this._methods[name] = method
			}
		})
	}

	async close () {
		return await this._opener.close(() => {
			this._worker.terminate()
			this._worker = null
			this._methods = null
		})
	}
}

module.exports = { Channel }

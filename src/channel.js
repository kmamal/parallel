const { Worker } = require('worker_threads')
const Path = require('path')
const { once, EventEmitter } = require('events')

const workerPath = Path.join(__dirname, 'channel.worker.js')

class Channel extends EventEmitter {
	static State = {
		CLOSED: 'closed',
		OPENING: 'opening',
		OPENED: 'opened',
		CLOSING: 'closing',
	}

	constructor () {
		super()

		this._state = Channel.State.CLOSED
		this._worker = null
		this._methods = null
	}

	state () { return this._state }
	methods () { return { ...this._methods } }

	async open (path) {
		if (this._state !== Channel.State.CLOSED) {
			const error = new Error('invalid state')
			error.state = this._state
			throw error
		}
		this._state = Channel.State.OPENING

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

		this._state = Channel.State.OPENED
		return this
	}

	close () {
		if (this._state !== Channel.State.OPENED) {
			const error = new Error('invalid state')
			error.state = this._state
			throw error
		}
		this._state = Channel.State.CLOSING

		this._worker.terminate()
		this._worker = null
		this._methods = null

		this._state = Channel.State.CLOSED
	}
}

module.exports = { Channel }

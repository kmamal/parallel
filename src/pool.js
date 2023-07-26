const { Channel } = require('./channel')
const { ObjectPool } = require('@kmamal/util/structs/async/object-pool')

class Pool {
	static State = {
		CLOSED: 'closed',
		OPENING: 'opening',
		OPENED: 'opened',
		CLOSING: 'closing',
	}

	constructor () {
		this._state = Pool.State.CLOSED
		this._channels = null
		this._methods = null
	}

	state () { return this._state }
	channels () { return [ ...this._channels ] }
	methods () { return { ...this._methods } }

	async open (number, path) {
		if (this._state !== Channel.State.CLOSED) {
			const error = new Error('invalid state')
			error.state = this._state
			throw error
		}
		this._state = Channel.State.OPENING

		this._channels = []
		for (let i = 0; i < number; i++) {
			this._channels.push(new Channel())
		}
		await Promise.all(this._channels.map((channel) => channel.open(path)))

		const channelPool = new ObjectPool()
		let nextId = 1
		for (const channel of this._channels) {
			channel.id = nextId++
			channelPool.release(channel)
		}

		this._methods = {}
		const channelMethods = this._channels[0].methods()
		for (const name of Object.keys(channelMethods)) {
			this._methods[name] = async (...args) => {
				const channel = await channelPool.reserve()

				let reject
				const errorPromise = new Promise((_, _reject) => { reject = _reject })
				channel.on('error', reject)

				try {
					const result = await Promise.race([
						channel.methods()[name](...args),
						errorPromise,
					])
					return result
				} finally {
					channel.off('error', reject)
					channelPool.release(channel)
				}
			}
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

		for (const channel of this._channels) {
			channel.close()
		}
		this._channels = null
		this._methods = null

		this._state = Channel.State.CLOSED
	}
}

module.exports = { Pool }

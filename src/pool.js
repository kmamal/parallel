const { Channel } = require('./channel')
const { Opener } = require('@kmamal/async/opener')
const { ObjectPool } = require('@kmamal/async/object-pool')

class Pool {
	constructor () {
		this._opener = new Opener()
		this._channels = null
		this._methods = null
	}

	state () { return this._opener.state() }
	stateTransitionFinished () { return this._opener.stateTransitionFinished() }

	channels () { return [ ...this._channels ] }
	methods () { return { ...this._methods } }

	async open (number, path) {
		return await this._opener.open(async () => {
			this._channels = []
			for (let i = 0; i < number; i++) {
				this._channels.push(new Channel())
			}
			await Promise.all(this._channels.map(async (channel) => await channel.open(path)))

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
					}
					finally {
						channel.off('error', reject)
						channelPool.release(channel)
					}
				}
			}
		})
	}

	close () {
		return this._opener.close(async () => {
			await Promise.all(this._channels.map((channel) => channel.close()))
			this._channels = null
			this._methods = null
		})
	}
}

module.exports = { Pool }

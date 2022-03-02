const RpcChannel = require('./channel')
const { ObjectPool } = require('@kmamal/util/structs/async/object-pool')

const kChannels = Symbol("channels")
const kChannelPool = Symbol("channelPool")

const open = async (number, path) => {
	const promises = []
	for (let i = 0; i < number; i++) {
		promises.push(RpcChannel.open(path))
	}
	const channels = await Promise.all(promises)

	const channelPool = new ObjectPool()
	for (const channel of channels) {
		channelPool.release(channel)
	}

	const pool = {}
	for (const name of Object.keys(channels[0])) {
		pool[name] = async (...args) => {
			const channel = await channelPool.reserve()
			return channel[name](...args)
				.finally(() => { channelPool.release(channel) })
		}
	}

	pool[kChannels] = channels
	pool[kChannelPool] = channelPool

	return pool
}

const close = (pool) => {
	for (const channel of pool[kChannels]) {
		RpcChannel.close(channel)
	}
}

module.exports = {
	open,
	close,
}

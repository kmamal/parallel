const { Worker } = require('worker_threads')
const Path = require('path')
const { once } = require('events')

const workerPath = Path.join(__dirname, 'worker.js')
const kWorker = Symbol("worker")
let _ID = 0

const open = async (path) => {
	const worker = new Worker(workerPath, { workerData: path })
	const table = await once(worker, 'message')
	const pending = new Map()

	const call = async (index, args) => {
		const id = _ID++
		worker.postMessage({ id, index, args })
		return await new Promise((resolve, reject) => {
			pending.set(id, { resolve, reject })
		})
	}

	worker.on('message', ({ id, error, result }) => {
		const { resolve, reject } = pending.get(id)
		pending.delete(id)
		if (pending.size === 0) { _ID = 0 }
		error ? reject(error) : resolve(result)
	})

	const channel = {}
	for (let i = 0; i < table.length; i++) {
		channel[table[i]] = async (...args) => await call(i, args)
	}

	channel[kWorker] = worker

	return channel
}

const close = (channel) => {
	channel[kWorker].terminate()
}

module.exports = {
	open,
	close,
}

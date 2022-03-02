const { parentPort, workerData } = require('worker_threads')

const context = require(workerData)

const table = []
const initMessage = []
for (const [ name, func ] of Object.entries(context)) {
	table.push(func)
	initMessage.push(name)
}
parentPort.postMessage(initMessage)

parentPort.on('message', async ({ id, index, args }) => {
	let error = null
	let result = null
	try {
		result = await table[index](...args)
	} catch (_error) {
		error = _error
	}
	parentPort.postMessage({ id, error, result })
})

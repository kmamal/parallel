const { parentPort, workerData: path } = require('worker_threads')

const sendError = (error) => { parentPort.postMessage({ error }) }
process.on('uncaughtException', sendError)
process.on('uncaughtRejection', sendError)

const imported = require(path)

const table = []
const initMessage = []
for (const [ name, func ] of Object.entries(imported)) {
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

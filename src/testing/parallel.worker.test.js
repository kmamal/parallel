const { setTimeout } = require('node:timers/promises')

const sleep = async (timeout) => {
	await setTimeout(timeout)
	return timeout
}

module.exports = { sleep }

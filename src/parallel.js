const { Pool } = require('./pool')
const Stream = require('stream')
const Os = require('os')

const defaultConcurrency = Math.max(2, Os.cpus().length - 1)

const parallel = (input, options) => {
	const {
		path,
		pool: userPool,
		concurrency = defaultConcurrency,
	} = options ?? {}

	const output = new Stream.PassThrough({
		readableObjectMode: true,
		writableObjectMode: true,
	})

	const poolPromise = userPool
		? Promise.resolve(userPool)
		: new Pool().open(concurrency, path)

	poolPromise.then((pool) => {
		const cleanup = () => {
			if (!userPool) { pool.close() }
		}

		let count = 0

		input
			.on('error', (_error) => {
				const error = new Error('input error')
				error.error = _error
				output.destroy(error)
				cleanup()
			})
			.on('data', async (request) => {
				const response = { request }

				if (++count === concurrency) { input.pause() }

				try {
					const [ name, ...args ] = request
					const methods = pool.methods()
					response.result = await methods[name](...args)
				} catch (error) {
					response.error = error
				}
				output.write(response)

				if (count-- === concurrency) { input.resume() }

				if (count === 0 && input.readableEnded) {
					output.end()
					cleanup()
				}
			})
			.on('end', () => {
				if (count === 0) {
					output.end()
					cleanup()
				}
			})
			.resume()
	})

	return output
}

module.exports = { parallel }

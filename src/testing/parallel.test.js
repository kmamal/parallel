const { test } = require('@kmamal/testing')

const { parallel } = require('../stream')
const Stream = require('node:stream')
const Path = require('node:path')

test("parallel", async (t) => {
	t.expect(1)
	t.timeout(1000)

	const input = Stream.Readable.from([
		[ 'sleep', 100 ],
		[ 'sleep', 200 ],
	])

	const path = Path.join(__dirname, 'parallel.worker.test.js')

	const output = await parallel(input, { path })

	const result = []
	for await (const x of output) {
		result.push(x)
	}

	t.equal(result, [
		{ request: [ 'sleep', 100 ], result: 100 },
		{ request: [ 'sleep', 200 ], result: 200 },
	])
})

const { test } = require('@kmamal/testing')
const { Pool } = require('../pool')
const Path = require('node:path')

test("pool", async (t) => {
	t.expect(1)
	t.timeout(1000)

	const pool = new Pool()
	await pool.open({
		path: Path.join(__dirname, 'parallel.worker.test.js'),
		count: 2,
	})

	const input = [ 200, 100 ]
	const output = []

	await Promise.all(input.map(async (timeout) => {
		const result = await pool.methods().sleep(timeout)
		output.push({ timeout, result })
	}))

	t.equal(output, [
		{ timeout: 100, result: 100 },
		{ timeout: 200, result: 200 },
	])

	await pool.close()
})

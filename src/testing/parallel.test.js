const { parallel } = require('..')
const Stream = require('stream')
const Path = require('path')

const input = Stream.Readable.from([
	[ 'run' ],
	[ 'run' ],
])

const path = Path.join(__dirname, 'parallel.worker.test.js')
const output = parallel(input, { path })

;(async () => {
	for await (const x of output) {
		console.log(x)
	}
})()

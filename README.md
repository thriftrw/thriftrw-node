# thriftrw

<!--
    [![build status][build-png]][build]
    [![Coverage Status][cover-png]][cover]
    [![Davis Dependency status][dep-png]][dep]
-->

<!-- [![NPM][npm-png]][npm] -->

thrift encoding/decoding using bufrw

## Example

```js
var thriftrw = require("thriftrw");
var bufrw = require('bufrw');

var struct = new thriftrw.TStruct();
struct.fields.push(
    new thriftrw.TField(thriftrw.TYPE.STRING, 1, new Buffer('hello')
);

var buf = bufrw.toBuffer(thriftrw.TStructRW, struct);
console.log('created a binary buffer of thrift encoded struct', buf);

var struct2 = bufrw.fromBuffer(thriftrw.TStructRW, buf);
console.log('created a TStruct from a binary buffer', struct2);
```

## Installation

`npm install thriftrw`

## Tests

`npm test`

## NPM scripts

 - `npm run add-licence` This will add the licence headers.
 - `npm run cover` This runs the tests with code coverage
 - `npm run lint` This will run the linter on your code
 - `npm test` This will run the tests.
 - `npm run trace` This will run your tests in tracing mode.
 - `npm run travis` This is run by travis.CI to run your tests
 - `npm run view-cover` This will show code coverage in a browser

## Contributors

 - Lei Zhao

## MIT Licenced

  [build-png]: https://secure.travis-ci.org/uber/thriftrw.png
  [build]: https://travis-ci.org/uber/thriftrw
  [cover-png]: https://coveralls.io/repos/uber/thriftrw/badge.png
  [cover]: https://coveralls.io/r/uber/thriftrw
  [dep-png]: https://david-dm.org/uber/thriftrw.png
  [dep]: https://david-dm.org/uber/thriftrw
  [test-png]: https://ci.testling.com/uber/thriftrw.png
  [tes]: https://ci.testling.com/uber/thriftrw
  [npm-png]: https://nodei.co/npm/thriftrw.png?stars&downloads
  [npm]: https://nodei.co/npm/thriftrw

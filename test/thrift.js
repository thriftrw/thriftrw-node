// Copyright (c) 2019 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/* global Buffer */
/* eslint-disable max-len */
'use strict';

module.exports = function(loadThrift) {

    var fs = require('fs');
    var path = require('path');
    var test = require('tape');

    var allowFilesystemAccess = !process.browser;
    var idls;
    if (process.browser) {
        idls = global.idls;
    }

    test('thrift must be passed options', function t(assert) {
        loadThrift(null, function (err, thrift) {
            assert.throws(
                function throws() { throw err; },
                /options required/,
                'throws on missing options'
            );
            assert.end();
        });
    });

    test('thrift options must be an object', function t(assert) {
        loadThrift('not-an-object', function (err, thrift) {
            assert.throws(
                function throws() { throw err; },
                /options must be object/,
                'throws on options not an object'
            );
            assert.end();
        });
    });

    test('Thrift.load : options.fs.readFile required', function t(assert) {
        var Thrift = require('../thrift').Thrift;
        Thrift.load({}, function (err, thrift) {
            assert.throws(
                function throws() { throw err; },
                /options.fs.readFile required/,
                'throws when calling Thrift.load without options.fs.readFile'
            );
            assert.end();
        });
    });

    test('thrift expects the source to be a string', function t(assert) {
        loadThrift({source: 42}, function (err, thrift) {
            assert.throws(
                function throws() { throw err; },
                /source must be string/,
                'throws when source is not a string'
            );
            assert.end();
        });
    });

    test('thrift parses from source', function t(assert) {
        var source = fs.readFileSync(path.join(__dirname, 'thrift.thrift'), 'ascii');
        loadThrift({source: source}, function (err, thrift) {
            assert.equal(
                thrift.getSources().entryPoint,
                'service.thrift',
                'Correct default entryPoint value when no includes'
            );
            assert.pass('thrift parses');
            assert.end();
        });
    });

    test('thrift parses from entryPoint', function t(assert) {
        var filename = path.join(__dirname, 'thrift.thrift');
        loadThrift({
            entryPoint: filename,
            allowFilesystemAccess: allowFilesystemAccess,
            idls: idls
        }, function (err, thrift) {
            assert.equal(
                thrift.getSources().entryPoint,
                'thrift.thrift',
                'Correct default entryPoint value when no includes'
            );
            assert.pass('thrift parses');
            assert.end();
        });
    });

    test('thrift parses from idls', function t(assert) {
        var source = fs.readFileSync(path.join(__dirname, 'thrift.thrift'), 'ascii');
        loadThrift({idls: {'service.thrift': source}, entryPoint: 'service.thrift'}, function (err, thrift) {
            assert.equal(
                thrift.getSources().entryPoint,
                'service.thrift',
                'Correct default entryPoint value when no includes'
            );
            assert.pass('thrift parses');
            assert.end();
        });
    })

    test('can get type result from thrift', function t(assert) {
        var source = fs.readFileSync(path.join(__dirname, 'thrift.thrift'), 'ascii');
        loadThrift({source: source}, function (err, thrift) {
            var res = thrift.getTypeResult('Struct');
            if (res.err) return assert.end(res.err);
            assert.ok(res.value, 'got struct');
            assert.end();
        });
    });

    test('can get type from thrift', function t(assert) {
        var source = fs.readFileSync(path.join(__dirname, 'thrift.thrift'), 'ascii');
        loadThrift({source: source}, function (err, thrift) {
            var Struct = thrift.getType('Struct');
            assert.ok(Struct, 'got struct');
            assert.end();
        });
    });

    test('can read struct from buffer', function t(assert) {
        var source = fs.readFileSync(path.join(__dirname, 'thrift.thrift'), 'ascii');
        loadThrift({source: source}, function (err, thrift) {
            var struct = thrift.Struct.fromBuffer(new Buffer([
                0x08, // typeid:1 -- 8, i32
                0x00, 0x01, // id:2 -- 1, "number"
                0x00, 0x00, 0x00, 0x0a, // number:4 -- 10
                0x00 // typeid:1 -- 0, stop
            ]));
            assert.ok(struct instanceof thrift.Struct, 'struct instanceof Strict');
            assert.deepEqual(struct, new thrift.Struct({number: 10}), 'struct properties read properly');
            assert.end();
        });
    });

    test('can read struct result from buffer', function t(assert) {
        var source = fs.readFileSync(path.join(__dirname, 'thrift.thrift'), 'ascii');
        loadThrift({source: source}, function (err, thrift) {
            var result = thrift.Struct.fromBufferResult(new Buffer([
                0x08, // typeid:1 -- 8, i32
                0x00, 0x01, // id:2 -- 1, "number"
                0x00, 0x00, 0x00, 0x0a, // number:4 -- 10
                0x00 // typeid:1 -- 0, stop
            ]));
            assert.ok(result.value instanceof thrift.Struct, 'struct instanceof Strict');
            assert.deepEqual(result.value, new thrift.Struct({number: 10}), 'struct properties read properly');
            assert.end();
        });
    });

    test('can write struct to buffer', function t(assert) {
        var source = fs.readFileSync(path.join(__dirname, 'thrift.thrift'), 'ascii');
        loadThrift({source: source}, function (err, thrift) {
            var buffer = thrift.Struct.toBuffer(new thrift.Struct({number: 10}));
            assert.deepEqual(buffer, new Buffer([
                0x08, // typeid:1 -- 8, i32
                0x00, 0x01, // id:2 -- 1, "number"
                0x00, 0x00, 0x00, 0x0a, // number:4 -- 10
                0x00 // typeid:1 -- 0, stop
            ]));
            assert.end();
        });
    });

    test('can write struct to buffer', function t(assert) {
        var source = fs.readFileSync(path.join(__dirname, 'thrift.thrift'), 'ascii');
        loadThrift({source: source}, function (err, thrift) {
            var result = thrift.Struct.toBufferResult(new thrift.Struct({number: 10}));
            assert.deepEqual(result.value, new Buffer([
                0x08, // typeid:1 -- 8, i32
                0x00, 0x01, // id:2 -- 1, "number"
                0x00, 0x00, 0x00, 0x0a, // number:4 -- 10
                0x00 // typeid:1 -- 0, stop
            ]));
            assert.end();
        });
    });

    test('can get type error result from thrift', function t(assert) {
        var source = fs.readFileSync(path.join(__dirname, 'thrift.thrift'), 'ascii');
        loadThrift({source: source}, function (err, thrift) {
            var res = thrift.getTypeResult('Bogus');
            assert.ok(res.err, 'got error');
            if (!res.err) return assert.end();
            /* eslint-disable max-len */
            assert.equal(res.err.message, 'type Bogus not found. Make sure that the service name matches a service in the thrift file and that the method name is nested under that service.');
            /* eslint-enable max-len */
            assert.end();
        });
    });

    test('can get type error from thrift', function t(assert) {
        var source = fs.readFileSync(path.join(__dirname, 'thrift.thrift'), 'ascii');
        loadThrift({source: source}, function (err, thrift) {
            assert.throws(
                function throws() { thrift.getType('Bogus'); },
                /* eslint-disable max-len */
                /type Bogus not found. Make sure that the service name matches a service in the thrift file and that the method name is nested under that service./,
                /* eslint-enable max-len */
                'getType fails when type not found'
            );
            assert.end();
        });
    });

    test('reference error in thrift', function t(assert) {
        var source = fs.readFileSync(path.join(__dirname, 'reference-error.thrift'), 'ascii');
        loadThrift({source: source}, function (err, thrift) {
            assert.throws(
                function throws() { throw err; },
                /cannot resolve reference to Struct at 3:19/,
                'Thrift fails with a struct reference error'
            );
            assert.end();
        });
    });

    test('duplicate reference in thrift', function t(assert) {
        var source = fs.readFileSync(path.join(__dirname, 'duplicate-error.thrift'), 'ascii');
        loadThrift({source: source}, function (err, thrift) {
            assert.throws(
                function throws() { throw err; },
                /duplicate reference to Service at 4:9/,
                'Thrift fails with a double service reference'
            );
            assert.end();
        });
    });

    test('get endpoints single service', function t(assert) {
        var opts;
        if (process.browser) {
            opts = {
                source: fs.readFileSync(path.join(__dirname, 'thrift.thrift'), 'ascii')
            };
        } else {
            opts = {
                entryPoint: path.join(__dirname, 'thrift.thrift'),
                allowFilesystemAccess: true
            };
        }
        loadThrift(opts, function (err, thrift) {
            assert.deepEqual(
                thrift.getServiceEndpoints(),
                ['Service::foo'],
                'Correct endpoints from single service'
            );
            assert.end();
        });
    });

    test('get endpoints multi service', function t(assert) {
        var opts;
        if (process.browser) {
            opts = {
                source: fs.readFileSync(path.join(__dirname, 'thrift', 'MultiService.thrift'), 'ascii')
            };
        } else {
            opts = {
                entryPoint: path.join(__dirname, 'thrift', 'MultiService.thrift'),
                allowFilesystemAccess: true
            };
        }
        loadThrift(opts, function (err, thrift) {
            assert.deepEqual(
                thrift.getServiceEndpoints(),
                ['Weatherwax::headology', 'Weatherwax::wossname', 'Ogg::voodoo'],
                'Correct endpoints from multiple services'
            );
            assert.end();
        });
    });

    test('respects default as undefined', function t(assert) {
        var opts;
        if (process.browser) {
            opts = {
                source: fs.readFileSync(path.join(__dirname, 'thrift', 'MultiService.thrift'), 'ascii'),
                defaultAsUndefined: true
            };
        } else {
            opts = {
                entryPoint: path.join(__dirname, 'thrift', 'MultiService.thrift'),
                allowFilesystemAccess: true,
                defaultAsUndefined: true
            };
        }
        loadThrift(opts, function (err, thrift) {
            var valueDefinition = thrift.defaultValueDefinition;
            assert.true(
                valueDefinition.type === 'Literal',
                'Correct value definition type'
            );
            assert.true(
                valueDefinition.value === undefined,
                'Correct value definition value'
            );
            assert.end();
        });
    });

    test('defaults to null default value', function t(assert) {
        var opts;
        if (process.browser) {
            opts = {
                source: fs.readFileSync(path.join(__dirname, 'thrift', 'MultiService.thrift'), 'ascii')
            };
        } else {
            opts = {
                entryPoint: path.join(__dirname, 'thrift', 'MultiService.thrift'),
                allowFilesystemAccess: true
            };
        }
        loadThrift(opts, function (err, thrift) {
            var valueDefinition = thrift.defaultValueDefinition;
            assert.true(
                valueDefinition.type === 'Literal',
                'Correct value definition type'
            );
            assert.true(
                valueDefinition.value === null,
                'Correct value definition value'
            );
            assert.end();
        });
    });

    test('get endpoints multi service target', function t(assert) {
        var opts;
        if (process.browser) {
            opts = {
                source: fs.readFileSync(path.join(__dirname, 'thrift', 'MultiService.thrift'), 'ascii')
            };
        } else {
            opts = {
                entryPoint: path.join(__dirname, 'thrift', 'MultiService.thrift'),
                allowFilesystemAccess: true
            };
        }
        loadThrift(opts, function (err, thrift) {
            assert.deepEqual(
                thrift.getServiceEndpoints('Ogg'),
                ['Ogg::voodoo'],
                'Correct endpoints from multiple services'
            );
            assert.end();
        });
    });

    test('get endpoints multi service bad target', function t(assert) {
        var opts;
        if (process.browser) {
            opts = {
                source: fs.readFileSync(path.join(__dirname, 'thrift', 'MultiService.thrift'), 'ascii')
            };
        } else {
            opts = {
                entryPoint: path.join(__dirname, 'thrift', 'MultiService.thrift'),
                allowFilesystemAccess: true
            };
        }
        loadThrift(opts, function (err, thrift) {
            assert.deepEqual(
                thrift.getServiceEndpoints('Magrat'),
                [],
                'Correct empty endpoints list'
            );
            assert.end();
        });
    });
}

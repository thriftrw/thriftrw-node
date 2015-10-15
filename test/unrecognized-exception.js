// Copyright (c) 2015 Uber Technologies, Inc.
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

'use strict';

var test = require('tape');
var fs = require('fs');
var path = require('path');
var Thrift = require('../thrift').Thrift;
var ThriftUnrecognizedException = require('../unrecognized-exception')
    .ThriftUnrecognizedException;

var sourceV1 = fs.readFileSync(path.join(__dirname, 'unrecognized-exception-v1.thrift'), 'ascii');
var sourceV2 = fs.readFileSync(path.join(__dirname, 'unrecognized-exception-v2.thrift'), 'ascii');
var thriftV1 = new Thrift({source: sourceV1});
var thriftV2 = new Thrift({source: sourceV2});

test('Exception RW', function t(assert) {

    var err = new Error('Bogus name: Voldemort');
    err.name = 'ThriftException';
    err.bogusName = 'Voldemort';

    var v2Result = new thriftV2.BogusService.bogus.result.Constructor({
        bogusName: err
    });

    var v2Buf = thriftV2.BogusService.bogus.result.toBuffer(v2Result);

    var v1Result = thriftV1.BogusService.bogus.result.fromBuffer(v2Buf);

    assert.deepEqual(v1Result, {
        success: null,
        failure: new ThriftUnrecognizedException({
            1: 'Voldemort',
            2: 'Bogus name: Voldemort'
        })
    });
    assert.end();
});

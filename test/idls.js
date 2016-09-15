// Copyright (c) 2016 Uber Technologies, Inc.
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
var IDL = require('./thrift-idl');

test('can round trip a thrift file through sources', function t(assert) {

    var thrift = new Thrift({
        entryPoint: path.join(__dirname, 'include-cyclic-a.thrift'),
        fs: fs,
        allowFsAccess: true,
        allowIncludeAlias: true
    });

    var sources = thrift.getSources();
    var rethrift = new Thrift({
        entryPoint: sources.entryPoint,
        idls: sources.idls,
        allowIncludeAlias: true
    });

    assert.deepEquals(Object.keys(rethrift.models), Object.keys(thrift.models), 'all models survive round trip');

    assert.end();
});

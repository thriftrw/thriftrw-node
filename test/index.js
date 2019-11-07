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

'use strict';

var Thrift = require('../thrift').Thrift;
var fs = require('fs');
var path = require('path');

var testFiles = [
    require('./binary'),
    require('./boolean'),
    require('./double'),
    require('./i8'),
    require('./i16'),
    require('./i32'),
    require('./i64'),
    require('./map-entries'),
    require('./thrift-idl'),
    require('./map-object'),
    require('./string'),
    require('./tlist'),
    require('./tmap'),
    require('./tstruct'),
    require('./void'),
    require('./skip'),
    require('./struct'),
    require('./struct-skip'),
    require('./recursion'),
    require('./exception'),
    require('./union'),
    require('./service'),
    require('./thrift'),
    require('./list'),
    require('./set'),
    require('./map'),
    require('./typedef'),
    require('./const'),
    require('./default'),
    require('./enum'),
    require('./unrecognized-exception'),
    require('./include.js'),
    require('./type-mismatch'),
    require('./lcp'),
    require('./idls'),
    require('./asts'),
    require('./message'),
    require('./async-each')
]

function asyncLoad(filename, cb) {
    var error;
    var source;
    if (process.browser) {
        source = global.idls[filename];
        if (!source) {
            error = Error(filename + ': missing file');
        }
    } else {
        try {
            source = fs.readFileSync(path.resolve(filename), 'ascii');
        } catch (err) {
            error = err;
        }
    }
    setTimeout(function () { cb(error, source); }, 10);
}

function loadNotExpected(_, cb) {
    cb(Error('Thrift must be constructed with a load function'))
}

function loadThriftAsync(options, cb) {
    var load = loadNotExpected;
    if (options && (options.allowFilesystemAccess || options.fs)) {
        load = asyncLoad;
    }
    if (options) {
        delete options.allowFilesystemAccess;
    }
    Thrift.load(options, load, cb);
}

function loadThriftSync(options, cb) {
    var thrift;
    var error;
    try {
        thrift = new Thrift(options);
    } catch (err) {
        error = err;
    }
    cb(error, thrift);
}

// Run two passes: one with synchronous source loading, one with asynchronous loading.

testFiles.forEach(function (testFile) {
    testFile(loadThriftSync);
});

testFiles.forEach(function (testFile) {
    testFile(loadThriftAsync);
});

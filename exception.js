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

var inherits = require('util').inherits;
var ThriftStruct = require('./struct').ThriftStruct;

function ThriftException(spec) {
    var self = this;
    ThriftStruct.call(self);
    self.type = null;
    self.message = null;
}

inherits(ThriftException, ThriftStruct);

ThriftException.prototype.compile = function compile(def, thrift) {
    var self = this;
    ThriftStruct.prototype.compile.call(self, def);
};

ThriftException.prototype.create = function create() {
    var self = this;
    var error = new Error('');

    error.name = 'ThriftException';

    self.Constructor.call(error);

    return error;
};

ThriftException.prototype.set = function set(error, key, value) {
    if (key === 'type') {
        // Re-define writable to work around v8ism
        Object.defineProperty(error, 'type', {
            value: value,
            enumerable: true,
            writable: true,
            configurable: true
        });
    }

    error[key] = value;
};

module.exports.ThriftException = ThriftException;

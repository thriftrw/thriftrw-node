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


var ThriftService = require('./service').ThriftService;

function ThriftClass(options) {
    var self = this;

    self.type = new ThriftClassType(options);
    self.service = new ThriftClassService(options);
}

function ThriftClassService(options) {
}

ThriftClassService.prototype.compile = function compile(def, thrift) {
};

function ThriftClassType(options) {
    var self = this;
    self.rw = new ClassRW(self);
}

ThriftClassType.prototype.compile = function compile(def, thrift) {
};

// typeid:1 -- 8, STRUCT
//   typeid:1 -- 11, STRING
//   fieldid:2 -- 1, uuid
//   uuid:16 -- uuid
//   typeid:1 -- 11, STRING
//   fieldid:2 -- 1, className
//   length:4 -- className.length
//   className~length -- className
//   typeid:1 -- 0, STOP

function ClassRW(type) {
}

ClassRW.prototype.byteLength = function byteLength() {
};

ClassRW.prototype.writeInto = function writeInto() {
};

ClassRW.prototype.readFrom = function readFrom() {
};

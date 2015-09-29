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

var util = require('util');
var TYPE = require('./TYPE');
var StringRW = require('./string').StringRW;
var ThriftService = require('./service').ThriftService;
var ReadResult = require('bufrw').ReadResult;

function ThriftClass(args) {
    var self = this;
    ThriftService.call(self, args);
    self.Constructor = null;
    self.rw = new ClassRW(self);
}

util.inherits(ThriftClass, ThriftService);

ThriftClass.prototype.typeid = TYPE.STRING;

ThriftClass.prototype.compile = function compile(def, thrift) {
    var self = this;
    ThriftService.prototype.compile.call(self, def.toService(), thrift);

    // TODO respond to annotations for transport headers
    // TODO respond to oneway for transport header
    // TODO track ttl annotation for handler

    // Add methods to prototype of constructor
    var Constructor = self.surface;
    var methodNames = Object.keys(self.functionsByName);
    for (var index = 0; index < methodNames.length; index++) {
        Constructor.prototype[methodNames[index]] =
            self.createMethod(methodNames[index]);
    }
    Constructor.rw = self.rw;
    self.Constructor = Constructor;
};

ThriftClass.prototype.createSurface = function createSurface() {
    var self = this;
    var Constructor = self.createConstructor();
    Constructor.prototype.serviceName = self.name;
    Constructor.prototype.handler = self.handler;
    return Constructor;
};

ThriftClass.prototype.createConstructor = function createConstructor() {
    var self = this;
    var source = '';
    source += '(function thriftrw_' + self.name + '(id) {\n';
    source += '    this.id = id;\n';
    source += '})\n';
    // eval is an operator that captures the lexical scope of the calling
    // function and deoptimizes the lexical scope.
    // By using eval in an expression context, it loses this second-class
    // capability and becomes a first-class function.
    // (0, eval) is one way to use eval in an expression context.
    return (0, eval)(source);
};

ThriftClass.prototype.createMethod = function createMethod(functionName) {
    var self = this;
    var source = '';
    source += '(function thriftrw_' + functionName + '(args, headers, callback) {\n';
    source += 'var request = new this.handler.Request();\n';
    source += 'request.serviceName = ' + JSON.stringify(self.name) + ';\n';
    source += 'request.functionName = ' + JSON.stringify(functionName) + ';\n';
    source += 'request.fullName = ' + JSON.stringify(self.name + '::' + functionName) + ';\n';
    source += 'request.args = args;\n';
    // Inject implicit this arg
    source += 'request.args.this = this;\n';
    source += 'request.headers = headers;\n';
    // TODO oneway, retry, setry, etc
    source += 'return this.handler.handleRequest(request, callback);\n';
    source += '})\n';
    // eval is an operator that captures the lexical scope of the calling
    // function and deoptimizes the lexical scope.
    // By using eval in an expression context, it loses this second-class
    // capability and becomes a first-class function.
    // (0, eval) is one way to use eval in an expression context.
    return (0, eval)(source);
};

function ClassRW(type) {
    var self = this;
    self.type = type;
}

ClassRW.prototype.byteLength = function byteLength(instance) {
    return StringRW.byteLength(instance.id);
};

ClassRW.prototype.writeInto = function writeInto(instance, buffer, offset) {
    return StringRW.writeInto(instance.id, buffer, offset);
};

ClassRW.prototype.readFrom = function readFrom(buffer, offset) {
    var self = this;
    var result;
    result = StringRW.readFrom(buffer, offset);
    // istanbul ignore if
    if (result.err) {
        return result;
    }
    offset = result.offset;
    var id = result.value;
    var instance = new self.type.Constructor(id);
    return new ReadResult(null, offset, instance);
};

module.exports.ThriftClass = ThriftClass;
module.exports.ClassRW = ClassRW;

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

var assert = require('assert');
var inherits = require('util').inherits;
var TypedError = require('error/typed');
var StructSpec = require('./struct').StructSpec;

function ExceptionSpec() {
    var self = this;
    StructSpec.call(self);
    self.type = null;
    self.message = null;
}

inherits(ExceptionSpec, StructSpec);

ExceptionSpec.prototype.compile = function compile(def) {
    var self = this;
    StructSpec.prototype.compile.call(self, def);
    assert(def.annotations,
        'annotations required for exception: ' + self.name);
    assert(def.annotations.type,
        'exceptions must have a type annotation: ' + self.name);
    assert(typeof def.annotations.type === 'string',
        'type annotation must be a string: ' + self.name);
    assert(typeof def.annotations.message === 'string',
        'message annotation must be a string: ' + self.name);
    self.type = def.annotations.type;
    self.message = def.annotations.message;
};

ExceptionSpec.prototype.createConstructor =
function createConstructor(name, fieldNames) {
    var self = this;
    var declaration = {
        type: self.type,
        message: self.message
    };
    for (var index = 0; index < fieldNames.length; index++) {
        var fieldName = fieldNames[index];
        declaration[fieldName] = null;
    }
    return TypedError(declaration);
};

ExceptionSpec.prototype.create = function create() {
    return {};
};

ExceptionSpec.prototype.finalize = function finalize(struct) {
    var self = this;
    return self.Constructor(struct);
};

module.exports.ExceptionSpec = ExceptionSpec;

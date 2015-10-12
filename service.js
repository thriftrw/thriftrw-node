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

var ast = require('./ast');
var ThriftStruct = require('./struct').ThriftStruct;

function ThriftFunction(args) {
    var self = this;
    self.name = args.name;
    self.service = args.service;
    self.fullName = self.service.name + '::' + self.name;
    self.spec = args.spec;
    self.args = null;
    self.result = null;
    self.strict = args.strict;
}

ThriftFunction.prototype.compile = function process(def, spec) {
    var self = this;

    self.name = def.id.name;

    self.args = new ThriftStruct({strict: self.strict});
    var argsId = new ast.Identifier(self.name + '_args');
    argsId.as = self.fullName + '_args';
    var argsStruct = new ast.Struct(argsId, def.fields);
    argsStruct.isArgument = true;
    self.args = spec.compileStruct(argsStruct);
    self.Arguments = self.args.Constructor;

    var returnType = def.returns;
    var resultFields = def.throws || [];
    if (returnType.type !== 'BaseType' || returnType.baseType !== 'void') {
        var successFieldId = new ast.FieldIdentifier(0);
        var successField = new ast.Field(successFieldId, def.returns, 'success');
        successField.required = false;
        successField.optional = true;
        successField.isResult = true;
        resultFields.unshift(successField);
    }

    var resultId = new ast.Identifier(self.name + '_result');
    resultId.as = self.fullName + '_result';
    var resultStruct = new ast.Struct(resultId, resultFields);
    resultStruct.isResult = true;
    self.result = spec.compileStruct(resultStruct);
    self.Result = self.result.Constructor;

    self.annotations = def.annotations;
    self.oneway = def.oneway;
};

ThriftFunction.prototype.link = function link(spec) {
    var self = this;
    self.args.link(spec);
    self.result.link(spec);
};

function ThriftService(args) {
    var self = this;
    self.name = null;
    self.functions = [];
    self.functionsByName = Object.create(null);
    self.surface = self.functionsByName;
    self.strict = args.strict;
}

ThriftService.prototype.compile = function process(def, spec) {
    var self = this;
    self.name = def.id.name;
    for (var index = 0; index < def.functions.length; index++) {
        self.compileFunction(def.functions[index], spec);
    }
};

ThriftService.prototype.compileFunction = function processFunction(def, spec) {
    var self = this;
    var thriftFunction = new ThriftFunction({
        name: def.id.name,
        service: self,
        strict: self.strict
    });
    thriftFunction.compile(def, spec);
    self.functions.push(thriftFunction);
    self.functionsByName[thriftFunction.name] = thriftFunction;
};

ThriftService.prototype.link = function link(spec) {
    var self = this;
    for (var index = 0; index < self.functions.length; index++) {
        self.functions[index].link(spec);
    }
    return self;
};

module.exports.ThriftFunction = ThriftFunction;
module.exports.ThriftService = ThriftService;

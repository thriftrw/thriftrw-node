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

var StructSpec = require('./struct').StructSpec;

function FunctionSpec(args) {
    var self = this;
    self.name = args.name;
    self.service = args.service;
    self.fullName = self.service.name + '::' + self.name;
    self.spec = args.spec;
    self.args = null;
    self.result = null;
    self.strict = args.strict;
}

FunctionSpec.prototype.compile = function process(def, spec) {
    var self = this;

    self.name = def.id.name;

    self.args = new StructSpec({strict: self.strict});
    self.args = spec.compileStruct({
        id: {name: self.name + '_args', as: self.fullName + '_args'},
        fields: def.fields
    });

    var resultFields = def.throws || [];
    resultFields.unshift({ // TODO use Field constructor from pegjs...somehow
        id: 0,
        name: 'success',
        valueType: def.returns,
        required: true,
        optional: false,
        annotations: null
    });

    self.result = spec.compileStruct({
        id: {name: self.name + '_result', as: self.fullName + '_result'},
        fields: resultFields
    });
};

FunctionSpec.prototype.link = function link(spec) {
    var self = this;
    self.args.link(spec);
    self.result.link(spec);
};

function ServiceSpec(args) {
    var self = this;
    self.name = null;
    self.functions = [];
    self.strict = args.strict;
}

ServiceSpec.prototype.compile = function process(def, spec) {
    var self = this;
    self.name = def.id.name;
    for (var index = 0; index < def.functions.length; index++) {
        self.compileFunction(def.functions[index], spec);
    }
};

ServiceSpec.prototype.compileFunction = function processFunction(def, spec) {
    var self = this;
    var functionSpec = new FunctionSpec({
        name: def.id.name,
        service: self,
        strict: self.strict
    });
    functionSpec.compile(def, spec);
    self.functions.push(functionSpec);
};

ServiceSpec.prototype.link = function link(spec) {
    var self = this;
    for (var index = 0; index < self.functions.length; index++) {
        self.functions[index].link(spec);
    }
};

module.exports.FunctionSpec = FunctionSpec;
module.exports.ServiceSpec = ServiceSpec;

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

/* eslint max-statements:[1, 30] */
'use strict';

var assert = require('assert');
var util = require('util');
var fs = require('fs');
var path = require('path');
var idl = require('./thrift-idl');
var Result = require('bufrw/result');

var ThriftService = require('./service').ThriftService;
var ThriftStruct = require('./struct').ThriftStruct;
var ThriftUnion = require('./union').ThriftUnion;
var ThriftEnum = require('./enum').ThriftEnum;

var ThriftVoid = require('./void').ThriftVoid;
var ThriftBoolean = require('./boolean').ThriftBoolean;
var ThriftString = require('./string').ThriftString;
var ThriftBinary = require('./binary').ThriftBinary;
var ThriftByte = require('./byte').ThriftByte;
var ThriftI16 = require('./i16').ThriftI16;
var ThriftI32 = require('./i32').ThriftI32;
var ThriftI64 = require('./i64').ThriftI64;
var ThriftDouble = require('./double').ThriftDouble;
var ThriftList = require('./list').ThriftList;
var ThriftSet = require('./set').ThriftSet;
var ThriftMap = require('./map').ThriftMap;
var ThriftConst = require('./const').ThriftConst;
var ThriftTypedef = require('./typedef').ThriftTypedef;

var validThriftIdentifierRE = /^[a-zA-Z_][a-zA-Z0-9_\.]+$/;

var DEFAULT_ENTRY_POINT = 'default.thrift';

function Thrift(options) {
    var self = this;

    assert(options, 'options required');
    assert(typeof options === 'object', 'options must be object');

    // Set options first
    self.thrifts = options.thrifts || Object.create(null);
    self.thriftPath = options.thriftPath || '';
    self.strict = options.strict !== undefined ?
        options.strict : true;
    self.allowIncludeAlias = options.allowIncludeAlias !== undefined ?
        options.allowIncludeAlias : false;
    self.allowDiskAccess = options.allowDiskAccess !== undefined ?
        options.allowDiskAccess : false;

    if (options.entryPoint) {
        assert(typeof options.entryPoint === 'string',
            'options.entryPoint must be a string');
        self.entryPoint = options.entryPoint;
    } else {
        self.entryPoint = DEFAULT_ENTRY_POINT;
    }

    // memoize this Thrift instance
    self.thrifts[self.entryPoint] = self;

    if (options.idls) {
        assert(typeof options.idls === 'object',
            'options.idls must be object');
        self.idls = options.idls;
    } else {
        self.idls = Object.create(null);
    }

    // options.source is legacy mode. should be deprecated.
    // istanbul ignore else
    if (options.source) {
        assert(typeof options.source === 'string',
            'options.source must be string');
        self.idls[self.entryPoint] = options.source;
    } else if (self.allowDiskAccess) {
        self.idls[self.entryPoint] = fs.readFileSync(
            path.join(self.thriftPath, self.entryPoint),
            'ascii'
        );
    }

    // [name] :Thrift* implementing {compile, link, &c}
    // Heterogenous Thrift model objects by name in a consolidated name-space
    // to prevent duplicate references with the same and different types, like
    // a service and a struct with the same name in the scope of a Thrift IDL
    // module:
    self.models = Object.create(null);
    // [serviceName][functionName] :{rw, Arguments, Result}
    self.services = Object.create(null);
    // [constName] :Value
    self.consts = Object.create(null);
    // [enumName][name] :String
    self.enums = Object.create(null);
    // [structName] :Constructor
    self.structs = Object.create(null);
    // [exceptionName] :Constructor
    self.exceptions = Object.create(null);
    // [unionName] :Constructor
    self.unions = Object.create(null);
    // [typedefName] :Constructor (might be Array, Object, or Number)
    self.typedefs = Object.create(null);
    // [moduleName] :Thrift
    // Child modules indexed by their local alias.
    self.modules = Object.create(null);

    self.surface = self;

    self.linked = false;

    self.compile();

    if (options.source) {
        self.link();
    }
}

Thrift.loadSync = function loadSync(options) {
    var thrift = new Thrift(options);
    thrift.link();
    return thrift;
};

Thrift.prototype.models = 'module';

Thrift.prototype.getType = function getType(name) {
    var self = this;
    return self.getTypeResult(name).toValue();
};

Thrift.prototype.getTypeResult = function getType(name) {
    var self = this;
    var model = self.models[name];
    if (!model || model.models !== 'type') {
        return new Result(new Error(util.format('type %s not found', name)));
    }
    return new Result(null, model.link(self));
};

Thrift.prototype.baseTypes = {
    void: ThriftVoid,
    bool: ThriftBoolean,
    byte: ThriftByte,
    i16: ThriftI16,
    i32: ThriftI32,
    i64: ThriftI64,
    double: ThriftDouble,
    string: ThriftString,
    binary: ThriftBinary
};

Thrift.prototype.compile = function compile() {
    var self = this;
    var syntax = idl.parse(self.idls[self.entryPoint]);
    assert.equal(syntax.type, 'Program', 'expected a program');
    self._compile(syntax.headers);
    self._compile(syntax.definitions);
};

Thrift.prototype.define = function define(name, def, model) {
    var self = this;
    assert(!self.models[name], 'duplicate reference to ' + name + ' at ' + def.line + ':' + def.column);
    self.models[name] = model;
};

Thrift.prototype.compilers = {
    // sorted
    Const: 'compileConst',
    Enum: 'compileEnum',
    Exception: 'compileException',
    Include: 'compileInclude',
    Service: 'compileService',
    Struct: 'compileStruct',
    Typedef: 'compileTypedef',
    Union: 'compileUnion'
};

Thrift.prototype._compile = function _compile(defs) {
    var self = this;
    for (var index = 0; index < defs.length; index++) {
        var def = defs[index];
        var compilerName = self.compilers[def.type];
        // istanbul ignore else
        if (compilerName) {
            self[compilerName](def);
        }
    }
};

Thrift.prototype.compileInclude = function compileInclude(def) {
    var self = this;

    if (def.id.lastIndexOf('./', 0) === 0 ||
        def.id.lastIndexOf('../', 0) === 0) {
        var entryPoint = def.id;
        var ns = def.namespace && def.namespace.name;

        // If include isn't name, get filename sans *.thrift file extension.
        if (!self.allowIncludeAlias || !ns) {
            var basename = path.basename(def.id);
            ns = basename.slice(0, basename.length - 7);
            if (!validThriftIdentifierRE.test(ns)) {
                throw Error(
                    'Thrift include filename is not valid thrift identifier'
                );
            }
        }

        var model;

        if (self.thrifts[entryPoint]) {
            model = self.thrifts[entryPoint];
        } else {
            model = new Thrift({
                entryPoint: entryPoint,
                idls: self.idls,
                thrifts: self.thrifts,
                thriftPath: self.thriftPath,
                strict: self.strict,
                allowIncludeAlias: self.allowIncludeAlias,
                allowDiskAccess: self.allowDiskAccess
            });
        }

        self.define(ns, def, model);

        // Alias if first character is not lower-case
        self.modules[ns] = model;

        if (!/^[a-z]/.test(ns)) {
            self[ns] = model;
        }

    } else {
        throw Error('Include path string must start with either ./ or ../');
    }
};

Thrift.prototype.compileStruct = function compileStruct(def) {
    var self = this;
    var model = new ThriftStruct({strict: self.strict});
    model.compile(def, self);
    self.define(model.fullName, def, model);
    return model;
};

Thrift.prototype.compileException = function compileException(def) {
    var self = this;
    var model = new ThriftStruct({strict: self.strict, isException: true});
    model.compile(def, self);
    self.define(model.fullName, def, model);
    return model;
};

Thrift.prototype.compileUnion = function compileUnion(def) {
    var self = this;
    var model = new ThriftUnion({strict: self.strict});
    model.compile(def, self);
    self.define(model.fullName, def, model);
    return model;
};

Thrift.prototype.compileTypedef = function compileTypedef(def) {
    var self = this;
    var model = new ThriftTypedef({strict: self.strict});
    model.compile(def, self);
    self.define(model.name, def, model);
    return model;
};

Thrift.prototype.compileService = function compileService(def) {
    var self = this;
    var service = new ThriftService({strict: self.strict});
    service.compile(def, self);
    self.define(service.name, def.id, service);
};

Thrift.prototype.compileConst = function compileConst(def, model) {
    var self = this;
    var thriftConst = new ThriftConst(def);
    self.define(def.id.name, def.id, thriftConst);
};

Thrift.prototype.compileEnum = function compileEnum(def) {
    var self = this;
    var model = new ThriftEnum();
    model.compile(def, self);
    self.define(model.name, def.id, model);
};

Thrift.prototype.link = function link() {
    var self = this;

    if (self.linked) {
        return self;
    }
    self.linked = true;

    var names = Object.keys(self.models);
    for (var index = 0; index < names.length; index++) {
        self.models[names[index]].link(self);
    }

    return self;
};

Thrift.prototype.resolve = function resolve(def) {
    var self = this;
    // istanbul ignore else
    if (def.type === 'BaseType') {
        return new self.baseTypes[def.baseType](def.annotations);
    } else if (def.type === 'Identifier') {
        return self.resolveIdentifier(def, def.name, 'type');
    } else if (def.type === 'List') {
        return new ThriftList(self.resolve(def.valueType), def.annotations);
    } else if (def.type === 'Set') {
        return new ThriftSet(self.resolve(def.valueType), def.annotations);
    } else if (def.type === 'Map') {
        return new ThriftMap(self.resolve(def.keyType), self.resolve(def.valueType), def.annotations);
    } else {
        assert.fail(util.format('Can\'t get reader/writer for definition with unknown type %s at %s:%s', def.type, def.line, def.column));
    }
};

// TODO thread type model and validate / coerce
Thrift.prototype.resolveValue = function resolveValue(def) {
    var self = this;
    // istanbul ignore else
    if (!def) {
        return null;
    } else if (def.type === 'Literal') {
        return def.value;
    } else if (def.type === 'ConstList') {
        return self.resolveListConst(def);
    } else if (def.type === 'ConstMap') {
        return self.resolveMapConst(def);
    } else if (def.type === 'Identifier') {
        if (def.name === 'true') {
            return true;
        } else if (def.name === 'false') {
            return false;
        }
        return self.resolveIdentifier(def, def.name, 'value').value;
    } else {
        assert.fail('unrecognized const type ' + def.type);
    }
};

Thrift.prototype.resolveListConst = function resolveListConst(def) {
    var self = this;
    var list = [];
    for (var index = 0; index < def.values.length; index++) {
        list.push(self.resolveValue(def.values[index]));
    }
    return list;
};

Thrift.prototype.resolveMapConst = function resolveMapConst(def) {
    var self = this;
    var map = {};
    for (var index = 0; index < def.entries.length; index++) {
        map[self.resolveValue(def.entries[index].key)] =
            self.resolveValue(def.entries[index].value);
    }
    return map;
};

Thrift.prototype.resolveIdentifier = function resolveIdentifier(def, name, models) {
    var self = this;
    var model;

    // short circuit if in global namespace of this thrift.
    if (self.models[name]) {
        model = self.models[name].link(self);
        if (model.models !== models) {
            err = new Error(
                'type mismatch for ' + def.name + ' at ' + def.line + ':' + def.column +
                ', expects ' + models + ', got ' + model.models
            );
            err.line = def.line;
            err.column = def.column;
            throw err;
        }
        return model;
    }

    var parts = name.split('.');
    var err;

    var module = self.modules[parts.shift()];
    if (module) {
        return module.resolveIdentifier(def, parts.join('.'), models);
    } else {
        err = new Error('cannot resolve reference to ' + def.name + ' at ' + def.line + ':' + def.column);
        err.line = def.line;
        err.column = def.column;
        throw err;
    }
};

module.exports.Thrift = Thrift;

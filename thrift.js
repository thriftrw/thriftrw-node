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

/* eslint max-statements:[1, 42] */
'use strict';

var assert = require('assert');
var util = require('util');
var fs = require('fs');
var path = require('path');
var idl = require('./thrift-idl');
var Result = require('bufrw/result');
var lcp = require('./lib/lcp');

var ThriftService = require('./service').ThriftService;
var ThriftStruct = require('./struct').ThriftStruct;
var ThriftUnion = require('./union').ThriftUnion;
var ThriftEnum = require('./enum').ThriftEnum;

var ThriftVoid = require('./void').ThriftVoid;
var ThriftBoolean = require('./boolean').ThriftBoolean;
var ThriftString = require('./string').ThriftString;
var ThriftBinary = require('./binary').ThriftBinary;
var ThriftI8 = require('./i8').ThriftI8;
var ThriftI16 = require('./i16').ThriftI16;
var ThriftI32 = require('./i32').ThriftI32;
var ThriftI64 = require('./i64').ThriftI64;
var ThriftDouble = require('./double').ThriftDouble;
var ThriftList = require('./list').ThriftList;
var ThriftSet = require('./set').ThriftSet;
var ThriftMap = require('./map').ThriftMap;
var ThriftConst = require('./const').ThriftConst;
var ThriftTypedef = require('./typedef').ThriftTypedef;

var Message = require('./message').Message;
var messageExceptionDef = require('./message').exceptionDef;
var messageExceptionTypesDef = require('./message').exceptionTypesDef;

var validThriftIdentifierRE = /^[a-zA-Z_][a-zA-Z0-9_\.]+$/;

function Thrift(options) {
    assert(options, 'options required');
    assert(typeof options === 'object', 'options must be object');
    assert(options.source || options.entryPoint, 'opts.entryPoint required');

    // Coerce weakly-deprecated single include usage
    if (options.source) {
        assert(typeof options.source === 'string', 'source must be string');
        options.entryPoint = 'service.thrift';
        options.idls = {'service.thrift': options.source};
    }

    // filename to source
    this.idls = options.idls || Object.create(null);
    // filename to ast
    this.asts = options.asts || Object.create(null);
    // filename to Thrift instance
    this.memo = options.memo || Object.create(null);

    // Grant file system access for resolving includes, as opposed to lifting
    // includes from provided options.idls alone.
    this.fs = options.fs;
    if (options.allowFilesystemAccess) {
        this.fs = fs;
    }

    this.strict = options.strict !== undefined ? options.strict : true;

    // [name] :Thrift* implementing {compile, link, &c}
    // Heterogenous Thrift model objects by name in a consolidated name-space
    // to prevent duplicate references with the same and different types, like
    // a service and a struct with the same name in the scope of a Thrift IDL
    // module:
    this.models = Object.create(null);
    // [serviceName][functionName] :{rw, Arguments, Result}
    this.services = Object.create(null);
    // [constName] :Value
    this.consts = Object.create(null);
    // [enumName][name] :String
    this.enums = Object.create(null);
    // [structName] :Constructor
    this.structs = Object.create(null);
    // [exceptionName] :Constructor
    this.exceptions = Object.create(null);
    // [unionName] :Constructor
    this.unions = Object.create(null);
    // [typedefName] :Constructor (might be Array, Object, or Number)
    this.typedefs = Object.create(null);
    // [moduleName] :Thrift
    // Child modules indexed by their local alias.
    this.modules = Object.create(null);

    this.surface = this;

    this.linked = false;
    this.allowIncludeAlias = options.allowIncludeAlias || false;
    this.allowOptionalArguments = options.allowOptionalArguments || false;

    this.filename = options.entryPoint;
    this.dirname = path.dirname(this.filename);
    this.memo[this.filename] = this;

    var ast = this.asts[options.entryPoint];
    var source = this.idls[options.entryPoint];
    if (!source && !ast) {
        /* eslint-disable max-len */
        assert.ok(this.fs, this.filename + ': Thrift must be constructed with either a complete set of options.idls, options.asts, or options.fs access');
        assert.ok(this.filename, 'Thrift must be constructed with a options.entryPoint');
        /* eslint-enable max-len */
        this.filename = path.resolve(this.filename);
        source = this.fs.readFileSync(this.filename, 'ascii');
        this.idls[this.filename] = source;
    }

    this.exception = null;

    // Separate compile/link passes permits forward references and cyclic
    // references.
    this.compile(source);
    // We only link from the root Thrift object.
    if (!options.noLink) {
        this.link();
    }
}

Thrift.prototype.models = 'module';

Thrift.prototype.Message = Message;

Thrift.prototype.getType = function getType(name) {
    return this.getTypeResult(name).toValue();
};

Thrift.prototype.getTypeResult = function getType(name) {
    var model = this.models[name];
    if (!model || model.models !== 'type') {
        return new Result(new Error(util.format('type %s not found', name)));
    }
    return new Result(null, model.link(this));
};

Thrift.prototype.getSources = function getSources() {
    var filenames = Object.keys(this.idls);
    var common = lcp.longestCommonPath(filenames);
    var idls = {};
    for (var index = 0; index < filenames.length; index++) {
        var filename = filenames[index];
        idls[filename.slice(common.length)] = this.idls[filename];
    }
    var entryPoint = this.filename.slice(common.length);
    return {entryPoint: entryPoint, idls: idls};
};

Thrift.prototype.toJSON = function toJSON() {
    var filenames = Object.keys(this.idls);
    var common = lcp.longestCommonPath(filenames);
    var asts = {};
    for (var index = 0; index < filenames.length; index++) {
        var filename = filenames[index];
        asts[filename.slice(common.length)] = this.asts[filename];
    }
    var entryPoint = this.filename.slice(common.length);
    return {entryPoint: entryPoint, asts: asts};
};

Thrift.prototype.getServiceEndpoints = function getServiceEndpoints(target) {
    target = target || null;
    var services = Object.keys(this.services);
    var endpoints = [];
    for (var i = 0; i < services.length; i++) {
        var service = this.models[services[i]];
        if (!target || target === service.name) {
            for (var j = 0; j < service.functions.length; j++) {
                endpoints.push(service.name + '::' + service.functions[j].name);
            }
        }
    }
    return endpoints;
};

Thrift.prototype.baseTypes = {
    void: ThriftVoid,
    bool: ThriftBoolean,
    byte: ThriftI8,
    i8: ThriftI8,
    i16: ThriftI16,
    i32: ThriftI32,
    i64: ThriftI64,
    double: ThriftDouble,
    string: ThriftString,
    binary: ThriftBinary
};

Thrift.prototype.compile = function compile(source) {
    var syntax = this.asts[this.filename];
    if (!syntax) {
        syntax = idl.parse(source);
        this.asts[this.filename] = syntax;
    }
    assert.equal(syntax.type, 'Program', 'expected a program');
    this._compile(syntax.headers);
    this._compile(syntax.definitions);
    this.compileEnum(messageExceptionTypesDef);
    this.exception = this.compileStruct(messageExceptionDef);
};

Thrift.prototype.define = function define(name, def, model) {
    assert(!this.models[name], 'duplicate reference to ' + name + ' at ' + def.line + ':' + def.column);
    this.models[name] = model;
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
    for (var index = 0; index < defs.length; index++) {
        var def = defs[index];
        var compilerName = this.compilers[def.type];
        // istanbul ignore else
        if (compilerName) {
            this[compilerName](def);
        }
    }
};

Thrift.prototype.compileInclude = function compileInclude(def) {
    if (def.id.lastIndexOf('./', 0) === 0 ||
        def.id.lastIndexOf('../', 0) === 0) {
        var ns = def.namespace && def.namespace.name;
        var filename = path.join(this.dirname, def.id);

        // If include isn't name, get filename sans *.thrift file extension.
        if (!this.allowIncludeAlias || !ns) {
            var basename = path.basename(def.id);
            ns = basename.slice(0, basename.length - 7);
            if (!validThriftIdentifierRE.test(ns)) {
                throw Error(
                    'Thrift include filename is not valid thrift identifier'
                );
            }
        }

        var model;

        if (this.memo[filename]) {
            model = this.memo[filename];
        } else {
            model = new Thrift({
                entryPoint: filename,
                fs: this.fs,
                idls: this.idls,
                asts: this.asts,
                memo: this.memo,
                strict: this.strict,
                allowIncludeAlias: true,
                allowOptionalArguments: this.allowOptionalArguments,
                noLink: true
            });
        }

        this.define(ns, def, model);

        // Alias if first character is not lower-case
        this.modules[ns] = model;

        if (!/^[a-z]/.test(ns)) {
            this[ns] = model;
        }

    } else {
        throw Error('Include path string must start with either ./ or ../');
    }
};

Thrift.prototype.compileStruct = function compileStruct(def) {
    var model = new ThriftStruct({strict: this.strict});
    model.compile(def, this);
    this.define(model.fullName, def, model);
    return model;
};

Thrift.prototype.compileException = function compileException(def) {
    var model = new ThriftStruct({strict: this.strict, isException: true});
    model.compile(def, this);
    this.define(model.fullName, def, model);
    return model;
};

Thrift.prototype.compileUnion = function compileUnion(def) {
    var model = new ThriftUnion({strict: this.strict});
    model.compile(def, this);
    this.define(model.fullName, def, model);
    return model;
};

Thrift.prototype.compileTypedef = function compileTypedef(def) {
    var model = new ThriftTypedef({strict: this.strict});
    model.compile(def, this);
    this.define(model.name, def, model);
    return model;
};

Thrift.prototype.compileService = function compileService(def) {
    var service = new ThriftService({strict: this.strict});
    service.compile(def, this);
    this.define(service.name, def.id, service);
};

Thrift.prototype.compileConst = function compileConst(def, model) {
    var thriftConst = new ThriftConst(def);
    this.define(def.id.name, def.id, thriftConst);
};

Thrift.prototype.compileEnum = function compileEnum(def) {
    var model = new ThriftEnum();
    model.compile(def, this);
    this.define(model.name, def.id, model);
};

Thrift.prototype.link = function link() {
    if (this.linked) {
        return this;
    }
    this.linked = true;

    var names = Object.keys(this.models);
    for (var index = 0; index < names.length; index++) {
        this.models[names[index]].link(this);
    }

    this.exception.link(this);

    return this;
};

Thrift.prototype.resolve = function resolve(def) {
    // istanbul ignore else
    if (def.type === 'BaseType') {
        return new this.baseTypes[def.baseType](def.annotations);
    } else if (def.type === 'Identifier') {
        return this.resolveIdentifier(def, def.name, 'type');
    } else if (def.type === 'List') {
        return new ThriftList(this.resolve(def.valueType), def.annotations);
    } else if (def.type === 'Set') {
        return new ThriftSet(this.resolve(def.valueType), def.annotations);
    } else if (def.type === 'Map') {
        return new ThriftMap(this.resolve(def.keyType), this.resolve(def.valueType), def.annotations);
    } else {
        assert.fail(util.format(
            'Can\'t get reader/writer for definition with unknown type %s at %s:%s',
            def.type, def.line, def.column
        ));
    }
};

// TODO thread type model and validate / coerce
Thrift.prototype.resolveValue = function resolveValue(def) {
    // istanbul ignore else
    if (!def) {
        return null;
    } else if (def.type === 'Literal') {
        return def.value;
    } else if (def.type === 'ConstList') {
        return this.resolveListConst(def);
    } else if (def.type === 'ConstMap') {
        return this.resolveMapConst(def);
    } else if (def.type === 'Identifier') {
        if (def.name === 'true') {
            return true;
        } else if (def.name === 'false') {
            return false;
        }
        return this.resolveIdentifier(def, def.name, 'value').value;
    } else {
        assert.fail('unrecognized const type ' + def.type);
    }
};

Thrift.prototype.resolveListConst = function resolveListConst(def) {
    var list = [];
    for (var index = 0; index < def.values.length; index++) {
        list.push(this.resolveValue(def.values[index]));
    }
    return list;
};

Thrift.prototype.resolveMapConst = function resolveMapConst(def) {
    var map = {};
    for (var index = 0; index < def.entries.length; index++) {
        map[this.resolveValue(def.entries[index].key)] =
            this.resolveValue(def.entries[index].value);
    }
    return map;
};

Thrift.prototype.resolveIdentifier = function resolveIdentifier(def, name, models) {
    var model;

    // short circuit if in global namespace of this thrift.
    if (this.models[name]) {
        model = this.models[name].link(this);
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

    var module = this.modules[parts.shift()];
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

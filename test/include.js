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

var test = require('tape');

var Thrift = require('../thrift').Thrift;
var path = require('path');

test('loads a thrift file that imports synchronously', function t(assert) {
    var mainThrift = Thrift.loadSync({
        thriftFile: path.join(__dirname, 'include-parent.thrift'),
        allowIncludeAlias: true
    });
    var importedThrift = mainThrift.modules.common;

    var typeImportedByMainThrift = mainThrift
        .types
        .BatchGetResponse
        .fieldsByName
        .items
        .valueType
        .rw
        .valueType;

    var typeFromImportedThrift = importedThrift.types.Item;

    assert.equal(typeImportedByMainThrift, typeFromImportedThrift,
        'Type imported correctly');

    var keyValueServiceFunctions = Object.keys(
        mainThrift.services.KeyValue.functionsByName
    );

    assert.deepEqual(
        keyValueServiceFunctions,
        ['get', 'put', 'serviceName', 'healthy'],
        'KeyValue Service has functions inherited from service it extends'
    );

    assert.deepEqual(
        mainThrift.consts.nums.value,
        [1, 42, 2],
        'Resolve values to included consts'
    );

    assert.equal(
        mainThrift.consts.DEFAULT_ROLE.value,
        'USER',
        'Constant defined from imported enum'
    );

    assert.end();
});

test('include without explicitly defined namespace', function t(assert) {
    var thrift = Thrift.loadSync({
        thriftFile: path.join(
            __dirname,
            'include-filename-namespace.thrift'
        ),
        allowIncludeAlias: true
    });

    assert.ok(thrift.modules.typedef,
        'modules includes typedef thrift instance');
    assert.end();
});

test('cyclic dependencies', function t(assert) {
    var thriftA = Thrift.loadSync({
        thriftFile: path.join(
            __dirname,
            'include-cyclic-a.thrift'
        ),
        allowIncludeAlias: true
    });

    var thriftB = thriftA.modules.B;

    assert.equal(
        thriftA.structs.Node.fieldsByName.value.valueType,
        thriftB.structs.Value,
        'Value imported correctly from include-cyclic-b thrift file'
    );

    assert.equal(
        thriftB.structs.Value.fieldsByName.nodes.valueType.rw.valueType,
        thriftA.structs.Node,
        'Node imported correctly from include-cyclic-a thrift file'
    );

    assert.end();
});

test('bad include paths', function t(assert) {
    assert.throws(
        badIncludePaths,
        /Include path string must start with either .\/ or ..\//,
        'include throws without ./ or ../'
    );
    assert.end();

    function badIncludePaths() {
        Thrift.loadSync({
            thriftFile: path.join(
                __dirname,
                'include-error-not-path.thrift'
            ),
            allowIncludeAlias: true
        });
    }
});

test('unknown thrift module name', function t(assert) {
    assert.throws(
        unknownThriftModule,
        /cannot resolve reference to common.Item/,
        'throws on unknown module'
    );
    assert.end();

    function unknownThriftModule() {
        Thrift.loadSync({
            thriftFile: path.join(
                __dirname,
                'include-error-unknown-module.thrift'
            ),
            allowIncludeAlias: true
        });
    }
});

test('bad thrift module name', function t(assert) {
    assert.throws(
        badThriftModuleName,
        /Thrift include filename is not valid thrift identifier/,
        'throws when module name from filename is an invalid thrift identifier'
    );
    assert.end();

    function badThriftModuleName() {
        Thrift.loadSync({
            thriftFile: path.join(
                __dirname,
                'include-error-invalid-filename-as-namespace.thrift'
            ),
            allowIncludeAlias: true
        });
    }
});

test('includes from opts.source throws', function t(assert) {
    assert.throws(
        includesViaSource,
        /Must set opts.thriftFile on instantiation to resolve include paths/,
        'throws when instantiated via opts.source without opts.thriftFile set'
    );
    assert.end();

    function includesViaSource() {
        return new Thrift({
            source: 'include "./foo.thrift"',
            allowIncludeAlias: true
        });
    }
});

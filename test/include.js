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

test('loads a thrift file that imports synchronously', function t(assert) {
    var mainThrift = Thrift.loadSync({
        entryPoint: './include-parent.thrift',
        thriftPath: __dirname,
        allowIncludeAlias: true,
        allowDiskAccess: true
    });
    var importedThrift = mainThrift.modules.common;

    var typeImportedByMainThrift = mainThrift // Thrift
        .models
        .BatchGetResponse // ThriftStruct
        .fieldsByName
        .items // ThriftField
        .valueType // ThriftList
        .valueType; // Item

    var typeFromImportedThrift = importedThrift.models.Item;

    assert.equal(typeImportedByMainThrift, typeFromImportedThrift,
        'Type imported correctly');

    var keyValueServiceFunctions = Object.keys(mainThrift.KeyValue);

    assert.deepEqual(
        keyValueServiceFunctions,
        ['get', 'put', 'serviceName', 'healthy'],
        'KeyValue Service has functions inherited from service it extends'
    );

    assert.deepEqual(
        mainThrift.consts.nums,
        [1, 42, 2],
        'Resolve values to included consts'
    );

    assert.equal(
        mainThrift.DEFAULT_ROLE,
        'USER',
        'Constant defined from imported enum'
    );

    assert.end();
});

test('include without explicitly defined namespace', function t(assert) {
    var thrift = Thrift.loadSync({
        entryPoint: './include-filename-namespace.thrift',
        thriftPath: __dirname,
        allowIncludeAlias: true,
        allowDiskAccess: true
    });

    assert.ok(thrift.modules.typedef,
        'modules includes typedef thrift instance');
    assert.end();
});

test('cyclic dependencies', function t(assert) {
    var thriftA = Thrift.loadSync({
        entryPoint: './include-cyclic-a.thrift',
        thriftPath: __dirname,
        allowIncludeAlias: true,
        allowDiskAccess: true
    });

    var thriftB = thriftA.B;

    assert.equal(
        thriftA.models.Node.fieldsByName.value.valueType,
        thriftB.models.Struct,
        'Value imported correctly from include-cyclic-b thrift file'
    );

    assert.equal(
        thriftB.models.Struct.fieldsByName.nodes.valueType.valueType,
        thriftA.models.Node,
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
            entryPoint: './include-error-not-path.thrift',
            thriftPath: __dirname,
            allowIncludeAlias: true,
            allowDiskAccess: true
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
            entryPoint: './include-error-unknown-module.thrift',
            thriftPath: __dirname,
            allowIncludeAlias: true,
            allowDiskAccess: true
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
            entryPoint: './include-error-invalid-filename-as-namespace.thrift',
            thriftPath: __dirname,
            allowIncludeAlias: true,
            allowDiskAccess: true
        });
    }
});

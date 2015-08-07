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

/* global Buffer */
/* eslint max-len:[0, 120] */
'use strict';

var test = require('tape');
var testRW = require('bufrw/test_rw');
var StructSpec = require('../struct').StructSpec;
var BooleanSpec = require('../boolean').BooleanSpec;

var healthSpec = new StructSpec();

// Manually drive compile(idl) and link(spec). This would be done by the Spec.

var mockSpec = {
    resolve: function resolve() {
        // pretend all fields are boolean
        return new BooleanSpec();
    }
};

healthSpec.compile({
    id: {name: 'Health'},
    fields: [
        {
            fieldId: 0,
            id: {name: 'ok'},
            valueType: {
                type: 'BaseType',
                baseType: 'boolean'
            },
            optional: false,
            required: true
        }
    ]
});

healthSpec.link(mockSpec);

var Health = healthSpec.Constructor;

test('HealthRW', testRW.cases(Health.rw, [

                                   // good
    [new Health({ok: true}), [
        0x02,                      // type:1 -- 2 -- BOOL
        0x00, 0x00,                // id:2   -- 0 -- ok
        0x01,                      // ok:1   -- 1 -- true
        0x00                       // type:1 -- 0 -- stop
    ]],

                                   // bad
    [new Health({ok: false}), [
        0x02,                      // type:1 -- 2 -- BOOL
        0x00, 0x00,                // id:2   -- 0 -- ok
        0x00,                      // ok:1   -- 0 -- false
        0x00                       // type:1 -- 0 -- stop
    ]]

]));

test('struct skips unknown void', function t(assert) {
    var res = Health.rw.readFrom(new Buffer([
        0x02,                     // type:1   -- 2 -- BOOL
        0x00, 0x01,               // id:2     -- 1 -- WHAT EVEN IS!?
        0x01,                     // typeid:1 -- 1 -- VOID
        0x00                      // typeid:1 -- 0 -- STOP
    ]), 0);
    if (res.err) {
        return assert.end(res.err);
    }
    assert.deepEqual(res.value, new Health());
    assert.end();
});

test('fails to read unexpected typeid for known field', function t(assert) {
    var buffer = new Buffer([
        0x01,       // typeid:1 -- 1 -- VOID
        0x00, 0x00, // fid:2    -- 0 -- ok
        0x00        // typeid:1 -- 0 -- STOP
    ]);
    var res = Health.rw.readFrom(buffer, 0);
    if (!res.err) {
        assert.fail('should be an error');
        return assert.end();
    }
    assert.equal(res.err.message, 'unexpected typeid 1 for ok at 0 on Health; expected 2');
    assert.end();
});

test('struct skips unknown string', function t(assert) {
    var res = Health.rw.readFrom(new Buffer([
        0x02,                     // type:1   -- 2  -- BOOL
        0x00, 0x01,               // id:2     -- 1  -- WHAT EVEN IS!?
        11,                       // typeid:1 -- 11 -- STRING
        0x00, 0x00, 0x00, 0x02,   // len~4
        0x20, 0x20,               // '  '
        0x00                      // typeid:1 -- 0  -- STOP
    ]), 0);
    if (res.err) {
        return assert.end(res.err);
    }
    assert.deepEqual(res.value, new Health());
    assert.end();
});

test('struct skips unknown struct', function t(assert) {
    var res = Health.rw.readFrom(new Buffer([
        0x02,                     // type:1   -- 2  -- BOOL
        0x00, 0x01,               // id:2     -- 1  -- WHAT EVEN IS!?
        0x0c,                     // typeid:1 -- 12 -- STRUCT
        0x01,                     // typeid:1 -- 1  -- VOID
        0x01,                     // typeid:1 -- 1  -- VOID
        0x0b,                     // typeid:1 -- 11 -- STRING
        0x00, 0x00, 0x00, 0x02,   // len~4
        0x20, 0x20,               // '  '
        0x01,                     // typeid:1 -- 1  -- VOID
        0x00,                     // typeid:1 -- 0  -- STOP
        0x00                      // typeid:1 -- 0  -- STOP
    ]), 0);
    if (res.err) {
        return assert.end(res.err);
    }
    assert.deepEqual(res.value, new Health());
    assert.end();
});

test('struct skips uknown map', function t(assert) {
    var res = Health.rw.readFrom(new Buffer([
        0x02,                     // type:1           -- 2 BOOL
        0x00, 0x01,               // id:2             -- 1 UNKNOWN
        0x0d,                   // typeid:1           -- 13, map

        // Thus begins a large map
        0x0b,                   // key_type:1         -- string    @ 4
        0x0c,                   // val_type:1         -- struct
        0x00, 0x00, 0x00, 0x02, // length:4           -- 2
                                //                    --
        0x00, 0x00, 0x00, 0x04, // key[0] str_len:4   -- 4         @ 10
        0x6b, 0x65, 0x79, 0x30, // key[0] chars       -- "key0"    @ 14
        0x0c,                   // val[0] type:1      -- struct    @ 18
        0x00, 0x01,             // val[0] id:2        -- 1         @ 19
        0x08,                   // val[0] > type:1    -- i32       @ 21
        0x00, 0x01,             // val[0] > id:2      -- 1         @ 22
        0x00, 0x00, 0x00, 0x14, // val[0] > Int32BE   -- 20        @ 24
        0x00,                   // val[0] > type:1    -- stop      @ 25
        0x0c,                   // val[0] type:1      -- struct    @ 26
        0x00, 0x02,             // val[0] id:2        -- 2         @ 27
        0x0b,                   // val[0] > type:1    -- string    @ 29
        0x00, 0x01,             // val[0] > id:2      -- 1         @ 30
        0x00, 0x00, 0x00, 0x04, // val[0] > str_len:4 -- 4         @ 32
        0x73, 0x74, 0x72, 0x32, // val[0] > chars     -- "str2"    @ 36
        0x00,                   // val[0] > type:1    -- stop      @ 40
        0x00,                   // val[0] > type:1    -- stop
                                //                    --
        0x00, 0x00, 0x00, 0x04, // key[1] str_len:4   -- 4
        0x6b, 0x65, 0x79, 0x31, // key[1] chars       -- "key1"
        0x0c,                   // val[1] type:1      -- struct
        0x00, 0x01,             // val[1] id:2        -- 1
        0x08,                   // val[1] > type:1    -- i32
        0x00, 0x01,             // val[1] > id:2      -- 1
        0x00, 0x00, 0x00, 0x0a, // val[1] > Int32BE   -- 10
        0x00,                   // val[1] > type:1    -- stop
        0x0c,                   // val[1] type:1      -- struct
        0x00, 0x02,             // val[1] id:2        -- 2
        0x0b,                   // val[1] > type:1    -- string
        0x00, 0x01,             // val[1] > id:2      -- 1
        0x00, 0x00, 0x00, 0x04, // val[1] > str_len:4 -- 4
        0x73, 0x74, 0x72, 0x31, // val[1] > chars     -- "str1"
        0x00,                   // val[1] > type:1    -- stop
        0x00,                   // val[1] > type:1    -- stop
        // Thus ends the map

        0x00                      // typeid:1         -- 0 STOP
    ]), 0);
    if (res.err) {
        return assert.end(res.err);
    }
    assert.deepEqual(res.value, new Health());
    assert.end();
});

test('struct skips unknown list', function t(assert) {
    var res = Health.rw.readFrom(new Buffer([
        0x02,                     // type:1      -- 2 BOOL
        0x00, 0x01,               // id:2        -- 1 UNKNOWN
        0x0f,                     // typeid:1    -- 15, list

        // Thus begins a list
        0x0c,                   // el_type:1     -- struct
        0x00, 0x00, 0x00, 0x03, // length:4      -- 3
        0x08,                   // el[0] type:1  -- i32
        0x00, 0x01,             // el[0] id:2    -- 2
        0x00, 0x00, 0x00, 0x1e, // el[0] Int32BE -- 30
        0x00,                   // el[0] type:1  -- stop
        0x08,                   // el[1] type:1  -- i32
        0x00, 0x01,             // el[1] id:2    -- 2
        0x00, 0x00, 0x00, 0x64, // el[1] Int32BE -- 100
        0x00,                   // el[1] type:1  -- stop
        0x08,                   // el[2] type:1  -- i32
        0x00, 0x01,             // el[2] id:2    -- 2
        0x00, 0x00, 0x00, 0xc8, // el[2] Int32BE -- 200
        0x00,                   // el[2] type:1  -- stop
        // Thus ends the map

        0x00                      // typeid:1    -- 0 STOP
    ]), 0);
    if (res.err) {
        return assert.end(res.err);
    }
    assert.deepEqual(res.value, new Health());
    assert.end();
});

test('every field must be marked in strict mode', function t(assert) {
    var spec = new StructSpec();
    try {
        spec.compile({
            id: {name: 'Health'},
            fields: [
                {
                    fieldId: 0,
                    id: {name: 'ok'},
                    valueType: {
                        type: 'BaseType',
                        baseType: 'boolean'
                    },
                    optional: false,
                    required: false
                }
            ]
        });
        assert.fail('should throw');
    } catch (err) {
        assert.equal(err.message, 'every field must be marked optional or ' +
            'required on Health including ok in strict mode');
    }
    assert.end();
});

test('every argument must be marked required in strict mode', function t(assert) {
    var spec = new StructSpec();
    try {
        spec.compile({
            id: {name: 'function_args'},
            isArgument: true,
            fields: [
                {
                    fieldId: 0,
                    id: {name: 'namedParam'},
                    valueType: {
                        type: 'BaseType',
                        baseType: 'boolean'
                    },
                    optional: true,
                    required: false
                }
            ]
        });
        assert.fail('should throw');
    } catch (err) {
        assert.equal(err.message, 'every field must be marked ' +
            'required on function_args including namedParam in strict mode');
    }
    assert.end();
});

test('structs and fields must be possible to rename with a js.name annotation', function t(assert) {
    var spec = new StructSpec({strict: false});
    spec.compile({
        id: {name: 'given'},
        annotations: {'js.name': 'alt'},
        fields: [
            {
                fieldId: 0,
                id: {name: 'given'},
                annotations: {'js.name': 'alt'},
                valueType: {
                    type: 'BaseType',
                    baseType: 'i32'
                }
            }
        ]
    });
    assert.equal(spec.name, 'alt', 'struct must have alternate js.name');
    assert.equal(spec.fieldsById[0].name, 'alt', 'field must have alternate js.name');
    assert.end();
});

test('required fields are required on measuring byte length', function t(assert) {
    var health = new Health();
    var res = Health.rw.byteLength(health);
    if (!res.err) {
        assert.fail('should fail to assess byte length');
        return assert.end();
    }
    assert.equal(res.err.message, 'missing required field ok at 0 of Health', 'message checks out');
    assert.deepEqual(res.err.what, health, 'err.what should be the input struct');
    assert.end();
});

test('required fields are required on writing into buffer', function t(assert) {
    var health = new Health();
    var res = Health.rw.writeInto(health, new Buffer(100), 0);
    if (!res.err) {
        assert.fail('should fail to write');
        return assert.end();
    }
    assert.equal(res.err.message, 'missing required field ok at 0 of Health', 'message checks out');
    assert.deepEqual(res.err.what, health, 'err.what should be the input struct');
    assert.end();
});

test('arguments must not be marked optional', function t(assert) {
    var argStruct = new StructSpec({strict: false});
    try {
        argStruct.compile({
            id: {name: 'foo_args'},
            isArgument: true,
            fields: [
                {
                    fieldId: 0,
                    id: {name: 'name'},
                    valueType: {
                        type: 'BaseType',
                        baseType: 'i64'
                    },
                    required: false,
                    optional: true
                }
            ]
        });
        assert.fail('should fail to write');
    } catch (err) {
        assert.equal(err.message, 'no field of an argument struct may be ' +
            'marked optional including name of foo_args');
    }
    assert.end();
});

test('skips optional elided arguments', function t(assert) {
    var spec = new StructSpec();
    spec.compile({
        id: {name: 'Health'},
        fields: [
            {
                fieldId: 0,
                id: {name: 'ok'},
                valueType: {
                    type: 'BaseType',
                    baseType: 'boolean'
                },
                optional: true,
                required: false
            }
        ]
    });
    spec.link(mockSpec);
    var health = new spec.Constructor();

    var byteLengthRes = spec.rw.byteLength(health);
    if (byteLengthRes.err) return assert.end(byteLengthRes.err);
    assert.equal(byteLengthRes.length, 1, 'only needs one byte');

    var buffer = new Buffer(byteLengthRes.length);
    var writeRes = spec.rw.writeInto(health, buffer, 0);
    if (writeRes.err) return assert.end(writeRes.err);
    assert.equal(writeRes.offset, 1, 'writes to end of buffer');
    assert.deepEqual(buffer, new Buffer([0x00]), 'writes stop byte only');

    assert.end();
});

test('skips optional elided struct (all fields optional)', function t(assert) {
    var spec = new StructSpec();
    spec.compile({
        id: {name: 'Health'},
        fields: [
            {
                fieldId: 0,
                id: {name: 'ok'},
                valueType: {
                    type: 'BaseType',
                    baseType: 'boolean'
                },
                optional: true,
                required: false
            }
        ]
    });
    spec.link(mockSpec);

    var byteLengthRes = spec.rw.byteLength(null);
    if (byteLengthRes.err) return assert.end(byteLengthRes.err);
    assert.equal(byteLengthRes.length, 1, 'only needs one byte');

    var buffer = new Buffer(byteLengthRes.length);
    var writeRes = spec.rw.writeInto(null, buffer, 0);
    if (writeRes.err) return assert.end(writeRes.err);
    assert.equal(writeRes.offset, 1, 'writes to end of buffer');
    assert.deepEqual(buffer, new Buffer([0x00]), 'writes stop byte only');

    assert.end();
});

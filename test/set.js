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
var testRW = require('bufrw/test_rw');
var fs = require('fs');
var path = require('path');

var Spec = require('../spec');
var SetSpec = require('../set').SetSpec;
var StringSpec = require('../string').StringSpec;
var ByteSpec = require('../byte').ByteSpec;

var byteSet = new SetSpec(new ByteSpec());
var stringSet = new SetSpec(new StringSpec());
var stringObjectSet = new SetSpec(new StringSpec(), {'js.type': 'object'});

test('SetSpec.rw: set of bytes', testRW.cases(byteSet.rw, [

    [[], [
        0x03,                  // type:1   -- 3, BYTE
        0x00, 0x00, 0x00, 0x00 // length:4 -- 0
    ]],

    [[1, 2, 3], [
        0x03,                   // type:1   -- 3, BYTE
        0x00, 0x00, 0x00, 0x03, // length:4 -- 3
        0x01,                   // byte:1 -- 1
        0x02,                   // byte:1 -- 2
        0x03                    // byte:1 -- 3
    ]],

    {
        readTest: {
            bytes: [
                0x2b,                  // type:1
                0x00, 0x00, 0x00, 0x00 // length:4 -- 0
            ],
            error: {
                type: 'thrift-typeid-mismatch',
                name: 'ThriftTypeidMismatchError',
                message: 'encoded set typeid 43 doesn\'t match expected ' +
                         'type "byte" (id: 3)'
            }
        }
    },

    {
        readTest: {
            bytes: [
                0x03,                  // type:1 -- 3, BYTE
                0xff, 0xff, 0xff, 0xff // length:4 -- -1
            ],
            error: {
                type: 'thrift-invalid-size',
                name: 'ThriftInvalidSizeError',
                message: 'invalid size -1 of set; expects non-negative number'
            }
        }
    }

]));

test('SetSpec.rw: set of strings', testRW.cases(stringSet.rw, [

    [[], [
        0x0b,                  // type:1   -- 11, STRING
        0x00, 0x00, 0x00, 0x00 // length:4 -- 0
    ]],

    [['a', 'ab', 'abc'], [
        0x0b,                    // type:1    -- 11, STRING
        0x00, 0x00, 0x00, 0x03,  // length:4  -- 3
        0x00, 0x00, 0x00, 0x01,  // str_len:4 -- 1
        0x61,                    // chars     -- "a"
        0x000, 0x00, 0x00, 0x02, // str_len:4 -- 1
        0x61, 0x62,              // chars     -- "ab"
        0x00, 0x00, 0x00, 0x03,  // str_len:4 -- 1
        0x61, 0x62, 0x63         // chars     -- "abc"
    ]]

]));

test('SetSpec.rw: set of strings as object', testRW.cases(stringObjectSet.rw, [

    [{}, [
        0x0b,                  // type:1   -- 11, STRING
        0x00, 0x00, 0x00, 0x00 // length:4 -- 0
    ]],

    [{a: true, ab: true, abc: true}, [
        0x0b,                    // type:1    -- 11, STRING
        0x00, 0x00, 0x00, 0x03,  // length:4  -- 3
        0x00, 0x00, 0x00, 0x01,  // str_len:4 -- 1
        0x61,                    // chars     -- "a"
        0x000, 0x00, 0x00, 0x02, // str_len:4 -- 1
        0x61, 0x62,              // chars     -- "ab"
        0x00, 0x00, 0x00, 0x03,  // str_len:4 -- 1
        0x61, 0x62, 0x63         // chars     -- "abc"
    ]]

]));

var source = fs.readFileSync(path.join(__dirname, 'set.thrift'), 'ascii');
var spec = new Spec({source: source});

test('Struct with set rw', testRW.cases(spec.Bucket.rw, [

    [new spec.Bucket({asArray: [1, 2, 3]}), [
        0x0f,                   // type:1  -- 15, struct
        0x00, 0x01,             // field:2 -- 1, asArray
        0x08,                   // type:1  -- 8, i32
        0x00, 0x00, 0x00, 0x03, // len:4   -- 3
        0x00, 0x00, 0x00, 0x01, // value:4 -- 1
        0x00, 0x00, 0x00, 0x02, // value:4 -- 2
        0x00, 0x00, 0x00, 0x03, // value:4 -- 3
        0x00                    // type:1  -- 0, stop
    ]],

    [new spec.Bucket({numbersAsObject: {1: true, 2: true, 3: true}}), [
        0x0f,                   // type:1  -- 15, struct
        0x00, 0x02,             // field:2 -- 1, numbersAsObject
        0x08,                   // type:1  -- 8, i32
        0x00, 0x00, 0x00, 0x03, // len:4   -- 3
        0x00, 0x00, 0x00, 0x01, // value:4 -- 1
        0x00, 0x00, 0x00, 0x02, // value:4 -- 2
        0x00, 0x00, 0x00, 0x03, // value:4 -- 3
        0x00                    // type:1  -- 0, stop
    ]],

    [new spec.Bucket({stringsAsObject: {1: true, 2: true, 3: true}}), [
        0x0f,                   // type:1       -- 15, struct
        0x00, 0x03,             // field:2      -- 1, numbersAsObject
        0x0b,                   // type:1       -- 11, string
        0x00, 0x00, 0x00, 0x03, // length:4     -- 3
        0x00, 0x00, 0x00, 0x01, // [0] length:4 -- 1
        0x31,                   // '1'
        0x00, 0x00, 0x00, 0x01, // [1] length:4 -- 1
        0x32,                   // '2'
        0x00, 0x00, 0x00, 0x01, // [2] length:4 -- 1
        0x33,                   // '3'
        0x00                    // type:1       -- 0, stop
    ]]

]));

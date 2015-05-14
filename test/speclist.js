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
var bufrw = require('bufrw');
var testRW = require('bufrw/test_rw');

var thriftrw = require('../index');
var SpecListRW = thriftrw.SpecListRW;

var byteListRW = new SpecListRW({
    name: 'byte',
    typeid: 42,
    rw: bufrw.UInt8
});
var strListRW = new SpecListRW({
    name: 'string',
    typeid: 99,
    rw: bufrw.str1
});

test('SpecListRW: byteListRW', testRW.cases(byteListRW, [

    [[], [
        0x2a,                  // type:1   -- 42
        0x00, 0x00, 0x00, 0x00 // length:4 -- 0
    ]],

    [[1, 2, 3], [
        0x2a,                   // type:1   -- 42
        0x00, 0x00, 0x00, 0x03, // length:4 -- 3
        0x01,                   // UInt8    -- 1
        0x02,                   // UInt8    -- 2
        0x03                    // UInt8    -- 3
    ]],

    {
        readTest: {
            bytes: [
                0x2b,                  // type:1   -- 42
                0x00, 0x00, 0x00, 0x00 // length:4 -- 0
            ],
            error: {
                type: 'thrift-list-typeid-mismatch',
                name: 'ThriftListTypeidMismatchError',
                message: 'encoded list typeid 43 doesn\'t match expected ' +
                         'type "byte" (id: 42)'
            }
        }
    }

]));

test('SpecListRW: strListRW', testRW.cases(strListRW, [

    [[], [
        0x63,                  // type:1   -- 42
        0x00, 0x00, 0x00, 0x00 // length:4 -- 0
    ]],

    [['a', 'ab', 'abc'], [
        0x63,                   // type:1    -- 42
        0x00, 0x00, 0x00, 0x03, // length:4  -- 3
        0x01,                   // str_len:1 -- 1
        0x61,                   // chars     -- "a"
        0x02,                   // str_len:1 -- 1
        0x61, 0x62,             // chars     -- "ab"
        0x03,                   // str_len:1 -- 1
        0x61, 0x62, 0x63        // chars     -- "abc"
    ]]

]));

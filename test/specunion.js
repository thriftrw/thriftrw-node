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

/* eslint new-cap:0 */

'use strict';

var test = require('tape');
var bufrw = require('bufrw');
var testRW = require('bufrw/test_rw');

var thriftrw = require('../index');
var SpecUnionRW = thriftrw.SpecUnionRW;

var strType = {
    name: 'string',
    typeid: 1,
    rw: bufrw.str1
};

var i16Type = {
    name: 'i16',
    typeid: 2,
    rw: bufrw.Int16BE
};

var idOrUUID = new SpecUnionRW([
    {name: 'id', id: 1, type: i16Type},
    {name: 'uuid', id: 2, type: strType}
]);

test('SpecUnionRW: idOrUUID', testRW.cases(idOrUUID, [
    [
        ['id', 3], [
            0x02,       // type:1  -- 2
            0x00, 0x01, // id:2    -- 1
            0x00, 0x03, // Int16BE -- 3
            0x00        // type:2  -- STOP
        ]
    ],

    [
        ['uuid', '1-2-3'], [
            0x01,                   // type:1    -- 1
            0x00, 0x02,             // id:2      -- 2
            0x05,                   // str_len:1 -- 5
            0x31, 0x2d, 0x32, 0x2d, // chars     -- "1-2-"
            0x33,                   // chars     -- "3"
            0x00                    // type:2    -- STOP
        ]
    ],

    // read error: more than one choice
    {
        readTest: {
            bytes: [
                0x02,                   // type:1    -- 2
                0x00, 0x01,             // id:2      -- 1
                0x00, 0x03,             // Int16BE   -- 3
                0x01,                   // type:1    -- 1
                0x00, 0x02,             // id:2      -- 2
                0x05,                   // str_len:1 -- 5
                0x31, 0x2d, 0x32, 0x2d, // chars     -- "1-2-"
                0x33,                   // chars     -- "3"
                0x00                    // type:2    -- STOP
            ],
            error: {
                message: 'expected stop byte, found field uuid(2) instead',
                offset: 14
            }
        }
    },

    // read empty
    {
        readTest: {
            bytes: [0x00],
            error: {
                message: 'no data for union'
            }
        }
    },

    // length/write invalid choice
    {
        lengthTest: {
            value: ['nope', null],
            error: {
                message: 'invalid union type choice nope'
            }
        },
        writeTest: {
            value: ['nope', null],
            error: {
                message: 'invalid union type choice nope'
            }
        }
    }
]));

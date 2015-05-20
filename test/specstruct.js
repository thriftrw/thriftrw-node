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
var SpecStructRW = thriftrw.SpecStructRW;

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

var doubleType = {
    name: 'double',
    typeid: 3,
    rw: bufrw.DoubleBE
};

var emptyRW = new SpecStructRW('Empty');

var personRW = new SpecStructRW('Person', [
    {name: 'firstName', id: 1, type: strType},
    {name: 'lastName', id: 2, type: strType},
    {name: 'age', id: 3, type: i16Type}
]);

var testPerson = new personRW.cons();
testPerson.firstName = 'bob';
testPerson.lastName = 'lob';
testPerson.age = 12;

test('SpecStructRW: emptyRW', testRW.cases(emptyRW, [
    [
        new emptyRW.cons(), [
            0x00              // type:1    -- STOP
        ]
    ],

    // length/write only expected object
    {
        lengthTest: {
            value: {},
            error: {
                message: 'invalid struct value, ' +
                         'expected instance of Thriftify_Empty'
            }
        },
        writeTest: {
            bytes: [0x00],
            value: {},
            error: {
                message: 'invalid struct value, ' +
                         'expected instance of Thriftify_Empty',
                offset: 0
            }
        }
    },

    // unknown field
    {
        readTest: {
            bytes: [
                0x02,       // type:1  -- 2
                0x00, 0x04, // id:2    -- 3
                0x00, 0x00, // Int16BE -- 12
                            //         --
                0x00        // type:1  -- STOP
            ],
            error: {
                message: 'unknown field id 4 (typeid 2)',
                offset: 0
            }
        }
    }
]));

test('SpecStructRW: personRW', testRW.cases(personRW, [
    [
        testPerson, [
            0x01,             // type:1    -- 1
            0x00, 0x01,       // id:2      -- 1
            0x03,             // str_len:1 -- 3
            0x62, 0x6f, 0x62, // chars     -- "bob"
                              //           --
            0x01,             // type:1    -- 1
            0x00, 0x02,       // id:2      -- 2
            0x03,             // str_len:1 -- 3
            0x6c, 0x6f, 0x62, // chars     -- "lob"
                              //           --
            0x02,             // type:1    -- 2
            0x00, 0x03,       // id:2      -- 3
            0x00, 0x0c,       // Int16BE   -- 12
                              //           --
            0x00              // type:1    -- STOP
        ]
    ],

    // length only expected object (needed for coverage vs the empty case)
    {
        lengthTest: {
            value: {},
            error: {
                message: 'invalid struct value, ' +
                         'expected instance of Thriftify_Person'
            }
        }
    },

    // mismatched typeid
    {
        readTest: {
            bytes: [
                0x01,             // type:1    -- 1
                0x00, 0x01,       // id:2      -- 1
                0x03,             // str_len:1 -- 3
                0x62, 0x6f, 0x62, // chars     -- "bob"
                                  //           --
                0x02,             // type:1    -- 1
                0x00, 0x02,       // id:2      -- 2
                0x03,             // str_len:1 -- 3
                0x6c, 0x6f, 0x62, // chars     -- "lob"
                                  //           --
                0x02,             // type:1    -- 2
                0x00, 0x03,       // id:2      -- 3
                0x00, 0x0c,       // Int16BE   -- 12
                                  //           --
                0x00              // type:1    -- STOP
            ],
            error: {
                message: 'mismatched field type 2, expected 1 for field 2',
                offset: 10
            }
        }
    }
]));

var pointRW = new SpecStructRW('Point', [
    {name: 'lat', id: 1, type: doubleType},
    {name: 'lng', id: 2, type: doubleType}
]);
var testPoint = new pointRW.cons();
testPoint.lat = 37.787536;
testPoint.lng = -122.403146;

test('SpecStructRW: pointRW', testRW.cases(pointRW, [
    [
        testPoint, [
            0x03,                   // type:1   -- 1
            0x00, 0x01,             // id:2     -- 1
            0x40, 0x42, 0xe4, 0xcd, // DoubleBE -- 37.787536
            0xfa, 0xca, 0x36, 0x1a, // ...      --
                                    //          --
            0x03,                   // type:1   -- 1
            0x00, 0x02,             // id:2     -- 1
            0xc0, 0x5e, 0x99, 0xcd, // DoubleBE -- -122.403146
            0x24, 0xe1, 0x60, 0xd9, // ...      --
                                    //          --
            0x00                    // type:1   -- STOP
        ]
    ]
]));

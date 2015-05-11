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

var Buffer = require('buffer').Buffer;
var test = require('tape');
var testRW = require('bufrw/test_rw');

var thriftrw = require('../index');
var TStruct = thriftrw.TStruct;
var TStructRW = thriftrw.TStructRW;
var TMap = thriftrw.TMap;
var TList = thriftrw.TList;
var TField = thriftrw.TField;
var TPair = thriftrw.TPair;

test('StructRW', testRW.cases(TStructRW, [

    [TStruct([TField(8, 1, 123)]), [
        0x08,                   // type:1  -- i32
        0x00, 0x01,             // id:2    -- 1
        0x00, 0x00, 0x00, 0x7b, // Int32BE -- 123
        0x00                    // type:1  -- stop
    ]],

    [TStruct([TField(11, 1, Buffer('hello'))]), [
        0x0b,                   // type:1 -- string
        0x00, 0x01,             // id:2   -- 1
        0x00, 0x00, 0x00, 0x05, // len:4  -- 5
        0x68, 0x65, 0x6c, 0x6c, // chars  -- "hell"
        0x6f,                   // chars  -- "o"
        0x00                    // type:1 -- stop
    ]],

    [TStruct([
        TField(3, 9, 20),
        TField(6, 10, 10)
    ]), [
        0x03,       // type:1  -- byte
        0x00, 0x09, // id:2    -- 9
        0x14,       // byte:1  -- 20
        0x06,       // type:1  -- i16
        0x00, 0x0a, // id:2    -- 6
        0x00, 0x0a, // Int16BE -- 10
        0x00        // type:1  -- stop
    ]],

    [TStruct([
        TField(12, 1, TStruct([TField(8, 1, 10)])),
        TField(12, 2, TStruct([TField(11, 1, Buffer('hello'))]))
    ]), [
        0x0c,                   // type:1  -- struct
        0x00, 0x01,             // id:2    -- 1
        0x08,                   // type:1  -- i32
        0x00, 0x01,             // id:2    -- 1
        0x00, 0x00, 0x00, 0x0a, // Int32BE -- 10
        0x00,                   // type:1  -- stop
        0x0c,                   // type:1  -- struct
        0x00, 0x02,             // id:2    -- 2
        0x0b,                   // type:1  -- string
        0x00, 0x01,             // id:2    -- 1
        0x00, 0x00, 0x00, 0x05, // len:4   -- 5
        0x68, 0x65, 0x6c, 0x6c, // chars   -- "hell"
        0x6f,                   // chars   -- "o"
        0x00,                   // type:1  -- stop
        0x00                    // type:1  -- stop
    ]],

    [TStruct([
        TField(13, 1, TMap(11, 12, [
            TPair(Buffer('key0'), TStruct([
                TField(12, 1, TStruct([TField(8, 1, 20)])),
                TField(12, 2, TStruct([TField(11, 1, Buffer('str2'))]))
            ])),
            TPair(Buffer('key1'), TStruct([
                TField(12, 1, TStruct([TField(8, 1, 10)])),
                TField(12, 2, TStruct([TField(11, 1, Buffer('str1'))]))
            ]))
        ])),
        TField(15, 2, TList(12, [
            TStruct([TField(8, 1, 30)]),
            TStruct([TField(8, 1, 100)]),
            TStruct([TField(8, 1, 200)])
        ]))
    ]), [

        0x0d,                   // type:1             -- map
        0x00, 0x01,             // id:2               -- 1
        0x0b,                   // key_type:1         -- string
        0x0c,                   // val_type:1         -- struct
        0x00, 0x00, 0x00, 0x02, // length:4           -- 2
                                //                    --
        0x00, 0x00, 0x00, 0x04, // key[0] str_len:4   -- 4
        0x6b, 0x65, 0x79, 0x30, // key[0] chars       -- "key0"
        0x0c,                   // val[0] type:1      -- struct
        0x00, 0x01,             // val[0] id:2        -- 1
        0x08,                   // val[0] > type:1    -- i32
        0x00, 0x01,             // val[0] > id:2      -- 1
        0x00, 0x00, 0x00, 0x14, // val[0] > Int32BE   -- 20
        0x00,                   // val[0] > type:1    -- stop
        0x0c,                   // val[0] type:1      -- struct
        0x00, 0x02,             // val[0] id:2        -- 2
        0x0b,                   // val[0] > type:1    -- string
        0x00, 0x01,             // val[0] > id:2      -- 1
        0x00, 0x00, 0x00, 0x04, // val[0] > str_len:4 -- 4
        0x73, 0x74, 0x72, 0x32, // val[0] > chars     -- "str2"
        0x00,                   // val[0] > type:1    -- stop
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
                                //                    --
        0x0f,                   // type:1             -- list
        0x00, 0x02,             // id:2               -- id
        0x0c,                   // el_type:1          -- struct
        0x00, 0x00, 0x00, 0x03, // length:4           -- 3
        0x08,                   // el[0] type:1       -- i32
        0x00, 0x01,             // el[0] id:2         -- 2
        0x00, 0x00, 0x00, 0x1e, // el[0] Int32BE      -- 30
        0x00,                   // el[0] type:1       -- stop
        0x08,                   // el[1] type:1       -- i32
        0x00, 0x01,             // el[1] id:2         -- 2
        0x00, 0x00, 0x00, 0x64, // el[1] Int32BE      -- 100
        0x00,                   // el[1] type:1       -- stop
        0x08,                   // el[2] type:1       -- i32
        0x00, 0x01,             // el[2] id:2         -- 2
        0x00, 0x00, 0x00, 0xc8, // el[2] Int32BE      -- 200
        0x00,                   // el[2] type:1       -- stop
                                //                    --
        0x00                    // type:1             -- stop
    ]]

]));

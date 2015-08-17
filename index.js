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

var TYPE = require('./TYPE');
var bufrw = require('bufrw');
var tmap = require('./tmap');
var tlist = require('./tlist');
var tstruct = require('./tstruct');

module.exports.TYPE = TYPE;

var ttypes = Object.create(null);
ttypes[TYPE.BOOL] = bufrw.Int8;
ttypes[TYPE.BYTE] = bufrw.Int8;
ttypes[TYPE.DOUBLE] = bufrw.DoubleBE;
ttypes[TYPE.I16] = bufrw.Int16BE;
ttypes[TYPE.I32] = bufrw.Int32BE;
ttypes[TYPE.I64] = bufrw.FixedWidth(8);
ttypes[TYPE.STRING] = bufrw.VariableBuffer(bufrw.Int32BE);
ttypes[TYPE.MAP] = tmap.TMapRW({ttypes: ttypes});
ttypes[TYPE.LIST] = tlist.TListRW({ttypes: ttypes});
ttypes[TYPE.SET] = tlist.TListRW({ttypes: ttypes});
ttypes[TYPE.STRUCT] = tstruct.TStructRW({ttypes: ttypes});

module.exports.TPair = tmap.TPair;
module.exports.TMap = tmap.TMap;
module.exports.TMapRW = ttypes[TYPE.MAP];

module.exports.TList = tlist.TList;
module.exports.TListRW = ttypes[TYPE.LIST];

module.exports.TField = tstruct.TField;
module.exports.TStruct = tstruct.TStruct;
module.exports.TStructRW = ttypes[TYPE.STRUCT];

module.exports.BinaryRW = require('./binary').BinaryRW;
module.exports.BinarySpec = require('./binary').BinarySpec;

module.exports.BooleanRW = require('./boolean').BooleanRW;
module.exports.BooleanSpec = require('./boolean').BooleanSpec;

module.exports.ByteRW = require('./byte').ByteRW;
module.exports.ByteSpec = require('./byte').ByteSpec;

module.exports.DoubleRW = require('./double').DoubleRW;
module.exports.DoubleSpec = require('./double').DoubleSpec;

module.exports.I16RW = require('./i16').I16RW;
module.exports.I16Spec = require('./i16').I16Spec;

module.exports.I32RW = require('./i32').I32RW;
module.exports.I32Spec = require('./i32').I32Spec;

module.exports.I64RW = require('./i64').I64RW;
module.exports.I64Spec = require('./i64').I64Spec;

module.exports.ListRW = require('./list').ListRW;
module.exports.ListSpec = require('./list').ListSpec;

module.exports.SpecMapObjRW = require('./specmap-obj').SpecMapObjRW;
module.exports.SpecMapEntriesRW = require('./specmap-entries').SpecMapEntriesRW;

module.exports.StringRW = require('./string').StringRW;
module.exports.StringSpec = require('./string').StringSpec;

module.exports.VoidRW = require('./void').VoidRW;
module.exports.VoidSpec = require('./void').VoidSpec;

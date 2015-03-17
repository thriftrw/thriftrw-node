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

var bufrw = require('bufrw');
var tmap = require('./tmap');
var tlist = require('./tlist');
var tstruct = require('./tstruct');

var TYPE = Object.create(null);
TYPE.STOP = 0;
TYPE.VOID = 1;
TYPE.BOOL = 2;
TYPE.BYTE = 3;
TYPE.DOUBLE = 4;
TYPE.I16 = 6;
TYPE.I32 = 8;
TYPE.I64 = 10;
TYPE.STRING = 11;
TYPE.STRUCT = 12;
TYPE.MAP = 13;
TYPE.SET = 14;
TYPE.LIST = 15;

var ttypes = Object.create(null);
ttypes[TYPE.BOOL] = bufrw.UInt8;
ttypes[TYPE.BYTE] = bufrw.UInt8;
ttypes[TYPE.DOUBLE] = bufrw.DoubleBE;
ttypes[TYPE.I16] = bufrw.Int16BE;
ttypes[TYPE.I32] = bufrw.Int32BE;
ttypes[TYPE.I64] = bufrw.FixedWidth(8);
ttypes[TYPE.STRING] = bufrw.String(bufrw.UInt32BE);
ttypes[TYPE.MAP] = new tmap.TMapRW({ttypes: ttypes});
ttypes[TYPE.LIST] = new tlist.TListRW({ttypes: ttypes});
ttypes[TYPE.SET] = new tlist.TListRW({ttypes: ttypes});
ttypes[TYPE.STRUCT] = new tstruct.TStructRW({ttypes: ttypes});

module.exports.TYPE = TYPE;

module.exports.TMap = tmap.TMap;
module.exports.TMapRW = ttypes[TYPE.MAP];

module.exports.TList = tlist.TList;
module.exports.TListRW = ttypes[TYPE.LIST];

module.exports.TStruct = tstruct.TStruct;
module.exports.TStructRW = ttypes[TYPE.STRUCT];

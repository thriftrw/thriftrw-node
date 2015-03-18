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
var TMap = require('./tmap');
var TList = require('./tlist');
var TStruct = require('./tstruct');

module.exports.TYPE = TYPE;

var ttypes = Object.create(null);
ttypes[TYPE.BOOL] = bufrw.Int8;
ttypes[TYPE.BYTE] = bufrw.Int8;
ttypes[TYPE.DOUBLE] = bufrw.DoubleBE;
ttypes[TYPE.I16] = bufrw.Int16BE;
ttypes[TYPE.I32] = bufrw.Int32BE;
ttypes[TYPE.I64] = bufrw.FixedWidth(8);
ttypes[TYPE.STRING] = bufrw.String(bufrw.Int32BE);
ttypes[TYPE.MAP] = TMap.RW({ttypes: ttypes});
ttypes[TYPE.LIST] = TList.RW({ttypes: ttypes});
ttypes[TYPE.SET] = TList.RW({ttypes: ttypes});
ttypes[TYPE.STRUCT] = TStruct.RW({ttypes: ttypes});

module.exports.TMap = TMap;
module.exports.TMapRW = ttypes[TYPE.MAP];

module.exports.TList = TList;
module.exports.TListRW = ttypes[TYPE.LIST];

module.exports.TStruct = TStruct;
module.exports.TStructRW = ttypes[TYPE.STRUCT];

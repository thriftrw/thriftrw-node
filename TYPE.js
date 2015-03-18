'use strict';

var TYPE = Object.create(null);
TYPE.STOP = 0;
TYPE.VOID = 1;
TYPE.BOOL = 2;
TYPE.BYTE = 3;
TYPE.I8 = 3;
TYPE.DOUBLE = 4;
TYPE.I16 = 6;
TYPE.I32 = 8;
TYPE.I64 = 10;
TYPE.STRING = 11;
TYPE.STRUCT = 12;
TYPE.MAP = 13;
TYPE.SET = 14;
TYPE.LIST = 15;

module.exports = TYPE;

# thriftrw

<!--
    [![build status][build-png]][build]
    [![Coverage Status][cover-png]][cover]
    [![Davis Dependency status][dep-png]][dep]
-->

<!-- [![NPM][npm-png]][npm] -->

Encodes and decodes Thrift binary protocol and JavaScript object models
declared in a Thrift IDL.
This is an alternative approach to using code generated from Thrift IDL source
files with the `thrift` compiler.

ThriftRW supports encoding and decoding the protocol with or without Thrift IDL
sources.
Without sources, it is still possible to read and write the Thrift binary
protocol in all of its structure using numbered fields for structs and not
discerning the nuanced differences between binary and string, list and set, or
number and enum.

With a Thrift IDL, ThriftRW is able to perform certain optimizations.
ThriftRW constructs model instances directly from the contents of a buffer
instead of creating an intermediate anonymous structural model.
As a consequence, it is able to quickly skip any unrecognized fields.
ThriftRW can also use the same struct constructor for every instance of a
struct, which should yield run-time performance benefits for V8 due to hidden
classes (not yet verified).

The scope of this project may eventually cover alternate Thrift binary
encodings including the compact binary protocol.

This project makes extensive use of [bufrw][] for reading and writing binary
protocols, a component shared by [tchannel-node][], with which this library
works in concert.

[bufrw]: https://github.com/uber/bufrw
[tchannel-node]: https://github.com/uber/tchannel-node


## Example

ThriftRW provides a Thrift constructor that models all of the services,
functions, and types expressed in a ThriftIDL source file.

```js
var fs = require('fs');
var path = require('path');
var Thrift = require('thriftrw').Thrift;
var source = fs.readFileSync(fs.path(__dirname, 'meta.thrift'), 'ascii');
var thrift = new Thrift({source: source, strict: true});
```

Consider `meta.thrift`

```thrift
struct HealthStatus {
    1: required bool ok
    2: optional string message
}

service Meta {
    HealthStatus health()
    string thriftIDL()
}
```

The most common usage of a Thrift instance is to get the argument and result
types of a function and use those types to read to or write from a buffer.
The `getType` and `getTypeResult` functions retrieve such models based on their name.
For example, the arguments struct for the health endpoint would be ``Meta::health_args``
and its result struct would be ``Meta::health_result``.

```js
var MetaHealthArgs = thrift.getType('Meta::health_args');
var MetaHealthResult = thrift.getType('Meta::health_result');
```

The `getType` method will return the struct or throw an exception if one does not exist.
This is the appropriate method if `getType` should throw an error due to a
programmer's mistake, where the Thrift source in question is checked into the same project
and the method name is a literal.

However, exceptions being an undesirable outcome for bad data from a user,
`getTypeResult` returns a result object with either `err` or `value` properties set.

```js
var res = thrift.getTypeResult(methodName + '_args');
if (res.err) {
    return callback(res.err);
}
var ArgsStruct = res.value;
```

The struct can be written or read to or from a buffer using the struct's `rw` instance.
A RW (reader/writer) implements `byteLength(value)`, `writeInto(value, buffer,
offset)`, `readFrom(buffer, offset)`, each of which return a result object as
specified by [bufrw][].
The value may be JSON, a POJO (plain old JavaScript object), or any instances
of the Thrift model, like `new thrift.Health({ok: true})`.

A struct can also be encoded or decoded using the ThriftStruct's own
`toBuffer(value)`, `fromBuffer(buffer)`, `toBufferResult(value)`, and
`fromBufferResult(buffer)` methods.
Those with `Result` in their name return `Result` instances instead of throwing
or returning the buffer or value.

[TChannelASThrift][] employs this interface on your behalf, leaving the
application author to take arguments and call back with a result when using
the Thrift argument scheme and a given Thrift IDL.

[TChannelAsThrift]: https://github.com/uber/tchannel-node/blob/master/as/thrift.js


### Without Thrift IDL

ThriftRW provides `T` prefixed types for encoding and decoding the wire
protocol without Thrift IDL.
This is useful for applications like [TCap] that do not necessarily have a
Thrift IDL file on hand to make sense of structs by field numbers alone.

The following example illustrates reading and writing a struct.
ThriftRW exports `TStruct`, `TList`, and `TMap`.
TStructs serve for arguments, results, and exceptions.
TLists also serve for sets.

```js
var thriftrw = require("thriftrw");
var bufrw = require('bufrw');

var struct = new thriftrw.TStruct();
struct.fields.push(
    new thriftrw.TField(thriftrw.TYPE.STRING, 1, new Buffer('hello')
);

var buf = bufrw.toBuffer(thriftrw.TStructRW, struct);
console.log('created a binary buffer of thrift encoded struct', buf);

var struct2 = bufrw.fromBuffer(thriftrw.TStructRW, buf);
console.log('created a TStruct from a binary buffer', struct2);
```


## Thrift Model

Each service in the IDL gets revealed as an object by the same name on the Thrift instance.
The Meta service is simply `thrift.Meta`.
The object is an object mapping functions by name, so `thrift.Meta.health` is
the interface for accessing the `args` and `result` structs for the
`Meta::health` function.

```js
var args = new thrift.Meta.health.Arguments({ok: true});
var result = new thrift.Meta.health.Result({success: null});
```

The Thrift instance also has a `services` property containing the actual
ThriftService instance indexed by service name.
ThriftService instances are not expected to be useful outside the process of
compiling and linking the Thrift IDL, but you can use the services object to
check for the existence of a service by its name.

### Structs

ThriftStruct models can be constructed with an optional object of specified
properties.
ThriftRW exposes the constructor for a struct declaration by name on the thrift
instance, as in `thrift.Health` for the meta.thrift example.

```js
var HealthStruct = thrift.Health;
var result = new ResultStruct({
    success: new HealthStruct({ok: true })
})
```

Unspecified properties will default to null or an instance of the default value
specified in the Thrift IDL.
Nested structs can be expressed with JSON or POJO equivalents.
The constructors perform no validation.
Invalid objects are revealed only in the attempt to write one to a buffer.

```js
var result = new ResultStruct({success: {ok: true}});
```

Each constructor has a `rw` property that reveals the reader/writer instance.
RW objects imlement `byteLength(value)`, `readFrom(buffer, offset)`, and
`writeInto(value, buffer, offset)`.
The value may be any object of the requisite shape, though using the given
constructors increases the probability V8 optimization.

Each constructor also hosts `toBuffer(value)`, `fromBuffer(buffer)`,
`toBufferResult(value)`, and `fromBufferResult(buffer)`.

The internal ThriftStruct instance is also indexed by name on the thrift
object's `thrift.structs` object.

### Exceptions

ThriftException extends ThriftStruct.
Exceptions are modeled as structs on the wire, and are modeled as JavaScript
exceptions instead of regular objects.
As such they have a stack trace.
ThriftRW exposes the exception constructor by name on the thrift instance.

```thrift
exception Pebcak {
    1: required string message
    2: required string keyboardName
    3: required string chairName
}
```

```js
var error = new thrift.Pebcak({
    message: 'Problem exists between chair and keyboard',
    chairName: 'Hengroen',
    keyboardName: 'Excalibur'
});
```

The ThriftException instance internal to the thrift compiler is indexed by name
on `thrift.exceptions`.

### Unions

ThriftUnion also extends ThriftStruct.
Unions are alike to structs except that fields must not be marked as `optional`
or `required`, cannot have a default value, and exactly one must be defined on
an instance.
As with other types, validation of a union only occurs when it is read or
written.

```thrift
union CoinToss {
    1: Obverse heads
    2: Reverse tails
}

struct Obverse {
    1: required string portrait;
    2: required i32 year;
}

struct Reverse {
    1: required string structure;
    2: optional string motto;
}
```

```js
var coinToss = new thrift.CoinToss({
    head: thrift.Obverse({
        portrait: 'TK',
        year: 2010
    })
})
```

The compiler's internal representation of a ThriftUnion is indexed by name on
`thrift.unions`.

### Enums

Thrift enumerations are surfaced as an object mapping names to strings on
the thrift instance.

```thrift
enum CoinToss {
    tails = 0
    heads = 1
}
```

```js
var result = Math.random() < 0.5 ?
    thrift.CoinToss.heads :
    thrift.CoinToss.tails;
// result will be either "tails" or "heads"
```

ThriftRW hides the detail of which numeric value an enumeration will have on
the wire and allows an enumeration to be represented in JSON by name.
This is a deliberate departure from the norms for Thrift in other languages
to take advantage of the dynamic nature of JavaScript, permit duck typing,
enforce loose coupling between application code and wire protocol, and make
Thrift expressible as JSON on the command line with [TCurl][]

[TCurl]: https://github.com/uber/tcurl

### Consts

Thrift constants are surfaced as properties of the thrift instance.

```thrift
const PI = 3
const TAU = 6
```

```js
var PI = thrift.PI;
var TAU = thrift.TAU;
```

Internal representations of consts are indexed by name on the `thrift.consts`
object.


## Enhancements and Departures from Thrift proper

ThriftRW operates in a "strict" mode by default that imposes additional
constraints on Thrift to ensure cross language interoperability between
JavaScript, Python, Go, and Java, the four Thrift bindings favored at Uber.

In strict mode, structs must explicitly declare every field to be either
required, optional, or have a default value.

ThriftRW supports forward references and self-referential types (like trees)
without special demarcation.
ThriftRW also supports forward references in default values and constants.

## Types and Annotations

ThriftRW respects certain annotations specific to the treatment of various
types in JavaScript.

### set

There is an emerging standard for the representation of sets in JavaScript.
Until that standard becomes pervasive, sets are traditionally represented
either as an array with externally enforced constraints, or as long as the values
are scalar like numbers and strings, as an Object with values for keys.

By default, ThriftRW encodes and decodes sets as arrays.
ThriftRW does nothing to enforce uniqueness.

Additionally, the `js.type` annotation can be set to "object" if the value type
is a string, i16, or i32.
ThriftRW will ensure that the keys are coerced to and from Number for numeric
value types.

```thrift
typedef set<string> (js.type = 'object') StringSet
typedef set<i32> (js.type = 'object') I32Set
```

### map

There is also an emerging standard for the representation of maps in JavaScript.
However, until support is more pervasive, ThriftRW supports representing maps
as either an object with scalar key types or an entries array for all others.

Maps are represented as objects by default. With the `js.type` annotation set
to "entries", the map will be encoded and decoded with an array of [key, value]
duples.

```thrift
typedef map<string, string> Dictionary
typedef map<Struct, Struct> (js.type = 'entries') StructsByStructs
```

### i64

JavaScript numbers lack sufficient precision to represent all possible 64 bit
integers.
ThriftRW decodes 64 bit integers into a Buffer, but can coerce various types
down to i64 for purposes of expressing them as JSON.

- A number up to the maximum integer precision available in JavaScript.
- A `{hi, lo}` pair of 32 bit precision integers.
- A 16 digit hexadecimal string, like `0102030405060708`.
- An array of 8 byte values. Ranges are not checked, but coerced.
- An 8 byte buffer.

In a future version, we are likely to expose `js.type` annotations to read any
of these forms off the wire.
Currently, they can only be written.

## Installation

`npm install thriftrw`

## Tests

`npm test`

## NPM scripts

 - `npm run add-licence` This will add the licence headers.
 - `npm run cover` This runs the tests with code coverage
 - `npm run lint` This will run the linter on your code
 - `npm test` This will run the tests.
 - `npm run trace` This will run your tests in tracing mode.
 - `npm run travis` This is run by travis.CI to run your tests
 - `npm run view-cover` This will show code coverage in a browser

## Contributors

 - Lei Zhao @leizha
 - Kris Kowal @kriskowal
 - Andrew de Andrade @malandrew

## MIT Licenced

  [build-png]: https://secure.travis-ci.org/uber/thriftrw.png
  [build]: https://travis-ci.org/uber/thriftrw
  [cover-png]: https://coveralls.io/repos/uber/thriftrw/badge.png
  [cover]: https://coveralls.io/r/uber/thriftrw
  [dep-png]: https://david-dm.org/uber/thriftrw.png
  [dep]: https://david-dm.org/uber/thriftrw
  [test-png]: https://ci.testling.com/uber/thriftrw.png
  [tes]: https://ci.testling.com/uber/thriftrw
  [npm-png]: https://nodei.co/npm/thriftrw.png?stars&downloads
  [npm]: https://nodei.co/npm/thriftrw

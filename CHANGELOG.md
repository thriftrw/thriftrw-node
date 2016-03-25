# v3.4.3

- Fixed support for maps with i8, i16, and i32 key types.
  i64 is not yet supported.
  string is the only other key type expressly supported.

# v3.4.2

- Upgrade version of bufrw for a more rigorous fix for the regression
  introduced for lists of lists.
  The fix in bufrw should cover this and possibly other cases, and
  allows us to remove the work-around introduced in v3.4.1

# v3.4.1

- Fix list of lists regression introduced in v3.2.0.

# v3.4.0

- Implements Thrift message envelopes, including Thrift exceptions.
- Ships with pre-compiled IDL parser module and relaxes dependency on PEGJS to
  during development only.

# v3.3.0

ThriftRW is now in its own organization on Github!

- Adds `toBuffer` and `fromBuffer` to `StructRW`.
- Fixes the missing `Argument` and `Result` constructors on function models.
- Allows i64 properties with the `(js.type = 'Date')` annotation to coerce
  arrays of bytes, buffers, and longs, all representing miliseconds since the
  Epoch.

# v3.2.0

- Aliases byte as i8 in accordance with upstream Thrift changes.

# v3.1.0

- Adds `thrift.getServiceEndpoints(service)`

# v3.0.3

- Exposes the functions in parent services properly.

# v3.0.1

- Implement IDLs interface
- Implement preliminary benchmark
- Include and PascalCase notes added to README

# v3.0.0

Introduces Thrift includes.
See [MIGRATION.md](MIGRATION.md) for details regarding changes to the public
interface.

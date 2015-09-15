service Foo {
    byte foo(1: byte number) throws (
        1: string fail
    )
    void bar() throws (
        1: BarError barError
    )
}

exception BarError {
}

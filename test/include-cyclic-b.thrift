include node "./include-cyclic-a.thrift"

struct Value {
    1: required list<node.Node> nodes
}
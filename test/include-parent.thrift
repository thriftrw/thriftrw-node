include common "./include-child.thrift"

struct BatchGetResponse {
    1: required list<common.Item> items = []
}

service ItemStore {
    BatchGetResponse batchGetItems(1: list<string> keys)
}

service KeyValue extends common.BaseService {
    binary get(
        1: binary key
    )
    void put(
        1: binary key,
        2: binary value
    )
}
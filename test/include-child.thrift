struct Item {
    1: required string key
    2: required string value
}

service BaseService {
    string serviceName()
    bool healthy()
}
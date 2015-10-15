exception BogusNameError {
    1: required string bogusName
    2: required string message
}

service BogusService {
    string bogus() throws (
        1: BogusNameError bogusName
    )
}

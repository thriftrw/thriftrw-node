typedef list<Coordinate> Coordinates;

struct Coordinate {
    1: required double lat
    2: required double lon
}

struct CoordinatesHolder {
    1: required Coordinates coordinates
}

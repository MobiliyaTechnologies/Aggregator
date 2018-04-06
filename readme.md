# Aggregator Server

## Pre-requisites 

- NodeJS (4.0.0 and above)
- Python (2.7 and above)
- OpenCV 3+

## Installation

```bash 
$ git clone 
$ cd jetson-device-client
$ mv install-opencv.sh ~/
$ cd 
$ chmod +x install-opencv.sh
$ ./install-opencv.sh
$ cd jetson-device-client
$ npm run pythonPackages
$ npm install
```

## Running the server

Starting the aggregator server:

``` bash
$ node aggregatorServer.js

```
## Limitations
- Camera streaming URL should be known and tested before passing as input to Aggregator.

## License

[MIT](#)

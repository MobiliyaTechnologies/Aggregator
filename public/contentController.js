/*******************************************************************************
 * Copyright(c) 2017-2018 Mobiliya Technologies
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 *
 * @author: Gaurav Wable, Mobiliya
 * @version: 1.01
 * @summary: Content controller file
 *******************************************************************************/

var mainApp = angular.module("gatewayApp");

mainApp.controller('contentController', function ($scope, aadService, $http, $websocket, $rootScope, $state) {
    $scope.gatewayMac = "Loading.."
    $scope.version = "Loading..";

    $scope.reset = function () {
        aadService.logout();
    }
    $rootScope.$on('deleteStoredFiles', function (event, data) {
        $scope.deleteStoredFiles();
        $state.go('main');
    });
    $rootScope.$on('enableLoginButton', function (event, data) {
        $scope.enableSubmitButton(true);
    });
    $rootScope.$on('disableLoginButton', function (event, data) {
        $scope.enableSubmitButton(false);
    });
    $scope.deleteStoredFiles = function () {
        $http({
            url: 'http://localhost:65157/resetgateway',
            method: 'GET',
        }).then(function (response) {
            console.log(response);
        }).catch(function (error) {
           //    alert("Failed. Please try again!");
        });
    }

    $scope.showVersion = function () {
        //console.log("$scope.gatewayMac", $scope.gatewayMac);
        $http({
            url: 'http://localhost:65157/version',
            dataType: 'json',
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
            }
        }).then(function (response) {
            console.log("$scope.version response: ", response.data);
            $scope.version = response.data;
            console.log("$scope.version response: ", $scope.version);
        }).catch(function (error) {
            console.log("$scope.version error: ", error);
        });
    }

    $scope.showConfiguration = function () {
        $http({
            url: 'http://localhost:65157/getConfiguration',
            dataType: 'json',
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
            }
        }).then(function (response) {
            console.log("showConfiguration response: ", response.data);
            $scope.mqttBrokerUrl = response.data.mqttBroker;
            $scope.hostUrl = response.data.host;

            console.log("configuration response mqtt: ", $scope.mqttBrokerUrl);
            console.log("configuration response host: ", $scope.hostUrl);
        }).catch(function (error) {
            console.log("getConfiguration error: ", error);
        });
    }

    $scope.save = function () {
        console.log("save mqttBrokerUrl", $scope.mqttBrokerUrl);
        console.log("save hostUrl", $scope.hostUrl);
        if ($scope.mqttBrokerUrl != 'undefined' && $scope.hostUrl != 'undefined') {
            $http({
                url: 'http://localhost:65157/saveConfiguration',
                dataType: 'json',
                method: 'POST',
                data:{'mqttBroker':$scope.mqttBrokerUrl,'host':$scope.hostUrl},
                headers: {
                    "Content-Type": "application/json",
                }
            }).then(function (response) {
                console.log(response);
                //$scope.loader.loading = false;
                alert("Configuration saved successfully!");
            }).catch(function (error) {
                console.log(error);
                alert("Failed to save configuration, Please try again!");
                //$scope.loader.loading = false;
            });
        } else {
            alert("Please provide required input fields");
        }
    }

    $scope.startAggregator = function() {
        $http({
            url: 'http://localhost:65157/startAggregator',
            dataType: 'json',
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
            }
        }).then(function (response) {
            alert("Aggregator Started");
        }).catch(function (error) {
            alert("StartAggregator error: ", error);
        });
    }

    $scope.showVersion();
    $scope.showConfiguration();

    // var ws = $websocket.$new('ws://localhost:8080'); // instance of ngWebsocket, handled by $websocket service
    // $scope.data = 'Initializing Asset Tracking & Monitoring\nPlease Wait\n';
    // ws.$on('$open', function () {
    //     console.log('Websocket is open!');

    //     //ws.$emit('ping', 'hi listening websocket server'); // send a message to the websocket server
    // });
    // ws.$on('$message', function (data) {
    //     //console.log('The websocket server has sent the following data:');
    //     console.log(data);
    //     if (data.toLowerCase().indexOf("login") >= 0) {
    //         $scope.enableSubmitButton(true);
    //     }
    //     $scope.data = $scope.data + data + '\n';
    //     $scope.$apply();
    //     var elmnt = document.getElementById("logDiv");
    //     elmnt.scrollTop = elmnt.scrollHeight;
    //     //ws.$close();
    // });

    // ws.$on('$close', function () {
    //     console.log('Websocket Server Closed !');
    // });
});
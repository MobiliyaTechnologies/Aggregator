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
 * @summary: Main controller file
 *******************************************************************************/

var mainApp = angular.module("gatewayApp");
mainApp.controller('mainController', function ($scope, aadService, $http, $websocket, $rootScope,$state) {
    console.log("Main COntrollers");
   
    $scope.gatewayMac = "Loading.."
    $scope.version = "Loading..";
    $scope.loginAttempt = 0;
    $scope.disableGeolocation = false;
    $scope.loader = {
        loading: false
    };
    
    //document.getElementById("logDiv").readOnly = true;

    $scope.config = {
        restServer: '',
        'timeout': '8500',
        'b2cApplicationId': '',
        'tenantName': "",
        'signInPolicyName': ""
        //'signInSignUpPolicyName': ""
    }
    $scope.config.restServer = localStorage.getItem("restServer");
    var loginDisplayType = {
        PopUp: 'popup',
        None: 'none',
        Page: 'page'
    };
    var helloNetwork = {
        adB2CSignIn: 'adB2CSignIn',
        adB2CSignInSignUp: 'adB2CSignInSignUp',
        adB2CEditProfile: 'adB2CEditProfile'
    };

    function online(session) {

        var currentTime = (new Date()).getTime() / 1000;
        return session && session.access_token && session.expires > currentTime;
    };

    $scope.enableSubmitButton = function (isEnable) {
        if (isEnable) {
            document.getElementById("submitButton").style.backgroundColor = "#0e98f9"
            document.getElementById("submitButton").style.color = "#ffffff";
        } else {
            document.getElementById("submitButton").style.backgroundColor = "#f3f3f3"
            document.getElementById("submitButton").style.color = "#151515";
        }
    }

    $scope.submit = function (state) {
        console.log("Logging in ...");
        $scope.loginAttempt = $scope.loginAttempt + 1;
        $scope.loader.loading = true;
        $scope.enableSubmitButton(false);
        localStorage.setItem("restServer", $scope.config.restServer);
        $scope.saveAzureServerUrl($scope.config.restServer);
        localStorage.setItem("redirect_uri", 'http://localhost:65157/redirect.html');
        $scope.getLoginDetails(state);
    }
    $scope.reset = function () {
        aadService.policyLogout(helloNetwork.adB2CSignIn, null);
    }
   
    $rootScope.$on('enableLoginButton', function (event, data) {
        $scope.enableSubmitButton(true);
    });
    $rootScope.$on('disableLoginButton', function (event, data) {
        $scope.enableSubmitButton(false);
    });

    $scope.getLoginDetails = function (state) {

        url = $scope.config.restServer;
        console.log("url :: " + url);
        if (url == undefined || url == null || url == "") {
            alert("Please enter valid server url.");
            $scope.loader.loading = false;
            return;
        }

        console.log("RestServer URL ::", url);
        $http({
            url: url + 'api/GetB2cConfiguration',
            dataType: 'json',
            method: 'GET'
        }).then(function (response) {
            if (response)
                console.log("Login Details :: ", response);
            console.log("response.data.B2cClientId " + response.data.B2cClientId);
            console.log("response.data.B2cTenant " + response.data.B2cTenant);
            console.log("response.data.B2cSignUpInPolicyId " + response.data.B2cSignUpInPolicyId);
            localStorage.setItem("b2cApplicationId", response.data.B2cClientId);
            localStorage.setItem("tenantName", response.data.B2cTenant);
            localStorage.setItem("signInPolicyName", response.data.B2cSignUpInPolicyId);

            var script = document.createElement('script');
            script.setAttribute('type', 'text/javascript');
            script.setAttribute('src', './aadb2c.js');
            document.head.appendChild(script);
            $scope.getConfig(state);
            $scope.loginAttempt = 0;

        }).catch(function (error) {
            console.log("Login Failed *** ", $scope.loginAttempt);
            console.log("Login Details API Error :: ", error);
            if ($scope.loginAttempt === 1) {
                console.log("Second Attempt to Login...");
                $scope.submit('click');
            } else {
                console.log("Could not login, please try again !");
                alert("Could not login, please try again !");
                $scope.loader.loading = false;
                $scope.enableSubmitButton(true);
            }
        });
    }


    $scope.showContent = function () {
        $state.go('content');
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
        })
            .catch(function (error) {
                console.log("$scope.version error: ", error);
            });
    }

    
    $scope.getAzureServerUrl = function () {
        //console.log("$scope.gatewayMac", $scope.gatewayMac);
        $http({
            url: 'http://localhost:65157/getAzureServerUrl',
            dataType: 'json',
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
            }
        }).then(function (response) {
            console.log("showConfiguration response: ", response.data);
            $scope.config.restServer = response.data;
            console.log("$scope.AzureServerUrl: ", $scope.config.restServer);
        }).catch(function (error) {
            console.log("$scope.AzureServerUrl error: ", error);
        });
    }

    $scope.saveAzureServerUrl = function (AzureServerUrl) {
        if(AzureServerUrl == undefined || AzureServerUrl == '') {
            return;
        }
        console.log("save azureServerUrl", AzureServerUrl);
        $http({
            url: 'http://localhost:65157/saveAzureServerUrl',
            dataType: 'json',
            method: 'POST',
            data:{'AzureServerUrl':AzureServerUrl},
            headers: {
                "Content-Type": "application/json",
            }
        }).then(function (response) {
            console.log(response);
        }).catch(function (error) {
            console.log(error);
        });
    }

    $scope.aadLogin = function (state) {

        setTimeout(function () {
            console.log("State",state);
            console.log("$scope.config",$scope.config);
            aadService.signIn($scope.config, function (b2cSession) {
                if (!online(b2cSession) && state == 'click') {
                    console.log("b2c",b2cSession);
                    aadService.policyLogin(helloNetwork.adB2CSignIn, loginDisplayType.Page);
                    //alert("at aadService.policyLogin");
                }
                else if (online(b2cSession)) {
                    //getUserDetails();
                    console.log("Heree");
                    //$scope.getMacAddr();
                    $scope.showContent();
                }
            });
        }, 1000);
    }

    $scope.getConfig = function (state) {

        $scope.config.restServer = localStorage.getItem("restServer");
        $scope.config.b2cApplicationId = localStorage.getItem("b2cApplicationId");
        $scope.config.tenantName = localStorage.getItem("tenantName");
        $scope.config.signInPolicyName = localStorage.getItem("signInPolicyName");
        if ($scope.config.restServer) {
                $scope.aadLogin(state);
            //
        }

    }


    $scope.enableSubmitButton(false);
   // $scope.getConfig('intial');
    if( $scope.config.restServer){
        $scope.getLoginDetails('intial');
    }
    $scope.showVersion();
    $scope.getAzureServerUrl();


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

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
 * @summary: Main Controller file
 *******************************************************************************/

var mainApp = angular.module("gatewayApp", ['ui.router','ngWebsocket','ui.bootstrap']);
		  
    mainApp.config(function ($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/');

        $stateProvider
            .state('main', {
                url: '/',
                templateUrl: 'main.html',
                controller: 'mainController',
            })
            .state('content', {
                url: '/content',
                templateUrl: 'content.html',
                controller: 'contentController',
            })
            
    });
    mainApp.run(function ($websocket) {
    
    });
		  
        mainApp.factory('aadService', function ($http,$rootScope) {
        var responseType = 'token id_token';
        var redirectURI = './redirect.html';
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
        return {
            signIn: function (config,callback) {
				console.log("config",config)
                hello.init({
                    adB2CSignIn: config.b2cApplicationId,
                    adB2CSignInSignUp: config.b2cApplicationId,
                    adB2CEditProfile: config.b2cApplicationId
                }, {
                        redirect_uri: '/redirect.html',
                        scope: 'openid ' + config.b2cApplicationId,
                        response_type: 'token id_token'
                    });
                var b2cSession = hello(helloNetwork.adB2CSignIn).getAuthResponse();
				console.log("b2cSession",b2cSession)
                callback(b2cSession);
            },
            signUp: function (config,callback) {
                var applicationId = config.b2cApplicationId;
                hello.init({
                    adB2CSignIn: applicationId,
                    adB2CSignInSignUp: applicationId,
                    adB2CEditProfile: applicationId
                }, {
                        redirect_uri: '../redirect.html',
                        scope: 'openid ' + applicationId,
                        response_type: 'token id_token'
                    });
                this.policyLogin(helloNetwork.adB2CSignInSignUp, loginDisplayType.Page);
            },
            logout: function () {
                var applicationId =localStorage.getItem("b2cApplicationId");
                console.log("application",applicationId);
                hello.init({
                    adB2CSignIn: applicationId,
                    adB2CSignInSignUp: applicationId,
                    adB2CEditProfile: applicationId
                }, {
                        redirect_uri: '/redirect.html',
                        scope: 'openid ' + applicationId,
                        response_type: 'token id_token'
                    });
                    console.log("localstorage",localStorage.getItem("signInPolicyName"));
                this.policyLogout(helloNetwork.adB2CSignIn, localStorage.getItem("signInPolicyName"));
            },
            policyLogin: function (network, displayType) {
				console.log("network",network);
				console.log("displayType",displayType);
                if (!displayType) {
                    displayType = 'page';
                }
                var b2cSession = hello(network).getAuthResponse();
				
                //in case of silent renew, check if the session is still active otherwise ask the user to login again
                if (!this.online(b2cSession) && displayType === loginDisplayType.None) {
                    bootbox.alert('Session expired... please login again', function () {
                        this.policyLogin(network, loginDisplayType.Page);
                    });
		  				$scope.loader.loading = false;
                        $rootScope.$broadcast('enableLoginButton', '');
                    return;
                }
				
                hello(network).login({ display: displayType }, this.log).then(function (auth) {
					
                }, function (e) {
					console.log("b2cSession1",b2cSession);
                    if ('Iframe was blocked' in e.error.message) {
                        this.policyLogin(network, loginDisplayType.Page);
                        return;
                    }
                    bootbox.alert('Signin error: ' + e.error.message);
		 			$scope.loader.loading = false;
                    $rootScope.$broadcast('enableLoginButton', '');
                });
            },
            policyLogout: function (network, policy) {
                hello.logout(network, { force: true }).then(function (auth) {
                    console.log("auth :", auth);
                   $rootScope.$broadcast('deleteStoredFiles', '');
                }, function (e) {
                    console.log("Erorr :", e);
                    if(e.error.code == "invalid_session") {
                        console.log("invalid_session");
                        //alert("Failed to reset Gateway. invalid_session!");
                       // $rootScope.$broadcast('invalid_session', '');
                    } else {
                        alert("Failed to reset Gateway. Please try again!");
                    }
                });
            },
            online: function (session) {
                var currentTime = (new Date()).getTime() / 1000;
                return session && session.access_token && session.expires > currentTime;
            },
            log: function (s) {

                if (typeof s.error !== 'undefined' && s.error !== null) {
                    if (s.error.code === 'blocked') {   //silentrenew(display: none) in case of expired token returns X-frame Options as DENY error
                        bootbox.alert("<p class='bg-danger'>there was an error in silent renewing the token. Please login again</p>");
		 				$scope.loader.loading = false;
                        $rootScope.$broadcast('enableLoginButton', '');
                        return;
                    }
                }
                else
                    document.body.querySelector('.response')
                        .appendChild(document.createTextNode(JSON.stringify(s, true, 2)));
            }


        };
    });
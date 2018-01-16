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
 * @summary: Send log message to Websocket client 
 *******************************************************************************/

const WebSocket = require('ws');
var bus = require('./eventbus');

const wss = new WebSocket.Server({ port: 8080 });
console.log('Creating Websocket Server');

wss.on('connection', function connection(ws) {
	
  console.log('client connected');
  /*
  ws.on('message', function incoming(message) {
    //console.log('received: %s', message);
	
	// Broadcast to everyone else.
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
  */
  //ws.send('client connected');
});

console.log('Creating Event Bus Client');
var logMessage = function (message) {
//console.log('Log Message: ', message);
	if(wss != undefined) {
		// Broadcast to everyone else.
    wss.clients.forEach(function each(client) {
      if (client !== wss && client.readyState === WebSocket.OPEN) {
        //console.log('SEND Message: ', message);
        client.send(message);
      }
    });
	}
};

bus.on('log', logMessage);
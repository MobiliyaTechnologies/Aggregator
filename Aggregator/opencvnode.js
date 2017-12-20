const cv = require('opencv4nodejs');
var count=1;
/*
try
{
  const vCap = new cv.VideoCapture('rtsp://komal:AgreeYa@114.143.6.99:554/cam/realmonitor?channel=14&subtype=0');  
  var frameRate = vCap.get(1);
  // vCap.set(1, 25);
  
  console.log("FrameRate",frameRate);
  //vCap.set(1, 20);
  if(vCap!=null) 
  {
    console.log("Opened"+typeof(vCap)); 
  } // loop through the capture
  const delay = 10;
  let done = false;
  //vCap.set(0,1000);
  fps = vCap.get(5);
  frameCount = 0
  var div;
  while (true ) {
    //frameRate = vCap.get(0);
    console.log("FrameRate",frameRate);
    //if(frameRate % 25 === 0){
      let frame = vCap.read();
      if((frameCount)%fps===0)
      {      
        // loop back to start on end of stream reached
        // if (frame.empty) {
          
        //   vCap.reset();
        //   frame = vCap.read();
        // }
          //cv.imshow('Stream',frame);
          cv.imwrite(count+".jpg",frame);
          //cv.waitKey(10);
        // ...
      }
        frameCount++;
       count=count+1;
  //  }
    
  }
  // console.log(vCap.release());
}
catch(err)
{
  console.log("Error in opening stream",err);
}
*/

var app = require('express')();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var liveCamIntervalArray = [];


app.post('/goLive',function(req,res){

  const vCap = new cv.VideoCapture(req.body.url); //'rtsp://komal:AgreeYa@114.143.6.99:554/cam/realmonitor?channel=14&subtype=0'  
  var frameRate = vCap.get(1);
  // vCap.set(1, 25);
  fps = vCap.get(5);
  
  var count=0;
  //vCap.set(1, 20);
  if(vCap!=null) 
  {
    console.log("Opened"+typeof(vCap)); 
  } // loop through the capture
  vCap.set(2,24);
  // while (true ) {
  var camInterval = setInterval(function(){
    // console.log("FrameRate", vCap.get(1));
    // console.log("FreamE:::::::::::::::::::::::::", vCap.get(1) % fps);
    let frame = vCap.read();
    if (vCap.get(1) % fps == 0) {
      console.log("WRITTEN IMAGE ",new Date());
      cv.imwrite("/home/user/GitRepos/device-client/jetson-device-client/Aggregator/"+req.body.folder+"/" + new Date().getTime() + ".jpg", frame);
      // count++;
    }
  }, 1000/fps);

  liveCamIntervalArray.push({
    camId : req.body.camId,
    intervalObj : camInterval
  });

  res.send({result : "LiveStream started for : "+req.body.camId});
});

app.get('/cameras/stop',function(req,res){

  let result = [];
  let tempArr = liveCamIntervalArray.slice();
  console.log("Base live cam :: "+JSON.stringify(liveCamIntervalArray));
  let camId = req.query.camId;
  tempArr.forEach(function(cam, i){
    if(camId.includes(cam.camId)){
      clearInterval(cam.intervalObj);
      //to remove stopped live cam 
      liveCamIntervalArray.splice(i,i+1);
      result.push({camId : cam.camId, camStatus : 'Stopped'});
    }
  });
    // let result = [];
    // let camId = req.query.camId;
   
    // let tempArr = [];
    // liveCamIntervalArray.forEach(function(cam){
    //   if(camId.includes(cam.camId)){
    //     clearInterval(cam.intervalObj);
    //     //to remove stopped live cam 
    //     tempArr.push(cam);
    //     result.push({camId : cam.camId, camStatus : 'Stopped'});
    //   }
    // });
    // liveCamIntervalArray =  liveCamIntervalArray.diff(tempArr);
    res.status(200).send(result);
  });

app.get('/cameras/live',function(req,res){
  var result=[];
  liveCamIntervalArray.forEach(function(cam){
    result.push(cam.camId);
  });
  res.send(result);
});

app.listen(7000,function(){
  console.log("Started");
});
// try
// {
//   const vCap = new cv.VideoCapture('rtsp://komal:AgreeYa@114.143.6.99:554/cam/realmonitor?channel=14&subtype=0');  
//   var frameRate = vCap.get(1);
//   // vCap.set(1, 25);
//   fps = vCap.get(5);
  
//   var count=0;
//   //vCap.set(1, 20);
//   if(vCap!=null) 
//   {
//     console.log("Opened"+typeof(vCap)); 
//   } // loop through the capture
//   vCap.set(2,24);
//   // while (true ) {
//   setInterval(function () {
//     console.log("FrameRate", vCap.get(1));
//     console.log("FreamE:::::::::::::::::::::::::", vCap.get(1) % fps);
//     let frame = vCap.read();
//     if (vCap.get(1) % fps == 0) {
//       cv.imwrite("/home/user/GitRepos/device-client/jetson-device-client/Aggregator/"++"/" + new Date().getTime() + ".jpg", frame);
//       // count++;
//     }
//   }, 1);
//     // console.log("FrameRate",vCap.get(1));
//     // console.log("FreamE:::::::::::::::::::::::::",vCap.get(1)%25);
//     // let frame = vCap.read();
    
//     // if(vCap.get(1)%25==0)
//     //  {
//     //    cv.imwrite("/home/user/GitRepos/device-client/jetson-device-client/Aggregator/frames/"+count+".jpg",frame);
//     //   count++;
//     //  }
//   // }
// }
// catch(err)
// {
//   console.log("Error in opening stream",err);
// }
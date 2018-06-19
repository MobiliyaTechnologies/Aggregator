import cv2
import os
import time
import sys
import json
import requests
import datetime

def read_in():
    lines = sys.stdin.readlines()
    return json.loads(lines[0])

lines = read_in()
camId = lines[0]
streamingUrl = lines[1]
postUrl = lines[2]
#print lines
# 6:39PM - 7PM, 7PM - 9PM, 9PM - 11PM, 11PM-00AM, 00AM-2AM, 2AM-4AM 
countVideo = 1
cap = cv2.VideoCapture(streamingUrl)

fps = cap.get(5)
if fps == 0:
    fps = 20
width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)   
height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)  
fourcc = cv2.VideoWriter_fourcc(*'XVID')

while(True):
    time1=datetime.datetime.now()
    timestamp = str(time1.strftime('%Y%m%d%H%M%S'))

    fileName = str(camId) + "_" + str(timestamp) + '.avi'
    FILE_OUTPUT = "./" + fileName
    if os.path.isfile(FILE_OUTPUT):
        os.remove(FILE_OUTPUT)
    out = cv2.VideoWriter(FILE_OUTPUT, fourcc, fps, (int(width), int(height)))

    duration = 2
    start = time.time()
    startTime=time.localtime(start)
    nextHour = startTime.tm_hour + 1
    if nextHour == 24:
        duration = 1
    t_end = start + duration * 60 *60

    #Date
    date = str(startTime.tm_year) + '-' + str(startTime.tm_mon) + '-' + str(startTime.tm_mday)

    #duration Start
    durationStart = str(startTime.tm_hour) + ":" + str(startTime.tm_min)
    #duration End
    if countVideo == 1 :
            durationEnd = str(nextHour-1) + ":59"
    elif nextHour == 24 :
            durationEnd = "00:00"
    else:
        durationEnd = str(time.localtime(t_end).tm_hour) + ":" + str(time.localtime(t_end).tm_min)
    totalDuration = durationStart +" - " + durationEnd

    #create json to send
    videoData = {
        "camId" : camId ,
        "date" : date ,
        "timeInterval" : totalDuration ,
        "filePath" : FILE_OUTPUT,
        "fileName" : fileName
    }
    #send all data
    r = requests.post(postUrl,data=videoData)
    
    while time.time() < t_end :
        if countVideo == 1:
            if time.localtime(time.time()).tm_hour == nextHour:
                break
        ret, frame = cap.read()
        if ret == True:
            out.write(frame)
        else:
            break
        
    countVideo = countVideo + 1
    #out.release()

cap.release()

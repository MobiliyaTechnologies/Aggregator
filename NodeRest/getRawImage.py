import sys, json
import cv2
import threading
import datetime
import os
import requests

'''
with open("/media/ubuntu/5dba3336-3902-4e14-97db-88ce1da50ce4/dummy/jetson-device-client/jetson-inference/build/aarch64/bin/feature-config") as f:
    for line in f:
        split = line.split(" ")
        print split[1]
        #print line
'''

f = open('/media/ubuntu/5dba3336-3902-4e14-97db-88ce1da50ce4/dummy/jetson-device-client/jetson-inference/build/aarch64/bin/feature-config', "r")

## use readlines to read all lines in the file
## The variable "lines" is a list containing all lines
lines = f.readlines()

featureLine = lines[0]
feature = featureLine.split(" ")
feature = feature[1]
print feature



cam = lines[1]
cam = cam.split(" ")
cam_number = cam[1]
print cam_number
## close the file after reading the lines.
f.close()



cam_url="rtsp://user:AgreeYa@114.143.6.99:554/cam/realmonitor?channel="+cam_number+"&subtype=0"
cam =cv2.VideoCapture(cam_url)
ret,img = cam.read();
#File Name Format
filename = feature+"_"+cam_number+".jpg"
gray = cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
cv2.imshow("GrayScaled",gray)
cv2.imwrite(os.path.join("." ,filename), img)
print "Saved"

#server url
url = ""
files = {'media': open(filename, 'rb')}
requests.post(url, files=filename)
print "image sent"
cv2.waitKey(500)
#streaming_data(cam_number,detection_type)

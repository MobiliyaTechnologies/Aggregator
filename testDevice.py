import cv2

file = open("/home/ubuntu/jetson-device-client/NodeRest/Device_Information_temp", "r") 
for i, line in enumerate(file):
    if i == 3:
	url=line 

cam =cv2.VideoCapture(str(url))
if cam.isOpened():
	print "0"
else:
	print "1"


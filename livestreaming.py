import sys, json
import cv2
import threading
import datetime
import os
import time

#Read data from stdin
def read_in():
    lines = sys.stdin.readlines()
    # Since our input would only be having one line, parse our JSON data from that
    return json.loads(lines[0])

def main():
	#get our data as an array from read_in()
	lines = read_in()
	#print (lines)
	#print (type(lines))
	argument_list=[]
	for item in lines:
		argument_list.append(item)

	detection_id = str(argument_list[0])
	camera_id = str(argument_list[1])
	cam_url=str(argument_list[2])
	print (argument_list[3])
	print(detection_id,camera_id)

	pid=str(os.getpid())
	
	with open(argument_list[3], "a") as fd:
		fd.write("\n"+camera_id+" "+pid)

	if detection_id=="0":
		detection_type="humanDetection"
	elif detection_id=="1":
		detection_type="vehicleDetection"
	print ("Detection Type_______________________________________________________________________________________",detection_type)

	print "URL to stream::",cam_url
	try:
		while(True):
			cam=cv2.VideoCapture(cam_url)
			if cam.isOpened():
				ret,imgtemp=cam.read()
	
				time1=datetime.datetime.now()
				timestamp = time1.strftime('%Y%m%d%H%M%S')
				filename = str(camera_id)+"_"+detection_type+"_"+timestamp+".jpg"

				file_path = argument_list[4]+str(camera_id)
				#print "FILEPATH:::",file_path
				if imgtemp is not None:
					cv2.imwrite(os.path.join(file_path ,filename), imgtemp)
					time.sleep(2)
			else :
				print "IN Livestream :: ERROR"
				
	except KeyboardInterrupt:
		os.system("ps -ef |grep livestreaming.py | awk '{print $2}'| xargs kill -9")

# # Start process
if __name__ == '__main__':
    main()


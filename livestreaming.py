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

	camera_list=[]
	for item in lines:
		#print (item)		
		camera_list.append(int(item))
			
	for c in camera_list:
		if camera_list.index(c)==0:
			detection_id=int(c)			
		else:
			camera_id=int(c)

	pid=str(os.getpid())

	#change-check if already exists
	with open("./stopProcessing", "a") as fd:
		fd.write("\n"+str(camera_id)+" "+pid)

	if detection_id==0:
		detection_type="humanDetection"
	elif detection_id==1:
		detection_type="vehicleDetection"
	#print ("Detection Type_______________________________________________________________________________________",detection_type)
	with open('/home/ubuntu/surveillance/jetson-dl/jetson-device-client/NodeRest/Device_Information') as f:
	    content = f.readlines()
	#print content
	content = [x.strip() for x in content] 
	# you may also want to remove whitespace characters like `\n` at the end of each line
	d={}
	for x in content:
	    if len(x) is not 0:
    		key,value=x.split(" ")
    	
    		d.update({int(key): value})  
	#if camera_id in d.keys():
	#	print d[camera_id]

	cam_url=d[camera_id]
	print "URL to stream::",cam_url
	try:
		while(True):
			cam=cv2.VideoCapture(cam_url)
			if cam.isOpened():
				ret,imgtemp=cam.read();
	
				time1=datetime.datetime.now()
				timestamp = time1.strftime('%Y%m%d%H%M%S')
				filename = str(camera_id)+"_"+detection_type+"_"+timestamp+".jpg"

				file_path = '/home/ubuntu/surveillance/jetson-dl/jetson-inference/build/aarch64/bin/Cameras/'+'Cam'+str(camera_id)
				if imgtemp is not None:
					cv2.imwrite(os.path.join(file_path ,filename), imgtemp)
					time.sleep(2)
			else:
				print "		DVR ERROR!!! "
				url = "http://52.177.169.81:5005/api/errorHandling"
				requests.post(url, {'DVRError':'DVR not responding!!'})
				
	except KeyboardInterrupt:
		os.system("ps -ef |grep livestreaming.py | awk '{print $2}'| xargs kill -9")

# Start process
if __name__ == '__main__':
    main()


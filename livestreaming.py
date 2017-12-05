import sys, json
import cv2
import threading
import datetime
import os
import time
import requests

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
	count_frames = 1
	try:
		cam=cv2.VideoCapture(cam_url)
		#cam.set(cv2.cv.CV_CAP_PROP_FPS, 5)
		while(True):
			#cam=cv2.VideoCapture(cam_url)
			if cam.isOpened():
				ret,imgtemp=cam.read()
				
				#time1=datetime.datetime.now()
				#timestamp = time1.strftime('%Y%m%d%H%M%S')
				timestamp =  int(round(time.time() * 1000))

				filename = str(camera_id)+"_"+detection_type+"_"+str(timestamp)+".jpg"

				file_path = argument_list[4]+str(camera_id)
				#print "FILEPATH:::",file_path
				if imgtemp is not None:
					if(count_frames%12==0):
						cv2.imwrite(os.path.join(file_path ,filename), imgtemp,[int(cv2.IMWRITE_JPEG_QUALITY), 50])
						#print "*****************IMWRITE FILENAME:::**************",filename
						imgname=os.path.join(file_path ,filename)
						#print imgname
						#time.sleep(0.2)
						try:
							url = "http://52.177.169.81:5005/api/getImage"
							#print "IMAGE LOCATION:"
							files = {'file': open(imgname, 'rb')}
							requests.post(url, files=files)
						
							#cv2.waitKey(100)
						except requests.exceptions.Timeout:
						    		print "**SERVER ERROR:: Timeout in sending Image"
						except requests.exceptions.TooManyRedirects:
						    		print "**SERVER ERROR:: Too many Redirects..!!"
						except requests.exceptions.RequestException as e:
						    		print e
					#time.sleep(0.6)
				count_frames=count_frames+1
			else :
				print "IN Livestream :: ERROR"
				
	except KeyboardInterrupt:
		os.system("ps -ef |grep livestreaming.py | awk '{print $2}'| xargs kill -9")

# # Start process
if __name__ == '__main__':
    main()
